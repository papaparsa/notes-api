from django.urls import path, re_path

from .views.file_view import FileUploadView, serve_minio_file, NoteFilesView, FileDetailView, FileListView, UnusedDrawingsDeleteView
from .views.list_view import NoteListView, DeleteMessageListView
from .views.search_view import SearchResultsView
from .views.note_view import NoteView, SingleNoteView, MoveMessageView, IncreaseImportanceView, DecreaseImportanceView, ArchiveMessageView, UnArchiveMessageView, NoteRevisionView, ImportantNotesView, NotePageView
from .views.public_note_view import PublicNoteView
from .views.stats_view import RevisionStatsView, NoteStatsView, FileAccessStatsView
from .views.similar_note_view import SimilarNotesView
from .views.reminder_view import ReminderView, SingleReminderView
from .views.workspace_view import WorkspaceListView, WorkspaceDetailView, WorkspaceCategoriesView, DefaultWorkspaceView
from .views.collection_view import FileCollectionView, CollectionFilesView, UnifiedFeedView
from .views.hashtag_view import TrendingHashtagsView


urlpatterns = [
    # Hashtag endpoints
    path('hashtags/trending/', TrendingHashtagsView.as_view(), name='trending-hashtags'),

    # Workspace endpoints
    path('workspaces/', WorkspaceListView.as_view(), name='workspaces'),
    path('workspaces/default/', DefaultWorkspaceView.as_view(), name='default-workspace'),
    path('workspaces/<int:pk>/', WorkspaceDetailView.as_view(), name='workspace-detail'),
    path('workspaces/<int:pk>/categories/', WorkspaceCategoriesView.as_view(), name='workspace-categories'),
        
    # Reminder endpoints
    path('reminders/', ReminderView.as_view(), name='reminders'),
    path('reminders/<int:reminder_id>/', SingleReminderView.as_view(), name='reminder-detail'),
    
    # File Collection endpoints
    path('collections/', FileCollectionView.as_view(), name='collections'),
    path('collections/<int:collection_id>/', FileCollectionView.as_view(), name='collection-detail'),
    path('collections/<int:collection_id>/files/', CollectionFilesView.as_view(), name='collection-files'),
    
    # Unified feed endpoint
    path('feed/', UnifiedFeedView.as_view(), name='unified-feed'),
    
    path('upload/', FileUploadView.as_view(), name='file-upload'),
    path('all-files/', FileListView.as_view(), name='all-files'),
    path('message/<int:note_id>/files/', NoteFilesView.as_view(), name='note-files'),
    path('files/<int:file_id>/', FileDetailView.as_view(), name='file-detail'),
    path('drawings/unused/', UnusedDrawingsDeleteView.as_view(), name='unused-drawings-delete'),
    path('files/<path:file_path>', serve_minio_file, name='serve_minio_file'),
    path('list/<int:pk>/delete/', DeleteMessageListView.as_view(), name='delete-list'),
    path('list/<int:pk>/', NoteListView.as_view(), name='note-list-detail'),
    path('list/', NoteListView.as_view(), name='note-list'),
    path('search/', SearchResultsView.as_view()),
    
    # Important notes endpoints (must be before the slug catch-all)
    path('important/', ImportantNotesView.as_view(), name='important-notes'),
    path('important/<slug>/', ImportantNotesView.as_view(), name='important-notes-by-list'),
    
    # Message-specific endpoints
    re_path(r'message/(?P<note_id>\d+)/similar/?$', SimilarNotesView.as_view(), name='similar-notes'),
    path('message/<int:note_id>/page/', NotePageView.as_view(), name='note-page'),
    path('message/<int:note_id>/', SingleNoteView.as_view()),
    path('message/move/<int:note_id>/', MoveMessageView.as_view(), name='move-message'),
    path('message/increase_importance/<int:note_id>/', IncreaseImportanceView.as_view(), name='increase-importance'),
    path('message/decrease_importance/<int:note_id>/', DecreaseImportanceView.as_view(), name='decrease-importance'),
    path('message/archive/<int:note_id>/', ArchiveMessageView.as_view(), name='archive-message'),
    path('message/unarchive/<int:note_id>/', UnArchiveMessageView.as_view(), name='unarchive-message'),

    # Similar text search (POST endpoint)
    path('similar/', SimilarNotesView.as_view(), name='similar-text'),

    # Stats endpoints
    path('stats/revisions/', RevisionStatsView.as_view(), name='revision-stats'),
    path('stats/notes/', NoteStatsView.as_view(), name='note-stats'),
    path('stats/access/', FileAccessStatsView.as_view(), name='file-access'),

    # Revisions
    path('revisions/<int:note_id>/', NoteRevisionView.as_view(), name='note-revisions'),

    # Public notes
    path('pp/', PublicNoteView.as_view()),

    # Catch-all patterns (must be last)
    path('<slug>/', NoteView.as_view()),
    path('', NoteView.as_view()),
]
