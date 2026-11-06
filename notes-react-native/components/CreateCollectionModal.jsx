import { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { useToast } from '../contexts/UIContext';
import { fetchJSON } from '../lib/api';
import { handleApiError } from '../lib/errorHandler';
import { AppModal, Button, Field, Input, Select } from './ui';

export default function CreateCollectionModal({ visible, onClose, defaultCategorySlug, onCreated }) {
  const { noteLists } = useApp();
  const showToast = useToast();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [listId, setListId] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setDescription('');
    setListId(noteLists.find((l) => l.slug === defaultCategorySlug)?.id ?? null);
  }, [visible]);

  const create = async () => {
    if (!name.trim()) return showToast('Error', 'Please enter a collection name', 3000, 'danger');
    if (!listId) return showToast('Error', 'Please select a category', 3000, 'danger');
    setBusy(true);
    try {
      const data = await fetchJSON('/api/note/collections/', { method: 'POST', body: { name: name.trim(), description, list: listId } });
      showToast('Success', 'Collection created', 3000, 'success');
      onClose();
      onCreated?.(data);
    } catch (err) {
      handleApiError(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Create New Collection"
      footer={
        <>
          <Button variant="secondary" title="Cancel" onPress={onClose} />
          <Button title="Create Collection" onPress={create} loading={busy} />
        </>
      }
    >
      <Field label="Name *">
        <Input value={name} onChangeText={setName} autoFocus placeholder="Collection name" />
      </Field>
      <Field label="Description">
        <Input value={description} onChangeText={setDescription} multiline rows={3} placeholder="Optional description" />
      </Field>
      <Field label="Category *">
        <Select value={listId} onChange={setListId} placeholder="Select a category" options={noteLists.map((l) => ({ value: l.id, label: l.name }))} />
      </Field>
    </AppModal>
  );
}
