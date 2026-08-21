from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import User

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.authentication import BasicAuthentication
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema
from django.utils.translation import gettext_lazy as _

from . import serializers



    
from django.contrib.auth import authenticate, login
from django.http import JsonResponse
from django.contrib.auth import logout
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from django.db import transaction



from django.contrib.auth.decorators import login_required

from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import UserSession, EmailConfirmationToken, UserProfile
from .tasks import send_email_reminder

from django.contrib.sessions.models import Session


from django.middleware.csrf import get_token

@api_view(['GET'])
@permission_classes([AllowAny])
def serve_csrf_cookie(request):
    response = JsonResponse({'details': 'CSRF cookie set'})
    response["X-CSRFToken"] = get_token(request)
    return response



def send_login_notification(user, device_name, ip_address):
    subject = "New Login Notification"
    message = (
        f"Hello {user.username},\n\n"
        f"A new login to your account was detected:\n"
        f"Device: {device_name}\n"
        f"IP Address: {ip_address}\n\n"
        f"If this was not you, please take immediate action to secure your account."
    )
    recipient_email = user.email

    # Use Celery task instead of direct send_mail
    send_email_reminder.delay(recipient_email, subject, message)


@api_view(['POST'])
@authentication_classes([BasicAuthentication])
@permission_classes([AllowAny])
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    user = authenticate(request, username=username, password=password)

    if user is not None:
        login(request, user)

        user_agent = request.META.get('HTTP_USER_AGENT', '')
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        ip_address = x_forwarded_for.split(',')[0] if x_forwarded_for else request.META.get('REMOTE_ADDR')

        device_name = request.data.get('device_name', 'Unknown Device')

        related_session_key = request.session.session_key

        if related_session_key:
            UserSession.objects.get_or_create(
                user=user,
                session_id=related_session_key,
                device_name=device_name,
                user_agent=user_agent,
                ip_address=ip_address,
                last_activity=timezone.now(),
            )

        if not settings.DEBUG:
            send_login_notification(user, device_name, ip_address)

        return JsonResponse({'message': 'Login successful'})

    else:
        return JsonResponse({'error': 'Invalid credentials'}, status=400)



def send_confirmation_email(user, token):
    confirmation_url = f"{settings.WEBSITE_URL}/confirm-email/{token}"
    subject = "Confirm Your Email Address"
    message = (
        f"Hello {user.username},\n\n"
        f"Thank you for signing up! Please confirm your email address by clicking the link below:\n\n"
        f"{confirmation_url}\n\n"
        f"This link will expire in 24 hours.\n\n"
        f"If you did not create this account, please ignore this email."
    )
    
    # Use Celery task
    send_email_reminder.delay(user.email, subject, message)


@api_view(['POST'])
@permission_classes([AllowAny])
def signup_view(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')

    if not username or not email or not password:
        return JsonResponse({'error': 'All fields are required'}, status=400)

    if User.objects.filter(username=username).exists():
        return JsonResponse({'error': 'Username already exists'}, status=400)

    if User.objects.filter(email=email).exists():
        return JsonResponse({'error': 'Email already exists'}, status=400)

    try:
        with transaction.atomic():
            # Create user as inactive
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                is_active=False  # User inactive until email confirmation
            )
            
            # Create confirmation token
            confirmation_token = EmailConfirmationToken.objects.create(user=user)
            
            # Send confirmation email
            if settings.DEBUG:
                # In debug mode, return token in response for testing
                return JsonResponse({
                    'message': 'Signup successful. Please check your email to confirm your account.',
                    'debug_token': str(confirmation_token.token)
                })
            else:
                send_confirmation_email(user, confirmation_token.token)

        return JsonResponse({'message': 'Signup successful. Please check your email to confirm your account.'})
    except Exception as e:
        return JsonResponse({'error': f'Signup failed: {str(e)}'}, status=500)

@api_view(['GET'])
@permission_classes([AllowAny])
def confirm_email(request, token):
    try:
        confirmation = EmailConfirmationToken.objects.get(token=token)
        
        if not confirmation.is_valid():
            return JsonResponse({'error': 'Confirmation link has expired'}, status=400)
        
        user = confirmation.user
        
        with transaction.atomic():
            # Activate user
            user.is_active = True
            user.save()
            
            # Create default category
            from note.models import LocalMessageList
            LocalMessageList.objects.create(
                user=user,
                name='default'
            )
            
            # Delete confirmation token
            confirmation.delete()
        
        return JsonResponse({'message': 'Email confirmed successfully. You can now log in.'})
    
    except EmailConfirmationToken.DoesNotExist:
        return JsonResponse({'error': 'Invalid confirmation token'}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_user_sessions(request):
    sessions = UserSession.objects.filter(user=request.user).order_by('-last_activity')

    session_data = [
        {
            'session_key': session.session.session_key,
            'device_name': session.device_name,
            'user_agent': session.user_agent,
            'ip_address': session.ip_address,
            'created_at': session.created_at,
            'last_activity': session.last_activity,
        }
        for session in sessions
    ]
    return JsonResponse({'sessions': session_data}, safe=False)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_user_session(request, session_key):
    try:
        # also delete from db
        Session.objects.get(session_key=session_key).delete()
        
        return JsonResponse({'message': 'Session deleted successfully'})
    except UserSession.DoesNotExist:
        return JsonResponse({'error': 'Session not found'}, status=404)

from django.contrib.auth.decorators import login_required

@login_required
def check_auth(request):
    return JsonResponse({'authenticated': True})



class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        logout(request)
        return JsonResponse({'message': 'Logged out successfully'})



class Profile(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=serializers.UserSerializer)
    def get(self, request):
        """
            this API user profile data

            workflow:
                1. check if user is authenticated
                2. returns user profile data
        """
        user = User.objects.get(id=request.user.id)

        serializer = serializers.UserSerializer(
            user
        )
        return Response(
            serializer.data,
            status=status.HTTP_200_OK)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def notification_profile(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        return Response(serializers.UserProfileSerializer(profile).data)

    serializer = serializers.UserProfileSerializer(profile, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    old_token = profile.telegram_bot_token
    profile = serializer.save()
    new_token = profile.telegram_bot_token

    if new_token and new_token != old_token:
        import requests as http_requests
        print(f" the url is {settings.WEBSITE_URL}/api/telegram/webhook/")
        webhook_url = f"{settings.WEBSITE_URL}/api/telegram/webhook/"
        resp = http_requests.post(
            f"https://api.telegram.org/bot{new_token}/setWebhook",
            json={
                'url': webhook_url,
                'secret_token': str(profile.telegram_webhook_secret),
                'allowed_updates': ['callback_query'],
            },
            timeout=10,
        )
        resp_data = resp.json()
        if not resp.ok or not resp_data.get('ok'):
            return Response(
                {'error': 'Saved, but Telegram webhook registration failed. Check your bot token.', 'telegram_error': resp.text},
                status=status.HTTP_400_BAD_REQUEST,
            )

    return Response(serializers.UserProfileSerializer(profile).data)


# from rest_framework_simplejwt.views import TokenViewBase
# from .serializers import CustomObtainTokenSerializer


# class CustomTokenObtainPairView(TokenViewBase):
#     serializer_class = CustomObtainTokenSerializer


