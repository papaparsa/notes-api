from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import LocalMessage, NoteEmbedding
from .file_utils import FileManager
import threading
import functools
import traceback
from django.conf import settings

def async_task(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        thread = threading.Thread(target=func, args=args, kwargs=kwargs)
        thread.daemon = True  # Make thread daemon so it doesn't block program exit
        thread.start()
    return wrapper

@async_task
def create_or_update_embedding_async(note_id):
    """
    Asynchronously create or update embedding for a note
    """
    try:
        # Get a fresh instance of the note to avoid any thread-related issues
        note = LocalMessage.objects.get(id=note_id)
        
        # Check if note contains non-ASCII characters
        if NoteEmbedding.hasRTL(note.text):
            # If there's an existing embedding, delete it since the note now has non-ASCII
            NoteEmbedding.objects.filter(note_id=note.id).delete()
            return
        
        if settings.DEBUG:
            return

            
        # Create or update the embedding
        existing = NoteEmbedding.objects.filter(note_id=note.id).first()
        if existing:
            # If embedding exists, delete and recreate to update the vector
            existing.delete()
        
        NoteEmbedding.create_for_note(note)
            
    except Exception as e:
        
        print(f"Failed to process embedding for note {note_id}: {str(e)}")
        traceback.print_exc()

@async_task
def sync_note_files_async(note_id):
    """
    Asynchronously sync file associations for a note
    """
    try:
        note = LocalMessage.objects.get(id=note_id)
        file_manager = FileManager()
        associations_created = file_manager.sync_note_files(note)
        if associations_created > 0:
            print(f"Auto-synced {associations_created} file associations for note {note_id}")
    except Exception as e:
        print(f"Failed to sync files for note {note_id}: {str(e)}")
        traceback.print_exc()

@receiver(post_save, sender=LocalMessage)
def trigger_embedding_processing(sender, instance, created, **kwargs):
    """
    Signal to trigger asynchronous embedding creation/update for notes
    """
    create_or_update_embedding_async(instance.id)

@receiver(post_save, sender=LocalMessage)
def trigger_file_sync(sender, instance, created, **kwargs):
    """
    Signal to trigger asynchronous file association sync for notes
    """
    sync_note_files_async(instance.id)