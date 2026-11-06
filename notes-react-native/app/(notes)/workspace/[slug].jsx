import { useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useApp } from '../../../contexts/AppContext';
import { useTheme } from '../../../contexts/ThemeContext';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import useServerAction from '../../../hooks/useServerAction';
import ScrollPage from '../../../components/ScrollPage';
import { Alert, AppModal, Badge, Button, Card, CardBody, CardHeader, Checkbox, Dropdown, H, ListItem, MenuItem, T } from '../../../components/ui';

export default function WorkspacePage() {
  const { slug } = useLocalSearchParams();
  const router = useRouter();
  const { colors } = useTheme();
  const { md } = useBreakpoint();
  const { workspaces, noteLists } = useApp();
  const action = useServerAction();
  const [showAdd, setShowAdd] = useState(false);
  const [toAdd, setToAdd] = useState(new Set());
  const workspace = workspaces.find((w) => w.slug === slug);

  if (!workspaces.length) return <T style={{ padding: 24 }}>Loading workspace...</T>;
  if (!workspace) {
    return (
      <View style={{ padding: 24 }}>
        <Alert variant="danger">Workspace not found</Alert>
      </View>
    );
  }

  const cats = workspace.categories || [];
  const ids = new Set(cats.map((c) => c.id));
  const available = noteLists.filter((l) => !ids.has(l.id));
  const opts = { events: ['updateWorkspaces', 'updateNoteLists'] };

  const addSelected = async () => {
    setShowAdd(false);
    await action(`/api/note/workspaces/${workspace.id}/categories/`, { method: 'POST', body: { category_ids: [...toAdd] } }, { ...opts, success: 'Categories added' });
    setToAdd(new Set());
  };

  return (
    <ScrollPage contentContainerStyle={{ padding: 12, paddingVertical: 24, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
      <View style={{ marginBottom: 24 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <H level={2} style={{ marginBottom: 0 }}>{workspace.name}</H>
          {workspace.is_default ? <Badge bg="success">Default Workspace</Badge> : null}
        </View>
        {workspace.description ? <T muted>{workspace.description}</T> : null}
      </View>
      <View style={{ flexDirection: md ? 'row' : 'column', marginHorizontal: -12 }}>
        <View style={{ width: md ? '66.667%' : '100%', paddingHorizontal: 12, marginBottom: 24 }}>
          <Card>
            <CardHeader style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <T style={{ fontSize: 18 }}>Categories in this Workspace ({cats.length})</T>
              <Button size="sm" variant="outline-primary" title="Add Categories" disabled={!available.length} onPress={() => setShowAdd(true)} />
            </CardHeader>
            <View>
              {cats.map((c, i) => (
                <ListItem key={c.id} first={i === 0} last={i === cats.length - 1} style={{ borderLeftWidth: 0, borderRightWidth: 0, borderRadius: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text onPress={() => router.push(`/?category=${encodeURIComponent(c.slug)}`)} style={{ color: colors.primary }}>{c.name}</Text>
                    {workspace.default_category === c.id ? <Badge bg="primary" pill>Default</Badge> : null}
                  </View>
                  <Dropdown align="right" width={220} trigger={(open) => <Button size="sm" variant="outline-secondary" title="Actions ▾" onPress={open} />}>
                    <MenuItem label={`${workspace.default_category === c.id ? '◉' : '○'} Set as default`} onPress={() => action(`/api/note/workspaces/${workspace.id}/`, { method: 'PATCH', body: { default_category: c.id } }, { ...opts, success: 'Default category updated' })} />
                    <MenuItem label="Remove from workspace" danger onPress={() => action(`/api/note/workspaces/${workspace.id}/categories/`, { method: 'DELETE', body: { category_ids: [c.id] } }, { ...opts, success: 'Category removed' })} />
                  </Dropdown>
                </ListItem>
              ))}
              {!cats.length ? <T muted style={{ padding: 16 }}>No categories in this workspace yet.</T> : null}
            </View>
          </Card>
        </View>
        <View style={{ width: md ? '33.333%' : '100%', paddingHorizontal: 12 }}>
          <Card>
            <CardHeader>
              <T style={{ fontSize: 18 }}>Workspace Info</T>
            </CardHeader>
            <CardBody>
              <T style={{ marginBottom: 8 }}>
                <Text style={{ fontWeight: '700' }}>Categories:</Text> {cats.length}
              </T>
              {workspace.created_at ? (
                <T style={{ marginBottom: 8 }}>
                  <Text style={{ fontWeight: '700' }}>Created:</Text> {new Date(workspace.created_at).toLocaleDateString()}
                </T>
              ) : null}
              <T>
                <Text style={{ fontWeight: '700' }}>Default Category:</Text> {workspace.default_category_name || 'None'}
              </T>
            </CardBody>
          </Card>
        </View>
      </View>
      <AppModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Categories"
        size="lg"
        footer={
          <>
            <Button variant="secondary" title="Cancel" onPress={() => setShowAdd(false)} />
            <Button title="Add Selected Categories" disabled={!toAdd.size} onPress={addSelected} />
          </>
        }
      >
        {available.map((c) => (
          <Checkbox
            key={c.id}
            checked={toAdd.has(c.id)}
            label={c.name}
            onChange={() =>
              setToAdd((prev) => {
                const next = new Set(prev);
                if (next.has(c.id)) next.delete(c.id);
                else next.add(c.id);
                return next;
              })
            }
          />
        ))}
      </AppModal>
    </ScrollPage>
  );
}
