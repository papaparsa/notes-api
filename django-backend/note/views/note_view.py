from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.generics import GenericAPIView
from rest_framework.mixins import ListModelMixin
from .pagination import DateBasedPagination
from ..models import LocalMessage, LocalMessageList, Link, NoteRevision, NoteEmbedding, Workspace
from ..serializers import MessageSerializer, MoveMessageSerializer, NoteRevisionSerializer
import re 
from django.utils import timezone
from typing import Optional
import concurrent.futures
import logging

from ..file_utils import FileManager

# Set up logging
logger = logging.getLogger(__name__)

# Thread pool executor for async tasks
executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)

# Function to create embeddings asynchronously
def create_embeddings_async(note_id, note_text=None):
    try:
        note = LocalMessage.objects.get(pk=note_id)
        if note_text is None:
            note_text = note.text
            
        # Create embedding for the note if it's not RTL
        if not NoteEmbedding.hasRTL(note_text):
            NoteEmbedding.create_for_note(note)
                    
        logger.info(f"Successfully created embeddings for note {note_id}")
    except Exception as e:
        logger.error(f"Error creating embeddings for note {note_id}: {str(e)}", exc_info=True)

class RevisionService:
    MIN_TIME_BETWEEN_REVISIONS = 900  # minimum seconds between revisions
    MAX_REVISIONS = 20  # maximum number of revisions to keep

    @classmethod
    def get_latest_revision(cls, note_id: int) -> Optional[NoteRevision]:
        return NoteRevision.objects.filter(
            note_id=note_id
        ).order_by('-created_at').first()

    @classmethod
    def get_second_latest_revision(cls, note_id: int) -> Optional[NoteRevision]:
        return NoteRevision.objects.filter(
            note_id=note_id
        ).order_by('-created_at')[1:2].first()

    @classmethod
    def get_revision_count(cls, note_id: int) -> int:
        return NoteRevision.objects.filter(note_id=note_id).count()

    @classmethod
    def manage_revision_limit(cls, note_id: int) -> None:
        """
        Manages the revision limit by removing the second oldest revision when the limit is reached
        and updating the diff of the third revision to be relative to the first revision.
        """
        while cls.get_revision_count(note_id) > cls.MAX_REVISIONS:
            # Get all revisions ordered from oldest to newest
            revisions = list(NoteRevision.objects.filter(
                note_id=note_id
            ).order_by('created_at'))
            
            # The first revision stays (index 0)
            # We'll delete the second revision (index 1)
            second_revision = revisions[1]
            third_revision = revisions[2]

            print(f"total number of revisions is {len(revisions) } Deleting revision {second_revision.id}")
            
            # Update the third revision's previous_revision to point to the first revision
            third_revision.previous_revision = revisions[0]
            
            # Recalculate the diff for the third revision against the first revision
            third_revision.diff_text = NoteRevision.create_diff(
                revisions[0].revision_text,
                third_revision.revision_text
            )
            
            # Save the updated third revision
            third_revision.save()
            
            # Delete the second revision
            second_revision.delete()

    @classmethod
    def _has_changes(cls, note_id: int, new_text: str) -> bool:
        """Check if there are actual changes compared to the latest revision"""
        latest_revision = cls.get_latest_revision(note_id)
        if not latest_revision:
            return bool(new_text.strip())  # True if new_text is not empty
        return latest_revision.revision_text != new_text

    @classmethod
    def _should_create_revision(cls, note_id: int, new_text: str) -> bool:
        latest_revision = cls.get_latest_revision(note_id)
        if not latest_revision:
            return True
        # First check if there are any actual changes
        if not cls._has_changes(note_id, new_text):
            return False
        time_since_last = timezone.now() - latest_revision.created_at
        return time_since_last.total_seconds() >= cls.MIN_TIME_BETWEEN_REVISIONS

    @classmethod
    def update_or_create_revision(cls, note_id: int, new_text: str) -> None:
        """Update existing revision or create new one based on time threshold and content changes"""
        # Don't create or update revision if there are no changes
        if not cls._has_changes(note_id, new_text):
            return

        if cls._should_create_revision(note_id, new_text):
            # Create new revision
            latest_revision = cls.get_latest_revision(note_id)
            base_text = latest_revision.revision_text if latest_revision else ""
            NoteRevision.objects.create(
                note_id=note_id,
                revision_text=new_text,
                previous_revision=latest_revision,
                diff_text=NoteRevision.create_diff(base_text, new_text)
            )
            
            # Check and manage revision limit after creating new revision
            cls.manage_revision_limit(note_id)
        else:
            # Update latest revision
            latest = cls.get_latest_revision(note_id)
            second_latest = cls.get_second_latest_revision(note_id)
            if second_latest:
                # Update diff against second latest revision
                latest.diff_text = NoteRevision.create_diff(second_latest.revision_text, new_text)
            else:
                # If no second latest, diff against empty string
                latest.diff_text = NoteRevision.create_diff("", new_text)
            latest.revision_text = new_text
            # Update timestamp
            latest.created_at = timezone.now()
            latest.save()

    @classmethod
    def update_note_with_revision(cls, note: LocalMessage, new_text: str) -> None:
        """Update note text and handle revision"""
        # Only update if there are actual changes
        if cls._has_changes(note.id, new_text):
            cls.update_or_create_revision(note.id, new_text)
            note.text = new_text
            note.save()


class SingleNoteView(APIView):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get(self, request, **kwargs):
        try:
            note = LocalMessage.objects.prefetch_related("source_links").get(
                pk=self.kwargs['note_id'],
                user=request.user
            )
            serialized = self.serializer_class(note)
            return Response(serialized.data, status.HTTP_200_OK)
        except LocalMessage.DoesNotExist:
            return Response({"error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

    def put(self, request, **kwargs):
        try:
            item = LocalMessage.objects.get(pk=kwargs['note_id'], user=request.user)
            previous_text = item.text or ""
            new_text = request.data.get("text")
            client_updated_at = request.data.get("updated_at")
            if not client_updated_at:
                return Response({"error": "Missing updated_at"}, status=status.HTTP_400_BAD_REQUEST)
            # Compare updated_at
            from django.utils.dateparse import parse_datetime
            client_dt = parse_datetime(client_updated_at)
            if not client_dt:
                return Response({"error": "Invalid updated_at"}, status=status.HTTP_400_BAD_REQUEST)
            # item.updated_at is aware, client_dt may be naive
            if item.updated_at and client_dt < item.updated_at:
                return Response(
                    {"error": "Note has been updated elsewhere", "updated_at": item.updated_at},
                    status=status.HTTP_409_CONFLICT
                )
            RevisionService.update_note_with_revision(item, new_text)
            insert_links(item)
            executor.submit(create_embeddings_async, item.id, new_text)
            item.refresh_from_db()

            file_manager = FileManager()
            previous_paths = set(file_manager.extract_file_paths(previous_text))
            current_paths = set(file_manager.extract_file_paths(item.text or ""))
            removed_paths = list(previous_paths - current_paths)
            deleted_files = file_manager.cleanup_orphaned_files_for_removed_paths(
                removed_paths,
                item.id,
                request.user,
            )

            serialized = self.serializer_class(item)
            payload = serialized.data
            payload["deleted_files"] = deleted_files
            return Response(payload, status=status.HTTP_200_OK)
        except LocalMessage.DoesNotExist:
            return Response({"error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, **kwargs):
        try:
            item = LocalMessage.objects.get(pk=kwargs['note_id'], user=request.user)
            
            # Initialize file manager and clean up unused files
            file_manager = FileManager()
            deleted_files = file_manager.delete_unused_files(item.text, item.id)
            print(f"deleted files are {deleted_files}")
            
            item.delete()
            
            # Return success response with info about deleted files
            return Response({
                "message": "Note deleted successfully",
                "deleted_files": deleted_files
            }, status=status.HTTP_200_OK)
            
        except LocalMessage.DoesNotExist:
            return Response({
                "error": "Note not found"
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class NoteRevisionView(APIView):
    """View for retrieving note revision history"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, note_id):
        """Get revision history for a note"""
        # Verify user owns the note
        try:
            LocalMessage.objects.get(id=note_id, user=request.user)
        except LocalMessage.DoesNotExist:
            return Response({"error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)
            
        revisions = NoteRevision.objects.filter(note_id=note_id).order_by('-created_at')
        if not revisions:
            return Response([], status=status.HTTP_200_OK)
        serializer = NoteRevisionSerializer(revisions, many=True)
        return Response(serializer.data)

class MoveMessageView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MoveMessageSerializer

    def post(self, request, **kwargs):
        try:
            message = LocalMessage.objects.get(pk=self.kwargs['note_id'], user=request.user)
            serializer = self.serializer_class(data=request.data)
            if serializer.is_valid():
                target_list = LocalMessageList.objects.get(
                    pk=serializer.data['list_id'],
                    user=request.user
                )
                message.list = target_list
                message.save()
                return Response("1", status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except (LocalMessage.DoesNotExist, LocalMessageList.DoesNotExist):
            return Response({"error": "Note or List not found"}, status=status.HTTP_404_NOT_FOUND)

class ArchiveMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, **kwargs):
        try:
            item = LocalMessage.objects.get(pk=kwargs['note_id'], user=request.user)
            item.archived = True
            item.save()
            return Response("1", status=status.HTTP_200_OK)
        except LocalMessage.DoesNotExist:
            return Response({"error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

class UnArchiveMessageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, **kwargs):
        try:
            item = LocalMessage.objects.get(pk=kwargs['note_id'], user=request.user)
            item.archived = False
            item.save()
            return Response("1", status=status.HTTP_200_OK)
        except LocalMessage.DoesNotExist:
            return Response({"error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

class IncreaseImportanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, **kwargs):
        try:
            item = LocalMessage.objects.get(pk=kwargs['note_id'], user=request.user)
            if item.importance < 4:
                item.importance += 1
            item.save()
            return Response("1", status=status.HTTP_200_OK)
        except LocalMessage.DoesNotExist:
            return Response({"error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

class DecreaseImportanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, **kwargs):
        try:
            item = LocalMessage.objects.get(pk=kwargs['note_id'], user=request.user)
            if item.importance > 0:
                item.importance -= 1
            item.save()
            return Response("1", status=status.HTTP_200_OK)
        except LocalMessage.DoesNotExist:
            return Response({"error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)
    
def insert_links(note: LocalMessage):
    """ extract links from text and insert them as links """
    print(f"inserting links for {note}")
    # delete all links for this note
    Link.objects.filter(source_message=note).delete()
    
    # find all markdown links with regex
    links = re.findall(r'\[.*?\]\((/message/\d+/?)\)', note.text)
    print(f"links are {links}")
    for link in links:
        print(f"link is {link}")
        link_id = re.findall(r'\d+', link)[0]
        print(f"link_id is {link_id}")
        dest_note = LocalMessage.objects.filter(id=link_id).first()
        if dest_note:
            print(f"dest_note is {dest_note}")
            Link.objects.create(source_message=note, dest_message=dest_note)

from django.shortcuts import get_object_or_404

def get_shown_list_ids(user, workspace=None):
    if workspace:
        return workspace.get_visible_categories().values_list('id', flat=True)
    else:
        # When no workspace is specified, use the default workspace
        try:
            default_workspace = Workspace.objects.get(user=user, is_default=True)
            return default_workspace.get_visible_categories().values_list('id', flat=True)
        except Workspace.DoesNotExist:
            # Fallback: show all categories if no default workspace exists
            return LocalMessageList.objects.filter(user=user).values_list('id', flat=True)

    

def get_list_by_slug(slug, user):
    if not slug:
        return LocalMessageList.objects.filter(user=user).first()
    return get_object_or_404(LocalMessageList, slug=slug, user=user)

def get_target_list_for_creation(slug, user, workspace):
    print(f"getting target list for creation with slug {slug}, user {user}, workspace {workspace}")
    if slug == "All":
        if workspace:
            if workspace.default_category:
                return workspace.default_category
            else:
                # fallback to first visible category
                visible = workspace.get_visible_categories()
                return visible.first() if visible.exists() else None
        else:
            # get default workspace
            try:
                default_workspace = Workspace.objects.get(user=user, is_default=True)
                if default_workspace.default_category:
                    return default_workspace.default_category
                else:
                    visible = default_workspace.get_visible_categories()
                    return visible.first() if visible.exists() else None
            except Workspace.DoesNotExist:
                return LocalMessageList.objects.filter(user=user).first()
    else:
        return get_list_by_slug(slug, user)

def filter_notes_by_slug(queryset, slug, user, workspace=None):
    if not slug or slug == "All":
        list_ids = get_shown_list_ids(user, workspace)
        return queryset.filter(list__in=list_ids)
    lst = get_list_by_slug(slug, user)
    if not lst:
        return LocalMessage.objects.none()
    # Allow viewing any category, regardless of workspace
    return queryset.filter(list=lst.id)

class NoteView(GenericAPIView, ListModelMixin):
    permission_classes = [IsAuthenticated]
    pagination_class = DateBasedPagination
    serializer_class = MessageSerializer

    def get_queryset(self):
        slug = self.kwargs.get('slug')
        workspace_slug = self.request.GET.get('workspace')
        workspace = None
        
        if workspace_slug:
            try:
                workspace = Workspace.objects.get(slug=workspace_slug, user=self.request.user)
            except Workspace.DoesNotExist:
                return LocalMessage.objects.none()
        
        base_queryset = LocalMessage.objects.filter(user=self.request.user).order_by('-created_at')
        show_hidden = self.request.GET.get('show_hidden', 'false').lower() == 'true'
        if not show_hidden:
            base_queryset = base_queryset.filter(archived=False)
        return filter_notes_by_slug(base_queryset, slug, self.request.user, workspace)

    def get(self, request, **kwargs):
        return self.list(request)

    def post(self, request, **kwargs):
        workspace_slug = request.data.get('workspace') or request.GET.get('workspace')
        workspace = None
        
        if workspace_slug:
            try:
                workspace = Workspace.objects.get(slug=workspace_slug, user=request.user)
            except Workspace.DoesNotExist:
                return Response({"error": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        
        serializer = self.serializer_class(data=request.data)
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            lst = get_target_list_for_creation(kwargs.get('slug'), request.user, workspace)
            if not lst:
                return Response(
                    {"error": "No lists found for user"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if the list is accessible in the workspace
            if workspace and lst not in workspace.get_visible_categories():
                return Response(
                    {"error": "List not accessible in this workspace"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            note = serializer.save(list=lst, user=request.user)
            RevisionService.update_or_create_revision(note.id, note.text)
            insert_links(note)
            executor.submit(create_embeddings_async, note.id, note.text)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error creating note: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to create note"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class NoteRevisionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request, note_id):
        revisions = NoteRevision.objects.filter(note_id=note_id).order_by('-created_at')
        if not revisions:
            return Response([], status=status.HTTP_200_OK)
        serializer = NoteRevisionSerializer(revisions, many=True)
        return Response(serializer.data)


class ImportantNotesView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = MessageSerializer

    def get(self, request, slug=None):
        workspace_slug = request.query_params.get('workspace')
        workspace = None
        
        if workspace_slug:
            try:
                workspace = Workspace.objects.get(slug=workspace_slug, user=request.user)
            except Workspace.DoesNotExist:
                return Response({"error": "Workspace not found"}, status=status.HTTP_404_NOT_FOUND)
        
        base_queryset = LocalMessage.objects.filter(
            user=request.user,
            importance__gt=0,
            archived=False
        ).order_by('-importance', '-created_at')

        if not slug or slug == "All":
            # For important notes, filter by workspace like regular notes
            list_ids = get_shown_list_ids(request.user, workspace)
            queryset = base_queryset.filter(list__in=list_ids)
        else:
            try:
                lst = LocalMessageList.objects.get(slug=slug, user=request.user)
                # For important notes, allow access to any category
                queryset = base_queryset.filter(list=lst)
            except LocalMessageList.DoesNotExist:
                return Response({"error": "List not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = self.serializer_class(queryset, many=True)
        return Response(serializer.data)


class NotePageView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, note_id):
        from django.conf import settings
        try:
            target_note = LocalMessage.objects.get(pk=note_id, user=request.user)
        except LocalMessage.DoesNotExist:
            return Response({"error": "Note not found"}, status=status.HTTP_404_NOT_FOUND)

        slug = request.query_params.get('slug')
        show_hidden = request.query_params.get('show_hidden', 'true').lower() == 'true'
        workspace_slug = request.query_params.get('workspace')
        workspace = None
        if workspace_slug:
            try:
                workspace = Workspace.objects.get(slug=workspace_slug, user=request.user)
            except Workspace.DoesNotExist:
                pass
        base_queryset = LocalMessage.objects.filter(user=request.user).order_by('-created_at')
        if not show_hidden:
            base_queryset = base_queryset.filter(archived=False)
        queryset = filter_notes_by_slug(base_queryset, slug, request.user, workspace)

        count_before = queryset.filter(created_at__gt=target_note.created_at).count()
        page_size = settings.NOTES_PAGE_SIZE
        page = (count_before // page_size) + 1

        return Response({
            "page": page,
            "note_id": note_id,
            "position_in_page": count_before % page_size
        })


