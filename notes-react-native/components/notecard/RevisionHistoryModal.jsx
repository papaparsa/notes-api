import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchJSON } from '../../lib/api';
import { handleApiError } from '../../lib/errorHandler';
import { fonts } from '../../styles/theme';
import { AppModal, Button, Tabs, T } from '../ui';

function RevisionEntry({ revision, index, total }) {
  const { colors } = useTheme();
  const [tab, setTab] = useState('changes');
  const title = index === 0 ? 'Current Version' : index === total - 1 ? 'Original Text' : `Revision ${total - index}`;
  const mono = { fontFamily: fonts.mono, fontSize: 13, color: colors.text };
  return (
    <View style={{ marginBottom: 24, padding: 16, borderWidth: 1, borderColor: colors.border, borderRadius: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap' }}>
        <Text style={{ fontWeight: '600', color: colors.text }}>{title}</Text>
        <Text style={{ color: colors.muted }}>{new Date(revision.created_at).toLocaleString()}</Text>
      </View>
      <Tabs tabs={[{ key: 'changes', title: 'Changes' }, { key: 'full', title: 'Complete Text' }]} active={tab} onChange={setTab} />
      {tab === 'changes' ? (
        revision.changed_text?.length ? (
          revision.changed_text.map((hunk, h) => (
            <View key={h}>
              {h > 0 ? <Text style={[mono, { backgroundColor: 'rgba(0,0,0,0.2)', textAlign: 'center' }]}>...</Text> : null}
              {hunk.split('\n').map((line, l) => {
                const added = line.startsWith('+ ');
                const removed = line.startsWith('- ');
                return (
                  <Text key={l} selectable style={[mono, added && { backgroundColor: colors.added, color: colors.success }, removed && { backgroundColor: colors.removed, color: colors.danger }]}>
                    {line.slice(2) || ' '}
                  </Text>
                );
              })}
            </View>
          ))
        ) : (
          <T muted>No changes in this revision</T>
        )
      ) : (
        (revision.revision_text || '').split('\n').map((line, l) => (
          <Text key={l} selectable style={mono}>
            {line || ' '}
          </Text>
        ))
      )}
    </View>
  );
}

export default function RevisionHistoryModal({ visible, onClose, noteId }) {
  const [revisions, setRevisions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !noteId) return;
    setLoading(true);
    fetchJSON(`/api/note/revisions/${noteId}/`)
      .then(setRevisions)
      .catch(handleApiError)
      .finally(() => setLoading(false));
  }, [visible, noteId]);

  return (
    <AppModal visible={visible} onClose={onClose} title="Revision History" size="lg" footer={<Button variant="secondary" title="Close" onPress={onClose} />}>
      {loading ? <T>Loading revisions...</T> : revisions.length === 0 ? <T>No revisions found</T> : revisions.map((r, i) => <RevisionEntry key={r.id} revision={r} index={i} total={revisions.length} />)}
    </AppModal>
  );
}
