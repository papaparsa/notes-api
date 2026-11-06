import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfm } from 'micromark-extension-gfm';
import { gfmFromMarkdown } from 'mdast-util-gfm';

export const parseMarkdown = (text) =>
  fromMarkdown(text || '', { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });

export const HASHTAG_SEARCH_PREFIX = '/search?q=%23';

export function processTextForHashtags(text) {
  const shifts = [];
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/);
  let rawOffset = 0;
  const out = parts
    .map((part, i) => {
      const start = rawOffset;
      rawOffset += part.length;
      if (i % 2 === 1) return part;
      return part.replace(/(?<!https?:\/\/[^\s]*)#(\w+)/g, (match, tag, idx) => {
        const suffix = `](${HASHTAG_SEARCH_PREFIX}${tag})`;
        shifts.push({ at: start + idx, end: start + idx + match.length, before: 1, after: suffix.length });
        return `[${match}${suffix}`;
      });
    })
    .join('');
  const mapOffset = (offset) => {
    let added = 0;
    for (const s of shifts) {
      if (offset > s.at) added += s.before;
      if (offset >= s.end && offset > s.at) added += s.after;
    }
    return offset + added;
  };
  return { text: out, mapOffset };
}

export const removeHyphens = (text) => text.replace(/(?<!\w)-|-(?!\w)/g, '');

export function applyHighlight(tree, start, end) {
  if (typeof start !== 'number' || typeof end !== 'number' || start >= end) return;
  const visit = (node) => {
    if (!node.children) return;
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type === 'text' && child.position) {
        const childStart = child.position.start.offset;
        const childEnd = child.position.end.offset;
        if (childEnd > start && childStart < end) {
          const relStart = Math.max(0, start - childStart);
          const relEnd = Math.min(child.value.length, end - childStart);
          if (relStart >= relEnd) continue;
          const nodes = [];
          if (relStart > 0) nodes.push({ type: 'text', value: child.value.slice(0, relStart) });
          nodes.push({ type: 'mark', children: [{ type: 'text', value: child.value.slice(relStart, relEnd) }] });
          if (relEnd < child.value.length) nodes.push({ type: 'text', value: child.value.slice(relEnd) });
          node.children.splice(i, 1, ...nodes);
          i += nodes.length - 1;
        }
      } else if (child.children) {
        visit(child);
      }
    }
  };
  visit(tree);
}

export const RUNNABLE_LANGUAGES = ['pandas', 'python'];

export function annotateTree(tree) {
  let tableIndex = 0;
  const snippets = [];
  const visit = (node) => {
    if (node.type === 'table') {
      node.tableIndex = tableIndex++;
      return;
    }
    if (node.type === 'code' && RUNNABLE_LANGUAGES.includes(node.lang)) {
      node.dfIndex = tableIndex - 1;
      node.snippetIndex = snippets.length;
      snippets.push(node);
      return;
    }
    node.children?.forEach(visit);
  };
  visit(tree);
  snippets.forEach((node) => {
    node.snippetCount = snippets.length;
  });
  return tree;
}

export const containsMark = (node) => node.type === 'mark' || (node.children || []).some(containsMark);

export const nodeText = (node) => {
  if (node.value !== undefined) return node.value;
  return (node.children || []).map(nodeText).join('');
};
