import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useApp, useWorkspaceCategories } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button, Checkbox } from '../ui';

export default function SearchFilters({ selectedSlugs, hasFiles, onApply }) {
  const { colors } = useTheme();
  const { noteLists, selectedWorkspace } = useApp();
  const workspaceCats = useWorkspaceCategories();
  const [selected, setSelected] = useState(new Set(selectedSlugs));
  const [files, setFiles] = useState(hasFiles);
  const [showOthers, setShowOthers] = useState(false);

  useEffect(() => setSelected(new Set(selectedSlugs)), [selectedSlugs.join(',')]);
  useEffect(() => setFiles(hasFiles), [hasFiles]);

  const primary = selectedWorkspace ? workspaceCats : noteLists;
  const primaryIds = new Set(primary.map((c) => c.id));
  const others = selectedWorkspace ? noteLists.filter((c) => !primaryIds.has(c.id)) : [];

  const toggle = (slug) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Button size="sm" variant="outline-primary" title="Select All" onPress={() => setSelected(new Set([...primary, ...others].map((c) => c.slug)))} />
        <Button size="sm" variant="outline-secondary" title="Deselect All" onPress={() => setSelected(new Set())} />
      </View>
      {primary.map((c) => (
        <Checkbox key={c.id} checked={selected.has(c.slug)} onChange={() => toggle(c.slug)} label={c.name} />
      ))}
      {others.length ? (
        <>
          <Pressable onPress={() => setShowOthers((v) => !v)} style={{ marginTop: 8 }}>
            <Text style={{ color: colors.primary }}>
              {showOthers ? '▼' : '▶'} Other Categories ({others.length})
            </Text>
          </Pressable>
          {showOthers ? others.map((c) => <Checkbox key={c.id} checked={selected.has(c.slug)} onChange={() => toggle(c.slug)} label={c.name} />) : null}
        </>
      ) : null}
      <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 12 }} />
      <Checkbox checked={files} onChange={setFiles} label="Only notes with files" />
      <Button block title="Apply Filters" onPress={() => onApply([...selected], files)} style={{ marginTop: 12 }} />
    </View>
  );
}
