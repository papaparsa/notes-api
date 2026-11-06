import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Platform, TextInput } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { detectTableKeystroke } from '../lib/tableEditing';
import useEditorDomEvents from '../hooks/useEditorDomEvents';
import { fonts } from '../styles/theme';

const MarkdownTextArea = forwardRef(function MarkdownTextArea(
  { value, onChangeText, onSave, onSaveAndClose, onTogglePreview, onPasteImage, rtl, style, minHeight = 120, maxHeight, editable = true, autoFocus, placeholder, onScroll, onContentSizeChange, fontSize = 16, lineHeight },
  ref,
) {
  const { colors } = useTheme();
  const inputRef = useRef(null);
  const selectionRef = useRef({ start: value?.length ?? 0, end: value?.length ?? 0 });
  const valueRef = useRef(value);
  const [forcedSelection, setForcedSelection] = useState(null);
  const [mounted, setMounted] = useState(false);
  valueRef.current = value;

  useEffect(() => setMounted(true), []);

  const applyEdit = ({ text, selection }) => {
    onChangeText(text);
    if (selection) {
      selectionRef.current = selection;
      setForcedSelection(selection);
      if (Platform.OS === 'web') {
        requestAnimationFrame(() => {
          const node = inputRef.current;
          if (node?.setSelectionRange) {
            node.focus();
            node.setSelectionRange(selection.start, selection.end);
          }
          setForcedSelection(null);
        });
      }
    }
  };

  useImperativeHandle(ref, () => ({
    getSelection: () => selectionRef.current,
    applyEdit,
    focus: () => inputRef.current?.focus(),
    isMounted: () => !!inputRef.current,
    node: () => inputRef.current,
  }));

  useEditorDomEvents(mounted ? inputRef : { current: null }, { onSave, onSaveAndClose, onTogglePreview, onPasteImage, applyEdit });

  const handleChange = (next) => {
    const prev = valueRef.current ?? '';
    const result = Platform.OS === 'web' ? null : detectTableKeystroke(prev, next, selectionRef.current);
    if (result) applyEdit(result);
    else onChangeText(next);
  };

  return (
    <TextInput
      ref={inputRef}
      value={value}
      onChangeText={handleChange}
      multiline
      editable={editable}
      autoFocus={autoFocus}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      autoCapitalize="sentences"
      selection={Platform.OS === 'web' ? undefined : forcedSelection || undefined}
      onSelectionChange={(e) => {
        selectionRef.current = e.nativeEvent.selection;
        if (forcedSelection) setForcedSelection(null);
      }}
      onScroll={onScroll}
      onContentSizeChange={onContentSizeChange}
      scrollEnabled
      textAlignVertical="top"
      style={[
        {
          fontFamily: rtl ? fonts.rtl : fonts.mono,
          fontSize,
          lineHeight: lineHeight || fontSize * 1.5,
          color: colors.text,
          backgroundColor: colors.bodyBg,
          padding: 16,
          minHeight,
          maxHeight,
          textAlign: rtl ? 'right' : 'left',
          writingDirection: rtl ? 'rtl' : 'ltr',
        },
        Platform.OS === 'web' && { outlineStyle: 'none', resize: 'vertical', direction: rtl ? 'rtl' : 'ltr' },
        style,
      ]}
    />
  );
});

export default MarkdownTextArea;
