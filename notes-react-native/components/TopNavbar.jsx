import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../contexts/AppContext';
import { useTheme } from '../contexts/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { Button, ButtonGroup, Dropdown, MenuDivider, MenuItem } from './ui';

function NavLink({ title, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 8, paddingHorizontal: 8 }}>
      {({ hovered, pressed }) => <Text style={{ color: hovered || pressed ? '#fff' : 'rgba(255,255,255,0.75)', fontSize: 16 }}>{title}</Text>}
    </Pressable>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <ButtonGroup>
      <Button size="sm" variant={theme === 'light' ? 'primary' : 'outline-primary'} title="☀️" onPress={() => setTheme('light')} />
      <Button size="sm" variant={theme === 'dark' ? 'primary' : 'outline-primary'} title="🌙" onPress={() => setTheme('dark')} />
    </ButtonGroup>
  );
}

export default function TopNavbar({ isLoggedIn = true }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { lg } = useBreakpoint();
  const router = useRouter();
  const { workspaces, selectedWorkspace, selectWorkspaceSlug, selectedWorkspaceSlug, logout } = useApp() || {};
  const [expanded, setExpanded] = useState(false);

  const go = (path) => {
    setExpanded(false);
    router.push(path);
  };

  const handleLogout = async () => {
    setExpanded(false);
    await logout();
    router.replace('/login');
  };

  return (
    <View style={{ backgroundColor: colors.primary, paddingTop: insets.top, paddingHorizontal: 16 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 56 }}>
        <Pressable onPress={() => go('/')} style={{ paddingVertical: 5, marginRight: 16 }}>
          <Text style={{ color: '#fff', fontSize: 20 }}>Notes</Text>
        </Pressable>
        {isLoggedIn && workspaces?.length ? (
          <Dropdown
            width={240}
            triggerStyle={{ marginRight: 8 }}
            trigger={(open) => (
              <Button variant="outline-light" onPress={open} textStyle={{ color: '#fff' }} style={{ maxWidth: lg ? 260 : 180 }}>
                <Text numberOfLines={1} style={{ color: '#fff', fontSize: 16 }}>{selectedWorkspace?.name || 'Select Workspace'} ▾</Text>
              </Button>
            )}
          >
            {workspaces.map((ws) => (
              <MenuItem key={ws.slug} label={ws.name} active={ws.slug === selectedWorkspaceSlug} onPress={() => selectWorkspaceSlug(ws.slug)} />
            ))}
          </Dropdown>
        ) : null}
        {isLoggedIn && lg ? (
          <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
            <NavLink title="Home" onPress={() => go('/')} />
            <NavLink title="Manage" onPress={() => go('/manage')} />
            <View style={{ flex: 1 }} />
            <Dropdown
              align="right"
              width={220}
              trigger={(open) => (
                <Pressable onPress={open} style={{ width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.75)', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="User menu">
                  <Text style={{ fontSize: 18 }}>👤</Text>
                </Pressable>
              )}
            >
              <MenuItem label="Manage Reminders" onPress={() => go('/reminders')} />
              <MenuItem label="Files" onPress={() => go('/files')} />
              <MenuItem label="Settings" onPress={() => go('/settings')} />
              <MenuDivider />
              <View style={{ paddingHorizontal: 16, paddingVertical: 4 }}>
                <ThemeToggle />
              </View>
              <MenuDivider />
              <MenuItem label="Logout" onPress={handleLogout} />
            </Dropdown>
          </View>
        ) : null}
        {isLoggedIn && !lg ? (
          <>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setExpanded((v) => !v)} style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4 }} accessibilityLabel="Toggle navigation">
              <Ionicons name="menu" size={28} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </>
        ) : null}
      </View>
      {isLoggedIn && !lg && expanded ? (
        <View style={{ paddingBottom: 8 }}>
          <NavLink title="Home" onPress={() => go('/')} />
          <NavLink title="Manage" onPress={() => go('/manage')} />
          <NavLink title="Manage Reminders" onPress={() => go('/reminders')} />
          <NavLink title="Files" onPress={() => go('/files')} />
          <NavLink title="Settings" onPress={() => go('/settings')} />
          <NavLink title="Logout" onPress={handleLogout} />
        </View>
      ) : null}
    </View>
  );
}
