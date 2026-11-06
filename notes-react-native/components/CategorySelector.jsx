import { View } from 'react-native';
import { useWorkspaceCategories } from '../contexts/AppContext';
import { Select, T } from './ui';

export default function CategorySelector({ value, onChange }) {
  const categories = useWorkspaceCategories();
  return (
    <View>
      <T small muted style={{ marginBottom: 4 }}>Category</T>
      <Select value={value || 'All'} onChange={onChange} options={[{ value: 'All', label: 'All Categories' }, ...categories.map((c) => ({ value: c.slug, label: c.name }))]} />
    </View>
  );
}
