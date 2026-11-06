import { useEffect, useRef } from 'react';
import { tableEnter, tableTab, pasteAsTable } from '../lib/tableEditing';

export default function useEditorDomEvents(inputRef, handlers) {
  const ref = useRef(handlers);
  ref.current = handlers;

  useEffect(() => {
    const node = inputRef.current;
    if (!node || !node.addEventListener) return;

    const apply = (result) => {
      ref.current.applyEdit(result);
    };

    const onKeyDown = (e) => {
      const h = ref.current;
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        h.onSaveAndClose?.();
        return;
      }
      if (e.shiftKey && e.key === 'Enter' && h.onSave) {
        e.preventDefault();
        h.onSave();
        return;
      }
      if (e.ctrlKey && (e.key === 'p' || e.key === 'P') && h.onTogglePreview) {
        e.preventDefault();
        h.onTogglePreview();
        return;
      }
      if ((e.key !== 'Tab' && e.key !== 'Enter') || e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
      if (e.key === 'Enter' && e.shiftKey) return;
      const { selectionStart, selectionEnd, value } = node;
      if (e.key === 'Enter' && selectionStart !== selectionEnd) return;
      const result = e.key === 'Tab' ? tableTab(value, selectionStart, e.shiftKey) : tableEnter(value, selectionStart);
      if (!result) return;
      e.preventDefault();
      apply(result);
    };

    const onPaste = (e) => {
      const h = ref.current;
      const clipboard = e.clipboardData;
      if (!clipboard) return;
      const { selectionStart, selectionEnd, value } = node;
      const table = pasteAsTable(value, selectionStart, selectionEnd, { html: clipboard.getData('text/html'), plain: clipboard.getData('text/plain') });
      if (table) {
        e.preventDefault();
        apply(table);
        return;
      }
      const item = Array.from(clipboard.items || []).find((i) => i.type.startsWith('image/'));
      if (item && h.onPasteImage) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) h.onPasteImage({ blob: file, type: file.type });
      }
    };

    node.addEventListener('keydown', onKeyDown);
    node.addEventListener('paste', onPaste);
    return () => {
      node.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('paste', onPaste);
    };
  }, [inputRef.current]);
}
