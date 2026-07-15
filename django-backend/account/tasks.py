from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
import logging
import requests as http_requests

logger = logging.getLogger(__name__)

DISPATCH_COOLDOWN_SECONDS = 120


@shared_task(bind=True, max_retries=3)
def send_email_reminder(self, recipient_email, subject, message):
    try:
        send_mail(
            subject,
            message,
            settings.EMAIL_HOST_USER,
            [recipient_email],
            fail_silently=False,
        )
        logger.info(f"Email sent successfully to {recipient_email}")
        return f"Email sent to {recipient_email}"
    except Exception as exc:
        logger.error(f"Failed to send email to {recipient_email}: {exc}")
        raise self.retry(exc=exc, countdown=60)


def _build_reminder_content(reminder):
    highlighted_text = reminder.get_highlighted_text()
    note_url = f"{settings.WEBSITE_URL}{reminder.get_note_url()}"
    title = reminder.description or 'Note Reminder'
    text_preview = highlighted_text[:200] + ('...' if len(highlighted_text) > 200 else '')
    return title, text_preview, note_url


@shared_task(bind=True, max_retries=3)
def send_reminder_email(self, reminder_id):
    from note.models import Reminder

    try:
        reminder = Reminder.objects.select_related('note', 'user').get(
            id=reminder_id, is_active=True,
        )
    except Reminder.DoesNotExist:
        logger.error(f"Reminder {reminder_id} not found or inactive")
        return f"Reminder {reminder_id} not found"

    try:
        title, text_preview, note_url = _build_reminder_content(reminder)

        message = (
            f"Hello {reminder.user.username},\n\n"
            f"This is your reminder:\n\n"
            f"{reminder.description}\n\n"
            f"Note excerpt:\n"
            f"{text_preview}\n\n"
            f"View full note: {note_url}\n\n"
            f"---\n"
            f"This is an automated reminder from your Notes app."
        )

        send_mail(
            f"Reminder: {title}",
            message,
            settings.EMAIL_HOST_USER,
            [reminder.user.email],
            fail_silently=False,
        )

        reminder.advance_schedule()
        logger.info(f"Reminder {reminder_id} sent to {reminder.user.email}")
        return f"Reminder sent to {reminder.user.email}"
    except Exception as exc:
        logger.error(f"Failed to send reminder {reminder_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True, max_retries=3)
def send_reminder_telegram(self, reminder_id):
    from note.models import Reminder, TelegramReminderMessage

    try:
        reminder = Reminder.objects.select_related('note', 'user__profile').get(
            id=reminder_id, is_active=True,
        )
    except Reminder.DoesNotExist:
        logger.error(f"Reminder {reminder_id} not found or inactive")
        return f"Reminder {reminder_id} not found"

    profile = reminder.user.profile
    token = profile.telegram_bot_token
    chat_id = profile.telegram_chat_id

    if not token or not chat_id:
        logger.error(f"Telegram not configured for user {reminder.user.id}")
        return

    try:
        title, text_preview, note_url = _build_reminder_content(reminder)

        message_text = (
            f"*{title}*\n\n"
            f"{text_preview}\n\n"
            f"[View Note]({note_url})"
        )

        keyboard = {
            'inline_keyboard': [
                [
                    {'text': '\u23f0 15m', 'callback_data': f'snooze_15_{reminder.id}'},
                    {'text': '\u23f0 1h', 'callback_data': f'snooze_60_{reminder.id}'},
                    {'text': '\u23f0 4h', 'callback_data': f'snooze_240_{reminder.id}'},
                    {'text': '\u23f0 Tomorrow', 'callback_data': f'snooze_1440_{reminder.id}'},
                ],
                [
                    {'text': '\u2705 Dismiss', 'callback_data': f'dismiss_{reminder.id}'},
                ],
            ]
        }

        resp = http_requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={
                'chat_id': chat_id,
                'text': message_text,
                'parse_mode': 'Markdown',
                'reply_markup': keyboard,
            },
            timeout=10,
        )

        resp_data = resp.json()
        if not resp_data.get('ok'):
            raise RuntimeError(f"Telegram API error: {resp.text}")

        TelegramReminderMessage.objects.create(
            reminder=reminder, message_id=resp_data['result']['message_id'],
        )

        reminder.advance_schedule()
        logger.info(f"Telegram reminder {reminder_id} sent to chat {chat_id}")
        return f"Telegram reminder sent to {chat_id}"
    except Exception as exc:
        logger.error(f"Failed to send Telegram reminder {reminder_id}: {exc}")
        raise self.retry(exc=exc, countdown=60)


@shared_task
def check_and_send_reminders():
    from note.models import Reminder
    from django.utils import timezone
    from django.db.models import Q

    if settings.DEBUG:
        logger.info("Skipping reminders in DEBUG mode")
        return "Skipped in DEBUG mode"

    now = timezone.now()
    cooldown_threshold = now - timezone.timedelta(seconds=DISPATCH_COOLDOWN_SECONDS)

    not_recently_dispatched = (
        Q(last_dispatched__isnull=True) | Q(last_dispatched__lt=cooldown_threshold)
    )

    snoozed_due = Q(snoozed_until__isnull=False, snoozed_until__lte=now)

    normal_due = (
        Q(snoozed_until__isnull=True)
        & Q(scheduled_time__lte=now)
    )

    due_reminders = (
        Reminder.objects
        .select_related('user__profile')
        .filter(is_active=True)
        .filter(not_recently_dispatched)
        .filter(snoozed_due | normal_due)
    )

    reminder_ids = list(due_reminders.values_list('id', flat=True))
    if not reminder_ids:
        return "No reminders due"

    claimed = Reminder.objects.filter(id__in=reminder_ids).update(last_dispatched=now)
    if not claimed:
        return "No reminders claimed"

    reminders = (
        Reminder.objects
        .select_related('user__profile')
        .filter(id__in=reminder_ids)
    )

    count = 0
    for reminder in reminders:
        try:
            profile = reminder.user.profile
            if (
                profile.notification_channel == 'telegram'
                and profile.telegram_bot_token
                and profile.telegram_chat_id
            ):
                send_reminder_telegram.delay(reminder.id)
            else:
                send_reminder_email.delay(reminder.id)
        except reminder.user._meta.model.profile.RelatedObjectDoesNotExist:
            send_reminder_email.delay(reminder.id)
        except Exception:
            logger.exception(f"Unexpected error dispatching reminder {reminder.id}")
            send_reminder_email.delay(reminder.id)
        count += 1

    logger.info(f"Dispatched {count} reminders")
    return f"Dispatched {count} reminders"
