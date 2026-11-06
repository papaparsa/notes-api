import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp, useWorkspaceCategories } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { AppModal, Button } from '../ui';

export default function MoveModal({ visible, onClose, currentListId, onMove, title = 'Moving note' }) {
  const { colors } = useTheme();
  const { noteLists, selectedWorkspace } = useApp();
  const workspaceCats = useWorkspaceCategories();
  const [showOthers, setShowOthers] = useState(false);
  const wsIds = new Set(selectedWorkspace ? workspaceCats.map((c) => c.id) : []);
  const inWorkspace = selectedWorkspace ? workspaceCats.filter((c) => c.id !== currentListId) : [];
  const others = noteLists.filter((c) => c.id !== currentListId && !wsIds.has(c.id));

  return (
    <AppModal visible={visible} onClose={onClose} title={title} footer={<Button variant="secondary" title="Close" onPress={onClose} />}>
      {selectedWorkspace ? (
        <>
          <Text style={{ color: colors.primary, fontWeight: '500', marginBottom: 8 }}>Workspace Categories</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {inWorkspace.map((c) => (
              <Button key={c.id} variant="info" title={c.name} onPress={() => onMove(c)} style={{ margin: 4 }} />
            ))}
          </View>
          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 16 }} />
        </>
      ) : null}
      <Pressable onPress={() => setShowOthers((v) => !v)}>
        <Text style={{ color: colors.muted, fontWeight: '500', marginBottom: 8 }}>Other Categories {showOthers ? '▼' : '▶'}</Text>
      </Pressable>
      {showOthers ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {others.map((c) => (
            <Button key={c.id} variant="secondary" title={c.name} onPress={() => onMove(c)} style={{ margin: 4 }} />
          ))}
        </View>
      ) : null}
    </AppModal>
  );
}
