import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../contexts/AppContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import useServerAction from '../../hooks/useServerAction';
import { emit } from '../../lib/events';
import ScrollPage from '../../components/ScrollPage';
import { AppModal, Badge, Button, Card, CardBody, CardHeader, Dropdown, Field, H, Input, MenuItem, T } from '../../components/ui';

function ActionsMenu({ onRename, onDelete }) {
  return (
    <Dropdown align="right" width={160} trigger={(open) => <Button size="sm" variant="outline-secondary" title="Actions ▾" onPress={open} />}>
      <MenuItem label="Rename" onPress={onRename} />
      <MenuItem label="Delete" danger onPress={onDelete} />
    </Dropdown>
  );
}

function NameModal({ visible, title, initial, withDescription, onClose, onSubmit, submitLabel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setDescription(initial?.description || '');
    }
  }, [visible]);
  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" title="Cancel" onPress={onClose} />
          <Button title={submitLabel} onPress={() => name.trim() && onSubmit({ name: name.trim(), ...(withDescription ? { description } : {}) })} />
        </>
      }
    >
      <Field label="Name">
        <Input value={name} onChangeText={setName} autoFocus />
      </Field>
      {withDescription ? (
        <Field label="Description">
          <Input value={description} onChangeText={setDescription} multiline rows={3} />
        </Field>
      ) : null}
    </AppModal>
  );
}

export default function ManagePage() {
  const { colors } = useTheme();
  const router = useRouter();
  const { md } = useBreakpoint();
  const { noteLists, workspaces, selectedWorkspace } = useApp();
  const action = useServerAction();
  const [modal, setModal] = useState(null);

  useEffect(() => {
    emit('updateNoteLists');
    emit('updateWorkspaces');
  }, []);

  const categories = selectedWorkspace && !selectedWorkspace.is_default ? noteLists.filter((l) => (l.workspaces || []).some((w) => w.id === selectedWorkspace.id)) : noteLists;
  const close = () => setModal(null);
  const run = async (...args) => {
    close();
    await action(...args);
  };

  return (
    <ScrollPage contentContainerStyle={{ padding: 12, paddingVertical: 24, maxWidth: 1320, alignSelf: 'center', width: '100%' }}>
      <H level={2} style={{ marginBottom: 24 }}>Manage Categories and Workspaces</H>
      <View style={{ flexDirection: md ? 'row' : 'column', marginHorizontal: -12 }}>
        <View style={{ width: md ? '50%' : '100%', paddingHorizontal: 12, marginBottom: 24 }}>
          <Card>
            <CardHeader>
              <T style={{ fontSize: 20 }}>Categories</T>
            </CardHeader>
            <CardBody>
              {categories.map((c) => (
                <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 6, backgroundColor: colors.secondaryBg, marginBottom: 8, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <Text onPress={() => router.push(`/?category=${encodeURIComponent(c.slug)}`)} style={{ color: colors.primary, flexShrink: 1 }}>{c.name}</Text>
                    <Badge bg="info" pill>{`${(c.workspaces || []).length} WS`}</Badge>
                  </View>
                  <ActionsMenu onRename={() => setModal({ type: 'renameCat', item: c })} onDelete={() => setModal({ type: 'deleteCat', item: c })} />
                </View>
              ))}
              <View style={{ alignItems: 'center', marginTop: 24 }}>
                <Button size="sm" title="Create New Category" onPress={() => setModal({ type: 'createCat' })} style={{ alignSelf: 'center' }} />
              </View>
            </CardBody>
          </Card>
        </View>
        <View style={{ width: md ? '50%' : '100%', paddingHorizontal: 12, marginBottom: 24 }}>
          <Card>
            <CardHeader>
              <T style={{ fontSize: 20 }}>Workspaces</T>
            </CardHeader>
            <CardBody>
              {workspaces.map((ws) => (
                <View key={ws.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 6, marginBottom: 8, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text onPress={() => router.push(`/workspace/${ws.slug}`)} style={{ color: colors.primary, fontWeight: '700' }}>{ws.name}</Text>
                      {ws.is_default ? <Badge bg="success">Default</Badge> : null}
                    </View>
                    {ws.description ? <T small muted>{ws.description}</T> : null}
                    <T small muted>{(ws.categories || []).length} categories</T>
                  </View>
                  <ActionsMenu onRename={() => setModal({ type: 'renameWs', item: ws })} onDelete={() => setModal({ type: 'deleteWs', item: ws })} />
                </View>
              ))}
              <View style={{ alignItems: 'center', marginTop: 24 }}>
                <Button size="sm" variant="success" title="Create New Workspace" onPress={() => setModal({ type: 'createWs' })} style={{ alignSelf: 'center' }} />
              </View>
            </CardBody>
          </Card>
        </View>
      </View>

      <NameModal visible={modal?.type === 'createCat'} title="Create New List" submitLabel="Create" onClose={close} onSubmit={(body) => run('/api/note/list/', { method: 'POST', body }, { success: 'Category created', events: ['updateNoteLists'] })} />
      <NameModal visible={modal?.type === 'renameCat'} title="Rename List" submitLabel="Rename" initial={modal?.item} onClose={close} onSubmit={(body) => run(`/api/note/list/${modal.item.id}/`, { method: 'PATCH', body }, { success: 'Category renamed', events: ['updateNoteLists'] })} />
      <AppModal
        visible={modal?.type === 'deleteCat'}
        onClose={close}
        title="Delete Category"
        footer={
          <>
            <Button variant="secondary" title="Cancel" onPress={close} />
            <Button variant="danger" title="Delete" onPress={() => run(`/api/note/list/${modal.item.id}/delete/`, { method: 'DELETE' }, { success: 'Category deleted', events: ['updateNoteLists', 'updateWorkspaces'] })} />
          </>
        }
      >
        <T>Are you sure you want to delete "{modal?.item?.name}"?</T>
        <T muted small style={{ marginTop: 8 }}>The category must be empty to be deleted.</T>
      </AppModal>
      <NameModal visible={modal?.type === 'createWs'} title="Create New Workspace" submitLabel="Create" withDescription onClose={close} onSubmit={(body) => run('/api/note/workspaces/', { method: 'POST', body }, { success: 'Workspace created', events: ['updateWorkspaces'] })} />
      <NameModal visible={modal?.type === 'renameWs'} title="Rename Workspace" submitLabel="Save" withDescription initial={modal?.item} onClose={close} onSubmit={(body) => run(`/api/note/workspaces/${modal.item.id}/`, { method: 'PATCH', body }, { success: 'Workspace updated', events: ['updateWorkspaces'] })} />
      <AppModal
        visible={modal?.type === 'deleteWs'}
        onClose={close}
        title="Delete Workspace"
        footer={
          <>
            <Button variant="secondary" title="Cancel" onPress={close} />
            <Button variant="danger" title="Delete" onPress={() => run(`/api/note/workspaces/${modal.item.id}/`, { method: 'DELETE' }, { success: 'Workspace deleted', events: ['updateWorkspaces', 'updateNoteLists'] })} />
          </>
        }
      >
        <T>Are you sure you want to delete "{modal?.item?.name}"?</T>
        <T muted small style={{ marginTop: 8 }}>Categories in this workspace will remain but won't be associated with it.</T>
      </AppModal>
    </ScrollPage>
  );
}
