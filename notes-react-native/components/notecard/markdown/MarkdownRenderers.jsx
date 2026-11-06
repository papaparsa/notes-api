import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../contexts/ThemeContext';
import { useExternalLink, useToast } from '../../../contexts/UIContext';
import { useBreakpoint } from '../../../hooks/useBreakpoint';
import { API_URL } from '../../../config';
import { copyText } from '../../../lib/clipboard';
import { downloadCsv, openFileUrl } from '../../../lib/download';
import { isRTL, isExternalLink, safeUrlEncode } from '../../../lib/stringUtils';
import { annotateTree, applyHighlight, containsMark, nodeText, parseMarkdown, processTextForHashtags, removeHyphens, RUNNABLE_LANGUAGES } from '../../../lib/markdown';
import { findTables, modelToCsv, truncationIndex } from '../../../lib/markdownTable';
import { parseExcalidrawAlt } from '../../../lib/excalidrawEmbed';
import { fonts } from '../../../styles/theme';
import { ConfirmModal } from '../../ui';
import ResponsiveImage from './ResponsiveImage';
import YouTubeLink from '../YouTubeLink';
import RunnableCodeBlock from './RunnableCodeBlock';

const isYouTube = (href) => /youtube\.com|youtu\.be/.test(href || '');
const isFileUrl = (href) => (href || '').includes('/api/note/files/');

const toInternal = (href) => {
  if (!href) return href;
  if (href.startsWith(API_URL)) return href.slice(API_URL.length) || '/';
  if (Platform.OS === 'web' && typeof window !== 'undefined' && href.startsWith(window.location.origin)) {
    return href.slice(window.location.origin.length) || '/';
  }
  return href;
};

const headingSizes = { lg: [40, 32, 28, 24, 20, 16], sm: [28, 26, 24, 20, 18, 16] };
const compactWeights = ['600', '500', '400', '300', '200', '100'];

function useLinkHandler() {
  const router = useRouter();
  const { openExternalLink } = useExternalLink();
  return (rawHref) => {
    const href = toInternal(rawHref);
    if (isFileUrl(href)) return openFileUrl(href);
    if (isExternalLink(href)) return openExternalLink(href);
    if (href.startsWith('#')) return;
    router.push(href.replace(/\/$/, '') || '/');
  };
}

function MarkdownTable({ node, ctx }) {
  const { colors } = useTheme();
  const { md } = useBreakpoint();
  const [header, ...body] = node.children;
  const align = node.align || [];
  const rows = [header, ...body];
  const cellTexts = rows.map((row) => row.children.map((cell) => nodeText(cell)));
  const colCount = Math.max(...rows.map((r) => r.children.length));
  const minWidth = ctx.compact ? 40 : md ? 60 : 96;
  const widths = Array.from({ length: colCount }, (_, c) => {
    const longest = Math.max(...cellTexts.map((r) => (r[c] || '').length));
    return Math.min(ctx.compact ? 160 : 320, Math.max(minWidth, longest * (ctx.compact ? 6.5 : 8) + 18));
  });
  const textAlign = (c) => (align[c] === 'center' ? 'center' : align[c] === 'right' ? 'right' : 'left');
  const editable = typeof ctx.onTableEdit === 'function' && node.tableIndex !== undefined && !ctx.compact;

  const download = () => {
    const model = { headers: cellTexts[0], rows: cellTexts.slice(1) };
    downloadCsv(modelToCsv(model), `note-${ctx.note?.id ?? 'draft'}-table-${(node.tableIndex ?? 0) + 1}.csv`);
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginBottom: ctx.compact ? 4 : 16 }}>
      <ScrollView horizontal style={{ flexShrink: 1 }} contentContainerStyle={{ flexGrow: 0 }}>
        <View style={{ borderWidth: ctx.compact ? 0 : 1, borderColor: colors.border }}>
          {rows.map((row, r) => (
            <View key={r} style={{ flexDirection: 'row', backgroundColor: r === 0 && !ctx.compact ? colors.tertiaryBg : 'transparent' }}>
              {Array.from({ length: colCount }, (_, c) => {
                const cell = row.children[c];
                return (
                  <View
                    key={c}
                    style={{
                      width: widths[c],
                      paddingHorizontal: ctx.compact ? 4 : 4,
                      paddingVertical: ctx.compact ? 0 : 4,
                      borderRightWidth: !ctx.compact && c < colCount - 1 ? 1 : 0,
                      borderBottomWidth: r < rows.length - 1 ? 1 : 0,
                      borderColor: colors.border,
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={[ctx.baseText, { textAlign: textAlign(c), fontWeight: r === 0 ? '700' : '400', fontSize: ctx.compact ? 13 : ctx.baseText.fontSize }]}>
                      {cell ? renderInlines(cell.children, ctx) : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
      {!ctx.compact ? (
        <View style={{ gap: 4, opacity: Platform.OS === 'web' ? 0.6 : 0.6 }}>
          {editable ? (
            <Pressable onPress={() => ctx.onTableEdit(node.tableIndex)} accessibilityLabel="Edit table" style={{ borderWidth: 1, borderColor: colors.secondary, borderRadius: 4, paddingHorizontal: 6 }}>
              <Text style={{ color: colors.secondary }}>✎</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={download} accessibilityLabel="Download as CSV" style={{ borderWidth: 1, borderColor: colors.secondary, borderRadius: 4, paddingHorizontal: 6 }}>
            <Text style={{ color: colors.secondary }}>⤓</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function CodeBlock({ node, ctx }) {
  const { colors } = useTheme();
  const showToast = useToast();
  const code = node.value || '';
  if (ctx.allowCodeRun && RUNNABLE_LANGUAGES.includes(node.lang) && !ctx.compact) {
    return <RunnableCodeBlock code={code} language={node.lang} node={node} ctx={ctx} />;
  }
  return (
    <View style={{ position: 'relative', marginVertical: 8 }}>
      <ScrollView horizontal style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 4, backgroundColor: colors.bodyBg }} contentContainerStyle={{ padding: 16, paddingRight: 70 }}>
        <Text selectable style={{ fontFamily: fonts.mono, fontSize: 14, lineHeight: 22, color: colors.text }}>{code}</Text>
      </ScrollView>
      {!ctx.compact ? (
        <Pressable
          onPress={async () => {
            await copyText(code);
            showToast('Copied', 'Code copied to clipboard', 2000, 'success');
          }}
          style={{ position: 'absolute', top: 5, right: 5, borderWidth: 1, borderColor: colors.primary, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: colors.bodyBg }}
        >
          <Text style={{ color: colors.primary, fontSize: 13 }}>Copy</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function renderInlines(nodes, ctx, keyPrefix = 'i') {
  return (nodes || []).map((node, i) => renderInline(node, ctx, `${keyPrefix}${i}`));
}

function renderInline(node, ctx, key) {
  const { colors } = ctx;
  switch (node.type) {
    case 'text':
      return node.value;
    case 'strong':
      return <Text key={key} style={{ fontWeight: '700' }}>{renderInlines(node.children, ctx, key)}</Text>;
    case 'emphasis':
      return <Text key={key} style={{ fontStyle: 'italic' }}>{renderInlines(node.children, ctx, key)}</Text>;
    case 'delete':
      return <Text key={key} style={{ textDecorationLine: 'line-through' }}>{renderInlines(node.children, ctx, key)}</Text>;
    case 'mark':
      return <Text key={key} style={{ backgroundColor: colors.mark }}>{renderInlines(node.children, ctx, key)}</Text>;
    case 'inlineCode':
      return <Text key={key} style={{ fontFamily: fonts.mono, color: '#d63384', fontSize: ctx.baseText.fontSize * 0.875 }}>{node.value}</Text>;
    case 'break':
      return '\n';
    case 'html':
      return null;
    case 'footnoteReference':
      return <Text key={key} style={{ fontSize: 11, color: colors.primary }}>[{node.label}]</Text>;
    case 'image':
    case 'imageReference':
      return null;
    case 'link':
    case 'linkReference': {
      const href = safeUrlEncode(node.url || '');
      if (!ctx.compact && isYouTube(href)) {
        return <YouTubeLink key={key} url={href} shouldLoadLinks={ctx.shouldLoadLinks} onOpen={() => ctx.openLink(href)} />;
      }
      const showDelete = !ctx.compact && isFileUrl(href) && ctx.singleView && ctx.onDeleteFile;
      return (
        <Text key={key}>
          <Text onPress={() => ctx.openLink(href)} style={{ color: colors.primary, textDecorationLine: 'underline' }}>
            {renderInlines(node.children, ctx, key)}
          </Text>
          {showDelete ? (
            <Text onPress={() => ctx.requestDeleteFile(node.url)} style={{ color: '#fff', backgroundColor: colors.danger, fontSize: 12 }}>
              {' × '}
            </Text>
          ) : null}
        </Text>
      );
    }
    default:
      return node.children ? <Text key={key}>{renderInlines(node.children, ctx, key)}</Text> : node.value ?? null;
  }
}

const isImageNode = (node) => node.type === 'image';

function ImageNode({ node, ctx }) {
  const { colors } = ctx;
  const src = safeUrlEncode(node.url);
  const excalidraw = parseExcalidrawAlt(node.alt || '');
  const onPress = excalidraw && ctx.onExcalidrawEdit ? () => ctx.onExcalidrawEdit({ ...excalidraw, imageUrl: node.url }) : undefined;
  const showDelete = !ctx.compact && isFileUrl(src) && ctx.singleView && ctx.onDeleteFile;
  return (
    <View style={{ position: 'relative' }}>
      <ResponsiveImage src={src} alt={node.alt} onPress={onPress} compact={ctx.compact} />
      {showDelete ? (
        <Pressable onPress={() => ctx.requestDeleteFile(node.url)} style={{ position: 'absolute', top: 5, right: 5, backgroundColor: colors.danger, borderRadius: 4, paddingHorizontal: 6, opacity: 0.8 }} accessibilityLabel="Remove file">
          <Text style={{ color: '#fff' }}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function InlineContainer({ nodes, ctx, style }) {
  const segments = [];
  let current = [];
  nodes.forEach((n) => {
    const isImg = isImageNode(n) || (n.type === 'link' && n.children?.length === 1 && isImageNode(n.children[0]));
    if (isImg) {
      if (current.length) segments.push({ type: 'text', nodes: current });
      current = [];
      segments.push({ type: 'image', node: isImageNode(n) ? n : n.children[0] });
    } else current.push(n);
  });
  if (current.length) segments.push({ type: 'text', nodes: current });
  return segments.map((seg, i) => {
    if (seg.type === 'image') return <ImageNode key={i} node={seg.node} ctx={ctx} />;
    const onlyWhitespace = seg.nodes.every((n) => n.type === 'text' && !n.value.trim());
    if (onlyWhitespace && segments.length > 1) return null;
    return (
      <Text key={i} style={[ctx.baseText, style]} selectable={ctx.selectable}>
        {renderInlines(seg.nodes, ctx, `s${i}`)}
      </Text>
    );
  });
}

function Block({ node, ctx, index, listInfo }) {
  const { colors } = ctx;
  switch (node.type) {
    case 'paragraph':
      return (
        <View style={{ marginBottom: ctx.compact ? 2 : 16 }}>
          <InlineContainer nodes={node.children} ctx={ctx} />
        </View>
      );
    case 'heading': {
      const size = ctx.compact ? ctx.baseText.fontSize : headingSizes[ctx.lg ? 'lg' : 'sm'][node.depth - 1];
      const weight = ctx.compact ? compactWeights[node.depth - 1] : '500';
      return (
        <View style={{ marginBottom: ctx.compact ? 2 : 8 }}>
          <InlineContainer nodes={node.children} ctx={ctx} style={{ fontSize: size, fontWeight: weight, lineHeight: size * 1.2 }} />
        </View>
      );
    }
    case 'blockquote':
      return (
        <View
          style={{
            borderLeftWidth: ctx.rtl ? 0 : 4,
            borderRightWidth: ctx.rtl ? 4 : 0,
            borderColor: colors.primary,
            backgroundColor: colors.primarySubtle,
            paddingVertical: 12,
            paddingHorizontal: 16,
            marginVertical: ctx.compact ? 2 : 16,
            borderRadius: 4,
          }}
        >
          <Blocks nodes={node.children} ctx={{ ...ctx, tight: true, baseText: { ...ctx.baseText, fontStyle: 'italic', color: colors.muted } }} last />
        </View>
      );
    case 'list':
      return (
        <View style={{ marginBottom: ctx.compact ? 2 : ctx.tight ? 0 : 16, [ctx.rtl ? 'paddingRight' : 'paddingLeft']: ctx.compact ? 4 : 8 }}>
          {node.children.map((item, i) => (
            <Block key={i} node={item} ctx={ctx} index={i} listInfo={{ ordered: node.ordered, start: node.start ?? 1 }} />
          ))}
        </View>
      );
    case 'listItem': {
      const marker = typeof node.checked === 'boolean' ? null : listInfo?.ordered ? `${(listInfo.start || 1) + index}.` : ctx.compact ? '' : '•';
      return (
        <View style={{ flexDirection: ctx.rtl ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
          {typeof node.checked === 'boolean' ? (
            <View style={{ width: 22, paddingTop: 3 }}>
              <Ionicons name={node.checked ? 'checkbox' : 'square-outline'} size={16} color={node.checked ? colors.primary : colors.muted} />
            </View>
          ) : marker ? (
            <Text style={[ctx.baseText, { width: listInfo?.ordered ? 26 : 16, textAlign: ctx.rtl ? 'left' : 'right', marginHorizontal: 4 }]}>{marker}</Text>
          ) : null}
          <View style={{ flex: 1 }}>
            <Blocks nodes={node.children} ctx={{ ...ctx, tight: true }} last />
          </View>
        </View>
      );
    }
    case 'code':
      return <CodeBlock node={node} ctx={ctx} />;
    case 'table':
      return <MarkdownTable node={node} ctx={ctx} />;
    case 'thematicBreak':
      return <View style={{ height: 1, backgroundColor: colors.text, opacity: 0.25, marginVertical: 16 }} />;
    case 'footnoteDefinition':
      return (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <Text style={[ctx.baseText, { fontSize: 12 }]}>[{node.label}]</Text>
          <View style={{ flex: 1 }}>
            <Blocks nodes={node.children} ctx={ctx} last />
          </View>
        </View>
      );
    case 'html':
    case 'definition':
      return null;
    default:
      return node.children ? <InlineContainer nodes={node.children} ctx={ctx} /> : null;
  }
}

function Blocks({ nodes, ctx, last, onTopLayout }) {
  return nodes.map((node, i) => {
    const el = <Block key={i} node={node} ctx={i === nodes.length - 1 && last ? { ...ctx } : ctx} index={i} />;
    if (ctx.tight && node.type === 'paragraph') {
      return (
        <View key={i} style={{ marginBottom: i === nodes.length - 1 ? 0 : 4 }}>
          <InlineContainer nodes={node.children} ctx={ctx} />
        </View>
      );
    }
    if (onTopLayout) {
      return (
        <View key={i} onLayout={(e) => onTopLayout(node, e.nativeEvent.layout.y)}>
          {el}
        </View>
      );
    }
    return el;
  });
}

export function useMarkdownContext({ note, text, singleView, shouldLoadLinks = true, onDeleteFile, onExcalidrawEdit, onTableEdit, allowCodeRun = true, compact, small }) {
  const { colors } = useTheme();
  const { lg } = useBreakpoint();
  const openLink = useLinkHandler();
  const rtl = isRTL(note?.text ?? text);
  const baseText = {
    color: colors.text,
    fontSize: small ? 14 : 16,
    lineHeight: small ? 20 : 24,
    textAlign: rtl ? 'right' : 'left',
    writingDirection: rtl ? 'rtl' : 'ltr',
    fontFamily: rtl ? fonts.rtl : undefined,
  };
  return { colors, lg, openLink, rtl, baseText, note, singleView, shouldLoadLinks, onDeleteFile, onExcalidrawEdit, onTableEdit, allowCodeRun, compact, noteText: text };
}

export default function NoteTextRenderer({
  note,
  text: textOverride,
  singleView,
  isExpanded,
  onExpand,
  shouldLoadLinks = true,
  onDeleteFile,
  onExcalidrawEdit,
  onTableEdit,
  allowCodeRun = true,
  highlightStart,
  highlightEnd,
  onBlockLayout,
  onHighlightLayout,
  selectable,
}) {
  const fullText = textOverride ?? note?.text ?? '';
  const [pendingDelete, setPendingDelete] = useState(null);
  const ctx = useMarkdownContext({ note, text: fullText, singleView, shouldLoadLinks, onDeleteFile, onExcalidrawEdit, onTableEdit, allowCodeRun });
  ctx.requestDeleteFile = (src) => setPendingDelete(src);
  ctx.selectable = selectable;
  ctx.tables = useMemo(() => (allowCodeRun ? findTables(fullText) : []), [fullText, allowCodeRun]);

  const cutIndex = singleView || isExpanded ? fullText.length : truncationIndex(fullText, 1000);
  const truncated = cutIndex < fullText.length;

  const tree = useMemo(() => {
    const visible = fullText.substring(0, cutIndex);
    const processed = processTextForHashtags(visible);
    const t = annotateTree(parseMarkdown(processed.text));
    if (Number.isInteger(highlightStart) && Number.isInteger(highlightEnd)) {
      applyHighlight(t, processed.mapOffset(highlightStart), processed.mapOffset(highlightEnd));
    }
    return t;
  }, [fullText, cutIndex, highlightStart, highlightEnd]);

  const needsLayout = onBlockLayout || onHighlightLayout;
  const onTopLayout = needsLayout
    ? (node, y) => {
        if (onBlockLayout && node.position) onBlockLayout(node.position.start.line, y);
        if (onHighlightLayout && containsMark(node)) onHighlightLayout(y);
      }
    : undefined;

  return (
    <View style={{ direction: ctx.rtl ? 'rtl' : 'ltr' }}>
      <Blocks nodes={tree.children} ctx={ctx} onTopLayout={onTopLayout} />
      {truncated ? (
        <Pressable onPress={onExpand} accessibilityLabel="Show more" style={{ alignSelf: ctx.rtl ? 'flex-end' : 'flex-start', borderWidth: 1, borderColor: ctx.colors.border, borderRadius: 6, paddingHorizontal: 4, marginHorizontal: 8 }}>
          <Text style={{ color: ctx.colors.secondary, fontSize: 24, fontWeight: '700', lineHeight: 26 }}>...</Text>
        </Pressable>
      ) : null}
      <ConfirmModal
        visible={!!pendingDelete}
        title="Confirm Delete"
        body="Are you sure you want to remove this file from the note?"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          const src = pendingDelete;
          setPendingDelete(null);
          onDeleteFile?.(src);
        }}
      />
    </View>
  );
}

export function CompactMarkdownRenderer({ text, small = true }) {
  const ctx = useMarkdownContext({ text, compact: true, allowCodeRun: false, small, shouldLoadLinks: false });
  const tree = useMemo(() => parseMarkdown(removeHyphens(processTextForHashtags(text || '').text)), [text]);
  return (
    <View style={{ maxHeight: 80, overflow: 'hidden' }}>
      <Blocks nodes={tree.children} ctx={ctx} />
    </View>
  );
}

