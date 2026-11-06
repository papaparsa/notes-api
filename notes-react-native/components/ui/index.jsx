import { Children, cloneElement, isValidElement, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, useStyles } from '../../contexts/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { breakpoints, radius, shadow } from '../../styles/theme';

const variantColors = (colors, variant) => {
  const outline = variant.startsWith('outline-');
  const name = outline ? variant.slice(8) : variant;
  const map = {
    primary: colors.primary,
    secondary: colors.secondary,
    success: colors.success,
    danger: colors.danger,
    warning: colors.warning,
    info: colors.info,
    light: '#f8f9fa',
    dark: '#212529',
  };
  const base = map[name] || colors.primary;
  if (name === 'link') return { bg: 'transparent', fg: colors.primary, border: 'transparent' };
  if (outline) return { bg: 'transparent', fg: name === 'light' ? '#f8f9fa' : base, border: base, activeBg: base, activeFg: '#fff' };
  const darkText = ['warning', 'info', 'light'].includes(name);
  return { bg: base, fg: darkText ? '#000' : '#fff', border: base };
};

export function Button({
  title,
  children,
  onPress,
  variant = 'primary',
  size,
  disabled,
  loading,
  active,
  icon,
  iconSize,
  style,
  textStyle,
  block,
  accessibilityLabel,
  onLongPress,
}) {
  const { colors } = useTheme();
  const v = variantColors(colors, variant);
  const pad = size === 'sm' ? { paddingVertical: 4, paddingHorizontal: 8 } : size === 'lg' ? { paddingVertical: 8, paddingHorizontal: 16 } : { paddingVertical: 6, paddingHorizontal: 12 };
  const fontSize = size === 'sm' ? 14 : size === 'lg' ? 20 : 16;
  const bg = active && v.activeBg ? v.activeBg : v.bg;
  const fg = active && v.activeFg ? v.activeFg : v.fg;
  const content = children ?? title;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (typeof content === 'string' ? content : undefined)}
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: v.border,
          borderWidth: 1,
          borderRadius: size === 'sm' ? 4 : size === 'lg' ? 8 : 6,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          opacity: disabled ? 0.65 : pressed ? 0.8 : 1,
          alignSelf: block ? 'stretch' : 'flex-start',
        },
        pad,
        style,
      ]}
    >
      {loading ? <ActivityIndicator size="small" color={fg} /> : null}
      {icon ? <Ionicons name={icon} size={iconSize || fontSize + 2} color={fg} /> : null}
      {typeof content === 'string' || typeof content === 'number' ? (
        <Text style={[{ color: fg, fontSize, textDecorationLine: variant === 'link' ? 'underline' : 'none' }, textStyle]}>{content}</Text>
      ) : (
        renderWithColor(content, fg)
      )}
    </Pressable>
  );
}

const renderWithColor = (content, color) =>
  Children.map(content, (child) => {
    if (typeof child === 'string' || typeof child === 'number') return <Text style={{ color }}>{child}</Text>;
    return child;
  });

export function ButtonGroup({ children, style }) {
  const items = Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ flexDirection: 'row' }, style]}>
      {items.map((child, i) =>
        isValidElement(child)
          ? cloneElement(child, {
              key: i,
              style: [
                child.props.style,
                {
                  borderTopLeftRadius: i === 0 ? 4 : 0,
                  borderBottomLeftRadius: i === 0 ? 4 : 0,
                  borderTopRightRadius: i === items.length - 1 ? 4 : 0,
                  borderBottomRightRadius: i === items.length - 1 ? 4 : 0,
                  marginLeft: i === 0 ? 0 : -1,
                },
              ],
            })
          : child,
      )}
    </View>
  );
}

export function T({ style, muted, small, bold, children, numberOfLines, selectable, onPress }) {
  const { colors } = useTheme();
  return (
    <Text
      onPress={onPress}
      selectable={selectable}
      numberOfLines={numberOfLines}
      style={[
        { color: muted ? colors.muted : colors.text, fontSize: small ? 14 : 16 },
        bold && { fontWeight: '700' },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function H({ level = 4, style, children, muted }) {
  const { colors } = useTheme();
  const sizes = { 1: 40, 2: 32, 3: 28, 4: 24, 5: 20, 6: 16 };
  return (
    <Text style={[{ fontSize: sizes[level], fontWeight: '500', color: muted ? colors.muted : colors.text, marginBottom: 8 }, style]}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress }) {
  const styles = useStyles(cardStyles);
  const Comp = onPress ? Pressable : View;
  return (
    <Comp onPress={onPress} style={[styles.card, style]}>
      {children}
    </Comp>
  );
}

export function CardHeader({ children, style }) {
  const styles = useStyles(cardStyles);
  return <View style={[styles.header, style]}>{typeof children === 'string' ? <T>{children}</T> : children}</View>;
}

export function CardBody({ children, style }) {
  return <View style={[{ padding: 16 }, style]}>{children}</View>;
}

const cardStyles = (c) => ({
  card: { backgroundColor: c.bodyBg, borderWidth: 1, borderColor: c.border, borderRadius: radius.md, overflow: 'hidden' },
  header: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: c.tertiaryBg, borderBottomWidth: 1, borderBottomColor: c.border },
});

export function Badge({ children, bg = 'secondary', pill, style, textStyle }) {
  const { colors } = useTheme();
  const v = variantColors(colors, bg);
  return (
    <View style={[{ backgroundColor: v.bg, borderRadius: pill ? 999 : 4, paddingHorizontal: 7, paddingVertical: 3, alignSelf: 'flex-start' }, style]}>
      <Text style={[{ color: v.fg, fontSize: 12, fontWeight: '700' }, textStyle]}>{children}</Text>
    </View>
  );
}

export function Spinner({ size = 'large', style, color }) {
  const { colors } = useTheme();
  return <ActivityIndicator size={size} color={color || colors.primary} style={style} />;
}

export function Alert({ variant = 'warning', children, onClose, style }) {
  const { colors } = useTheme();
  const map = {
    warning: [colors.warningSubtle, '#997404'],
    danger: [colors.dangerSubtle, colors.danger],
    success: [colors.successSubtle, colors.success],
    info: [colors.infoSubtle, '#087990'],
    primary: [colors.primarySubtle, colors.primaryText],
  };
  const [bg, fg] = map[variant] || map.warning;
  return (
    <View style={[{ backgroundColor: bg, borderColor: fg, borderWidth: StyleSheet.hairlineWidth, borderRadius: 6, padding: 12, marginVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }, style]}>
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        {typeof children === 'string' ? <Text style={{ color: fg }}>{children}</Text> : children}
      </View>
      {onClose ? (
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={18} color={fg} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Field({ label, help, children, style }) {
  const { colors } = useTheme();
  return (
    <View style={[{ marginBottom: 16 }, style]}>
      {label ? <Text style={{ color: colors.text, marginBottom: 8 }}>{label}</Text> : null}
      {children}
      {help ? <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>{help}</Text> : null}
    </View>
  );
}

export function Input({ style, size, multiline, rows, inputRef, ...props }) {
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      ref={inputRef}
      placeholderTextColor={colors.muted}
      multiline={multiline}
      onFocus={(e) => {
        setFocused(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFocused(false);
        props.onBlur?.(e);
      }}
      {...props}
      style={[
        {
          borderWidth: 1,
          borderColor: focused ? '#86b7fe' : colors.border,
          borderRadius: size === 'lg' ? 8 : 6,
          paddingHorizontal: size === 'lg' ? 16 : 12,
          paddingVertical: size === 'lg' ? 8 : size === 'sm' ? 4 : 6,
          fontSize: size === 'lg' ? 20 : size === 'sm' ? 14 : 16,
          color: colors.text,
          backgroundColor: colors.bodyBg,
          minHeight: multiline ? (rows || 3) * 24 + 12 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        },
        Platform.OS === 'web' && { outlineStyle: 'none' },
        style,
      ]}
    />
  );
}

export function Checkbox({ checked, onChange, label, style, disabled }) {
  const { colors } = useTheme();
  return (
    <Pressable disabled={disabled} onPress={() => onChange(!checked)} style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }, style]} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1, borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : colors.bodyBg, alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <Ionicons name="checkmark" size={14} color="#fff" /> : null}
      </View>
      {label ? <Text style={{ color: colors.text, flexShrink: 1 }}>{label}</Text> : null}
    </Pressable>
  );
}

export function Radio({ checked, onPress, label }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }} accessibilityRole="radio" accessibilityState={{ checked }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: checked ? colors.primary : colors.border, alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary }} /> : null}
      </View>
      <Text style={{ color: colors.text }}>{label}</Text>
    </Pressable>
  );
}

export function Switch({ value, onChange, label }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => onChange(!value)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }} accessibilityRole="switch" accessibilityState={{ checked: value }}>
      <View style={{ width: 36, height: 20, borderRadius: 10, borderWidth: 1, borderColor: value ? colors.primary : colors.border, backgroundColor: value ? colors.primary : colors.bodyBg, padding: 2, alignItems: value ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: value ? '#fff' : colors.border }} />
      </View>
      {label ? <Text style={{ color: colors.text }}>{label}</Text> : null}
    </Pressable>
  );
}

export function Popover({ visible, anchor, onClose, children, width = 220, align = 'left' }) {
  const { colors } = useTheme();
  const { width: sw, height: sh } = useWindowDimensions();
  if (!visible || !anchor) return null;
  let left = align === 'right' ? anchor.x + anchor.width - width : anchor.x;
  left = Math.max(8, Math.min(left, sw - width - 8));
  const below = anchor.y + anchor.height + 4;
  const maxHeight = Math.max(160, sh - below - 16);
  const openUp = maxHeight < 220 && anchor.y > sh / 2;
  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        style={[
          {
            position: 'absolute',
            left,
            width,
            backgroundColor: colors.bodyBg,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius: 6,
            paddingVertical: 8,
            maxHeight: openUp ? anchor.y - 16 : maxHeight,
          },
          openUp ? { bottom: sh - anchor.y + 4 } : { top: below },
          shadow(2),
        ]}
      >
        <ScrollView>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export function useAnchor() {
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const open = () => {
    ref.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height }));
  };
  const close = () => setAnchor(null);
  return { ref, anchor, open, close, visible: !!anchor };
}

export function MenuItem({ label, onPress, danger, active, disabled, icon, right }) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed, hovered }) => ({
        paddingVertical: 6,
        paddingHorizontal: 16,
        backgroundColor: active ? colors.primary : pressed || hovered ? colors.secondaryBg : 'transparent',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={16} color={active ? '#fff' : danger ? colors.danger : colors.text} /> : null}
      <Text style={{ color: active ? '#fff' : danger ? colors.danger : colors.text, flex: 1 }}>{label}</Text>
      {right}
    </Pressable>
  );
}

export function MenuDivider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />;
}

export function Dropdown({ trigger, children, width, align, triggerStyle }) {
  const a = useAnchor();
  const items = Children.map(children, (child) =>
    isValidElement(child) && child.type === MenuItem
      ? cloneElement(child, {
          onPress: () => {
            a.close();
            child.props.onPress?.();
          },
        })
      : child,
  );
  return (
    <>
      <View ref={a.ref} collapsable={false} style={triggerStyle}>
        {typeof trigger === 'function' ? trigger(a.open) : <Pressable onPress={a.open}>{trigger}</Pressable>}
      </View>
      <Popover visible={a.visible} anchor={a.anchor} onClose={a.close} width={width} align={align}>
        {items}
      </Popover>
    </>
  );
}

export function Select({ value, options, onChange, style, placeholder, size }) {
  const { colors } = useTheme();
  const a = useAnchor();
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable
        ref={a.ref}
        onPress={a.open}
        style={[
          {
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 6,
            paddingHorizontal: 12,
            paddingVertical: size === 'sm' ? 4 : 6,
            backgroundColor: colors.bodyBg,
            flexDirection: 'row',
            alignItems: 'center',
          },
          style,
        ]}
      >
        <Text numberOfLines={1} style={{ color: current ? colors.text : colors.muted, flex: 1, fontSize: size === 'sm' ? 14 : 16 }}>
          {current?.label ?? placeholder ?? ''}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.text} />
      </Pressable>
      <Popover visible={a.visible} anchor={a.anchor} onClose={a.close} width={Math.max(a.anchor?.width || 200, 180)}>
        {options.map((o) => (
          <MenuItem
            key={String(o.value)}
            label={o.label}
            active={o.value === value}
            onPress={() => {
              a.close();
              onChange(o.value);
            }}
          />
        ))}
      </Popover>
    </>
  );
}

const sizeWidths = { sm: 300, md: 500, lg: 800, xl: 1140 };

const isFullscreen = (fullscreen, width) => {
  if (fullscreen === true) return true;
  if (typeof fullscreen === 'string') {
    const bp = fullscreen.replace('-down', '');
    return width < (breakpoints[bp] || 0);
  }
  return false;
};

export function AppModal({ visible, onClose, title, children, footer, size = 'md', fullscreen, scroll = true, centered, bodyStyle, headerStyle, titleStyle, closable = true }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const full = isFullscreen(fullscreen, width);
  const maxWidth = Math.min(sizeWidths[size] || 500, width - 16);
  const Body = scroll ? ScrollView : View;
  return (
    <Modal visible={!!visible} transparent animationType="fade" onRequestClose={closable ? onClose : () => {}}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flex: 1, backgroundColor: colors.overlay, justifyContent: full || !centered ? (full ? 'flex-start' : 'flex-start') : 'center', alignItems: 'center', paddingTop: full ? 0 : centered ? 0 : 28, paddingBottom: full ? 0 : 28 }}>
          {closable ? <Pressable style={StyleSheet.absoluteFill} onPress={onClose} /> : null}
          <View
            style={[
              {
                backgroundColor: colors.bodyBg,
                borderRadius: full ? 0 : 8,
                width: full ? '100%' : maxWidth,
                maxHeight: full ? '100%' : '100%',
                flexShrink: 1,
                overflow: 'hidden',
                borderWidth: full ? 0 : 1,
                borderColor: colors.border,
              },
              full && { flex: 1 },
              shadow(2),
            ]}
          >
            {title !== undefined ? (
              <View style={[{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border, paddingTop: full && Platform.OS !== 'web' ? 48 : 16 }, headerStyle]}>
                <View style={{ flex: 1 }}>{typeof title === 'string' ? <Text style={[{ fontSize: 20, fontWeight: '500', color: colors.text }, titleStyle]}>{title}</Text> : title}</View>
                {closable ? (
                  <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Close">
                    <Ionicons name="close" size={22} color={colors.muted} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}
            <Body style={full ? { flex: 1 } : { flexShrink: 1 }} contentContainerStyle={scroll ? [{ padding: 16 }, bodyStyle] : undefined} keyboardShouldPersistTaps="handled">
              {scroll ? children : <View style={[{ padding: 16, flex: full ? 1 : undefined }, bodyStyle]}>{children}</View>}
            </Body>
            {footer ? (
              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: colors.border }}>{footer}</View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function ConfirmModal({ visible, title, body, onCancel, onConfirm, confirmLabel = 'Delete', confirmVariant = 'danger', cancelLabel = 'Cancel', size = 'md', centered = true }) {
  return (
    <AppModal
      visible={visible}
      onClose={onCancel}
      title={title}
      size={size}
      centered={centered}
      footer={
        <>
          <Button variant="secondary" title={cancelLabel} onPress={onCancel} />
          <Button variant={confirmVariant} title={confirmLabel} onPress={onConfirm} />
        </>
      }
    >
      {typeof body === 'string' ? <T>{body}</T> : body}
    </AppModal>
  );
}

const colWidth = (props, bp) => {
  const order = ['xxl', 'xl', 'lg', 'md', 'sm'];
  for (const key of order) {
    if (bp[key] && props[key] !== undefined) return props[key];
  }
  return props.xs;
};

export function Row({ children, gutter = 24, style, gy = 0 }) {
  return (
    <View style={[{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -gutter / 2, rowGap: gy }, style]}>
      {Children.map(children, (child) => (isValidElement(child) ? cloneElement(child, { gutter }) : child))}
    </View>
  );
}

export function Col({ children, gutter = 24, style, hidden, ...props }) {
  const bp = useBreakpoint();
  const span = colWidth(props, bp);
  if (hidden) return null;
  const sizing = span === undefined ? { flex: 1, minWidth: 0 } : { width: `${(span / 12) * 100}%` };
  return <View style={[{ paddingHorizontal: gutter / 2 }, sizing, style]}>{children}</View>;
}

export function Divider({ style }) {
  const { colors } = useTheme();
  return <View style={[{ height: 1, backgroundColor: colors.border, marginVertical: 16, opacity: 0.6 }, style]} />;
}

export function ProgressBar({ value, height = 6, variant = 'info' }) {
  const { colors } = useTheme();
  return (
    <View style={{ height, backgroundColor: colors.secondaryBg, borderRadius: height / 2, overflow: 'hidden' }}>
      <View style={{ height, width: `${Math.max(0, Math.min(100, value))}%`, backgroundColor: colors[variant] || colors.info }} />
    </View>
  );
}

export function Tabs({ tabs, active, onChange }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 }}>
      {tabs.map((t) => (
        <Pressable
          key={t.key}
          onPress={() => onChange(t.key)}
          style={{
            paddingVertical: 8,
            paddingHorizontal: 16,
            borderWidth: 1,
            borderColor: active === t.key ? colors.border : 'transparent',
            borderBottomColor: active === t.key ? colors.bodyBg : 'transparent',
            borderTopLeftRadius: 6,
            borderTopRightRadius: 6,
            marginBottom: -1,
            backgroundColor: active === t.key ? colors.bodyBg : 'transparent',
          }}
        >
          <Text style={{ color: active === t.key ? colors.text : colors.primary }}>{t.title}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ListItem({ children, style, onPress, first, last }) {
  const { colors } = useTheme();
  const Comp = onPress ? Pressable : View;
  return (
    <Comp
      onPress={onPress}
      style={[
        {
          paddingVertical: 8,
          paddingHorizontal: 16,
          borderWidth: 1,
          borderColor: colors.border,
          marginTop: first ? 0 : -1,
          borderTopLeftRadius: first ? 6 : 0,
          borderTopRightRadius: first ? 6 : 0,
          borderBottomLeftRadius: last ? 6 : 0,
          borderBottomRightRadius: last ? 6 : 0,
          backgroundColor: colors.bodyBg,
        },
        style,
      ]}
    >
      {children}
    </Comp>
  );
}

export function Link({ children, onPress, style, numberOfLines }) {
  const { colors } = useTheme();
  return (
    <Text onPress={onPress} numberOfLines={numberOfLines} style={[{ color: colors.primary }, style]}>
      {children}
    </Text>
  );
}
