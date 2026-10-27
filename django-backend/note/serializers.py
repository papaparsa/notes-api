from rest_framework import serializers

from .models import LocalMessage, LocalMessageList, Link, NoteRevision, Reminder, Workspace, File, FileCollection
import re

class FileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj):
        return f"/api/note/files/{obj.minio_path}"

    class Meta:
        model = File
        fields = ['id', 'name', 'original_name', 'size', 'content_type', 'uploaded_at', 'kind', 'url']

class FileCollectionSerializer(serializers.ModelSerializer):
    thumbnail_files = serializers.SerializerMethodField()
    file_count = serializers.SerializerMethodField()
    list_name = serializers.CharField(source='list.name', read_only=True)
    type = serializers.SerializerMethodField()

    def get_thumbnail_files(self, obj):
        files = obj.get_thumbnail_files(4)
        return FileSerializer(files, many=True).data

    def get_file_count(self, obj):
        return obj.get_file_count()

    def get_type(self, obj):
        return 'collection'

    class Meta:
        model = FileCollection
        fields = ['id', 'name', 'description', 'list', 'list_name', 'importance', 'archived', 
                  'created_at', 'updated_at', 'thumbnail_files', 'file_count', 'type']
        read_only_fields = ['user']

class NoteShortViewSerializer(serializers.ModelSerializer):
    def truncate_text(self, value):
        max_length = 40  # Replace this with your desired length
        if len(value) > max_length:
            return value[:max_length] + '...'  # Truncate and add ellipsis
        return value

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['text'] = self.truncate_text(representation['text'])
        return representation
    class Meta:
        model = LocalMessage
        fields = ['text','id']

class LinkSerializer(serializers.ModelSerializer):
    source_message =  NoteShortViewSerializer(many=False, read_only=True)

    
    class Meta:
        model = Link
        fields = '__all__'



class MessageSerializer(serializers.ModelSerializer):
    source_links = LinkSerializer(many=True, read_only=True)
    dest_links = LinkSerializer(many=True, read_only=True)

    class Meta:
        model = LocalMessage
        fields = "__all__"
        read_only_fields = ['user']




class SearchSerializer(serializers.Serializer):
    q = serializers.CharField(required=True, help_text="Search query string")
    list_slug = serializers.CharField(
        required=False, 
        help_text="Single list slug or comma-separated list of slugs (e.g., 'list1,list2,list3')"
    )
    workspace = serializers.CharField(
        required=False,
        help_text="Workspace slug to filter search results"
    )
    has_files = serializers.BooleanField(required=False, help_text="Only return messages that contain files")
    page = serializers.IntegerField(required=False, help_text="Page number for pagination")

    def validate_list_slug(self, value):
        if not value:
            return value
            
        if value.lower() == 'all':
            return value
            
        # Validate that all provided slugs exist
        slug_list = [slug.strip() for slug in value.split(',')]
        existing_slugs = LocalMessageList.objects.filter(
            slug__in=slug_list
        ).values_list('slug', flat=True)
        
        invalid_slugs = set(slug_list) - set(existing_slugs)
        if invalid_slugs:
            raise serializers.ValidationError(
                f"Invalid list slugs: {', '.join(invalid_slugs)}"
            )
            
        return value

class MoveMessageSerializer(serializers.Serializer):
    list_id = serializers.IntegerField()


class NoteListSerializer(serializers.ModelSerializer):
    workspaces = serializers.SerializerMethodField()
    is_archived_in_default = serializers.SerializerMethodField()

    def get_workspaces(self, obj):
        # Return simple workspace data to avoid circular reference
        return [{
            'id': workspace.id,
            'name': workspace.name,
            'slug': workspace.slug,
            'is_default': workspace.is_default
        } for workspace in obj.workspaces.all()]

    def get_is_archived_in_default(self, obj):
        """Check if category is archived in the default workspace (not in any workspace)"""
        return not obj.workspaces.exists()

    class Meta:
        model = LocalMessageList
        fields = '__all__'
        read_only_fields = ['slug', 'user']


class WorkspaceSerializer(serializers.ModelSerializer):
    categories = serializers.SerializerMethodField()
    default_category_name = serializers.SerializerMethodField()

    def get_categories(self, obj):
        # Return simple category data to avoid circular reference
        return [{
            'id': category.id,
            'name': category.name,
            'slug': category.slug
        } for category in obj.categories.all()]

    def get_default_category_name(self, obj):
        return obj.default_category.name if obj.default_category else None

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'slug', 'description', 'user', 'default_category', 'default_category_name', 'is_default', 'categories', 'created_at', 'updated_at']
        read_only_fields = ['slug', 'user', 'created_at', 'updated_at']


class NoteRevisionSerializer(serializers.ModelSerializer):
    changed_text = serializers.SerializerMethodField()
    
    def get_changed_text(self, obj):
        """
        Extract only the changed portions of the text based on diff.
        Returns a dict with 'before' and 'after' sections around the changes.
        """
        if not obj.diff_text:
            return None
            
        # Parse the diff to find changed sections
        changes = []
        current_change = []
        context_lines = 3  # Number of unchanged lines to show before and after changes
        
        diff_lines = obj.diff_text.splitlines()
        for i, line in enumerate(diff_lines):
            if line.startswith('+ ') or line.startswith('- '):
                # Include previous context lines if this is a new change section
                if not current_change:
                    start_idx = max(0, i - context_lines)
                    current_change.extend(diff_lines[start_idx:i])
                current_change.append(line)
            elif line.startswith('  '):
                if current_change:
                    # Add some context lines after the change
                    current_change.append(line)
                    if len(current_change) > context_lines:
                        changes.append('\n'.join(current_change))
                        current_change = []
        
        # Add any remaining changes
        if current_change:
            changes.append('\n'.join(current_change))
        
        return changes

    class Meta:
        model = NoteRevision
        fields = ['id', 'created_at', 'changed_text', "revision_text"]


class SimilarNoteSerializer(serializers.Serializer):
    """Serializer for similar notes results"""
    id = serializers.IntegerField()
    text = serializers.CharField()
    similarity_score = serializers.FloatField()
    distance = serializers.FloatField()
    is_full_note = serializers.BooleanField(default=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()
    category = serializers.DictField()

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        
        # similarity_score is already calculated in the view, no need to convert
        
        # Truncate text if needed (adjustable length)
        max_length = 200  # Adjust this value as needed
        if len(representation['text']) > max_length:
            representation['text'] = representation['text'][:max_length] + '...'
        
        return representation

class ReminderSerializer(serializers.ModelSerializer):
    note_text = serializers.SerializerMethodField()
    highlighted_text = serializers.SerializerMethodField()
    note_url = serializers.SerializerMethodField()
    
    def get_note_text(self, obj):
        return obj.note.text[:100] + '...' if len(obj.note.text) > 100 else obj.note.text
    
    def get_highlighted_text(self, obj):
        return obj.get_highlighted_text()
    
    def get_note_url(self, obj):
        return obj.get_note_url()
    
    class Meta:
        model = Reminder
        fields = [
            'id', 'note', 'description', 'highlight_start', 'highlight_end',
            'scheduled_time', 'frequency', 'is_active', 'snoozed_until', 'last_sent',
            'created_at', 'updated_at', 'note_text', 'highlighted_text', 'note_url'
        ]
        read_only_fields = ['snoozed_until', 'last_sent', 'last_dispatched', 'created_at', 'updated_at']


