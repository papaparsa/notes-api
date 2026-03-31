"use client";

import React, { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button, Modal } from "react-bootstrap";
import styles from "../NoteCard.module.css";
import { isRTL } from "../../../utils/stringUtils";
import { copyTextToClipboard } from "../../../utils/clipboardUtils";
import ResponsiveImage from "./ResponsiveImage";
import YouTubeLink from "../YouTubeLink";
import { safeUrlEncode, isExternalLink } from "./UrlUtils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useExternalLink } from "../ExternalLinkModal";
import { parseExcalidrawAlt } from "../../../utils/excalidrawEmbed";

// Remark plugin to highlight text based on character indices
export const createHighlightPlugin = (start, end) => {
  return () => (tree) => {
    if (typeof start !== "number" || typeof end !== "number" || start >= end)
      return;

    const visit = (node) => {
      if (!node.children) return;

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];

        // We only process text nodes that have position info
        if (child.type === "text" && child.position) {
          const {
            start: { offset: childStart },
            end: { offset: childEnd },
          } = child.position;

          // Check if this text node overlaps with the highlight range
          if (childEnd > start && childStart < end) {
            // Calculate relative indices for the slice
            const relStart = Math.max(0, start - childStart);
            const relEnd = Math.min(child.value.length, end - childStart);

            // Safety check
            if (relStart >= relEnd) continue;

            const before = child.value.slice(0, relStart);
            const match = child.value.slice(relStart, relEnd);
            const after = child.value.slice(relEnd);

            const newNodes = [];

            if (before) {
              newNodes.push({ type: "text", value: before });
            }

            // Insert the highlighted node
            // We use a custom data structure that remark-rehype converts to <mark>
            newNodes.push({
              type: "element",
              data: {
                hName: "mark",
                hProperties: { className: styles.highlightedText },
              },
              children: [{ type: "text", value: match }],
            });

            if (after) {
              newNodes.push({ type: "text", value: after });
            }

            // Replace the original node with the new nodes
            node.children.splice(i, 1, ...newNodes);

            // Adjust the loop index since we might have added nodes
            i += newNodes.length - 1;
          }
        } else if (child.children) {
          // Recursively visit children
          visit(child);
        }
      }
    };

    visit(tree);
  };
};

// Helper to extract text from ReactMarkdown children
const getNodeText = (childrenInput) => {
  let text = "";
  const recurse = (children) => {
    if (children === null || children === undefined) return;
    if (Array.isArray(children)) {
      children.forEach(recurse);
    } else if (typeof children === "string") {
      text += children;
    } else if (typeof children === "number") {
      text += String(children);
    } else if (typeof children === "object" && children.props) {
      if (children.props.children) {
        recurse(children.props.children);
      } else if (typeof children.props.value === "string") {
        text += children.props.value;
      }
    }
  };
  recurse(childrenInput);
  return text;
};

export const createCustomRenderers = (
  note,
  singleView,
  shouldLoadLinks,
  showToast,
  openExternalLink,
  onDeleteFile,
  onExcalidrawEdit,
) => {
  return {
    p: (props) => <p {...props} />,
    h1: (props) => <h1 {...props} />,
    h2: (props) => <h2 {...props} />,
    h3: (props) => <h3 {...props} />,
    h4: (props) => <h4 {...props} />,
    h5: (props) => <h5 {...props} />,
    h6: (props) => <h6 {...props} />,
    li: (props) => <li {...props} />,
    mark: (props) => <mark className={styles.highlightedText} {...props} />,
    blockquote: (props) => {
      const isRTLContent =
        props.children &&
        typeof props.children === "string" &&
        isRTL(props.children);

      const blockquoteProps = {
        ...props,
        className: `${styles.blockquote} border-start ps-3 my-3 text-body-secondary`,
        dir: isRTLContent ? "rtl" : "ltr",
      };
      return <blockquote {...blockquoteProps}>{props.children}</blockquote>;
    },
    pre: ({ node, inline, className, children, ...props }) => {
      const codeString = getNodeText(children).replace(/\n$/, "");
      const copyCode = () => {
        copyTextToClipboard(codeString);
        showToast("Success", "Code copied to clipboard", 3000, "success");
      };

      return (
        <div className={styles.codeBlockWrapper}>
          <pre className={styles.codeBlock + " bg-body border"}>{children}</pre>
          <Button
            onClick={copyCode}
            variant="outline-primary"
            size="sm"
            className={styles.copyButton}
          >
            Copy
          </Button>
        </div>
      );
    },
    code: ({ node, ...props }) => (
      <code className={styles.codeSnippet}>{props.children}</code>
    ),
    a: ({ href, children }) => {
      const encodedHref = safeUrlEncode(href);
      const isFile = encodedHref.includes("/api/note/files/");
      if (href.includes("youtube.com") || href.includes("youtu.be")) {
        return (
          <YouTubeLink url={encodedHref} shouldLoadLinks={shouldLoadLinks} />
        );
      }
      if (isExternalLink(href)) {
        return (
          <a
            href={encodedHref}
            onClick={(e) => {
              e.preventDefault();
              openExternalLink(encodedHref);
            }}
            style={{ cursor: "pointer" }}
          >
            {children}
          </a>
        );
      }
      if (isFile && singleView) {
        return (
          <span>
            <Link href={encodedHref}>{children}</Link>
            <Button
              variant="danger"
              size="sm"
              style={{ marginLeft: "5px", fontSize: "0.8em", padding: "0 4px" }}
              onClick={() => onDeleteFile(href)}
            >
              ×
            </Button>
          </span>
        );
      }
      return <Link href={encodedHref}>{children}</Link>;
    },
    img: (props) => {
      const encodedSrc = safeUrlEncode(props.src);
      const isFile = encodedSrc.includes("/api/note/files/");
      const drawingMeta = parseExcalidrawAlt(props.alt || "");

      const imageContent = <ResponsiveImage {...props} src={encodedSrc} />;
      const canEditDrawing =
        drawingMeta && typeof onExcalidrawEdit === "function";

      const maybeClickableContent = canEditDrawing ? (
        <button
          type="button"
          className="w-100 border-0 bg-transparent p-0 text-start"
          onClick={() => onExcalidrawEdit(drawingMeta)}
        >
          {imageContent}
        </button>
      ) : (
        imageContent
      );

      if (isFile && singleView) {
        return (
          <div
            style={{ position: "relative", display: "block", width: "100%" }}
          >
            {maybeClickableContent}
            <Button
              variant="danger"
              size="sm"
              style={{
                position: "absolute",
                top: "5px",
                right: "5px",
                opacity: 0.8,
              }}
              onClick={() => onDeleteFile(props.src)}
            >
              ×
            </Button>
          </div>
        );
      }
      return maybeClickableContent;
    },
    td: (props) => {
      // add padding to table cells
      return (
        <td {...props} style={{ padding: "0px 10px" }}>
          {props.children}
        </td>
      );
    },
    th: (props) => {
      // add padding to table header cells
      return (
        <th {...props} style={{ padding: "0px 10px" }}>
          {props.children}
        </th>
      );
    },
  };
};

// Create compact renderers for headers to be same size as text
const createCompactRenderers = (openExternalLink) => {
  return {
    h1: ({ children }) => <span style={{ fontWeight: "600" }}>{children}</span>,
    h2: ({ children }) => <span style={{ fontWeight: "500" }}>{children}</span>,
    h3: ({ children }) => <span style={{ fontWeight: "400" }}>{children}</span>,
    h4: ({ children }) => <span style={{ fontWeight: "300" }}>{children}</span>,
    h5: ({ children }) => <span style={{ fontWeight: "200" }}>{children}</span>,
    h6: ({ children }) => <span style={{ fontWeight: "100" }}>{children}</span>,
    img: (props) => {
      const encodedSrc = safeUrlEncode(props.src);
      return <ResponsiveImage {...props} src={encodedSrc} />;
    },
    a: ({ href, children }) => {
      const encodedHref = safeUrlEncode(href);
      if (isExternalLink(href)) {
        return (
          <a
            href={encodedHref}
            onClick={(e) => {
              e.preventDefault();
              openExternalLink(encodedHref);
            }}
            style={{ cursor: "pointer" }}
          >
            {children}
          </a>
        );
      }
      return <Link href={encodedHref}>{children}</Link>;
    },
  };
};

export const removeHyphens = (text) => {
  if (!text) return "";
  // Remove hyphens that are not part of a word (e.g., in URLs)
  return text.replace(/(?<!\w)-|-(?!\w)/g, "");
};

// Helper function to process text for hashtags
export const processTextForHashtags = (text) => {
  if (!text) return "";
  const parts = text.split(/(```[\s\S]*?```|`[^`\n]*`)/);
  const processed = parts.map((part, index) => {
    if (index % 2 === 0) {
      return part.replace(
        /(?<!https?:\/\/[^\s]*)#(\w+)/g,
        (match, tag) => `[${match}](/search?q=%23${tag})`,
      );
    }
    return part;
  });

  return processed.join("");
};

/**
 * Compact Markdown Renderer - Renders markdown with headers as normal text size
 * Useful for sidebars, similar notes, and linked notes displays
 */
export const CompactMarkdownRenderer = ({
  children,
  className = "",
  ...props
}) => {
  const { openExternalLink } = useExternalLink();
  const text = children || "";
  const processedText = removeHyphens(processTextForHashtags(text));
  const compactRenderers = createCompactRenderers(openExternalLink);

  return (
    <div style={{ maxHeight: "80px", overflow: "hidden" }}>
      <ReactMarkdown
        components={compactRenderers}
        remarkPlugins={[remarkGfm]}
        className={className}
        {...props}
      >
        {processedText}
      </ReactMarkdown>
    </div>
  );
};

const DisplayRenderer = ({
  note,
  singleView = false,
  isExpanded = false,
  onExpand = () => {},
  shouldLoadLinks = true,
  showToast = () => {},
  highlightStart = null,
  highlightEnd = null,
  onDeleteFile = () => {},
  onExcalidrawEdit = null,
}) => {
  const { openExternalLink } = useExternalLink();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  const handleDeleteClick = (fileSrc) => {
    setFileToDelete(fileSrc);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (fileToDelete) {
      onDeleteFile(fileToDelete);
    }
    setShowDeleteModal(false);
    setFileToDelete(null);
  };

  const highlightPlugin = useMemo(
    () => createHighlightPlugin(highlightStart, highlightEnd),
    [highlightStart, highlightEnd],
  );

  const customRenderers = createCustomRenderers(
    note,
    singleView,
    shouldLoadLinks,
    showToast,
    openExternalLink,
    handleDeleteClick,
    onExcalidrawEdit,
  );

  let textToRender =
    singleView || note.text.length < 1000 || isExpanded
      ? note.text
      : note.text.substring(0, 1000);

  textToRender = processTextForHashtags(textToRender);

  return (
    <>
      <span
        className={`card-text ${isRTL(note.text) ? "text-end" : ""}`}
        dir={isRTL(note.text) ? "rtl" : "ltr"}
      >
        <ReactMarkdown
          components={customRenderers}
          remarkPlugins={[remarkGfm, highlightPlugin]}
          className={`${isRTL(note.text) ? styles.rtlMarkdown : ""}`}
        >
          {textToRender}
        </ReactMarkdown>

        {!singleView && note.text.length > 1000 && !isExpanded && (
          <span
            onClick={() => onExpand()}
            className="h4 mx-2 px-1 rounded py-0 text-secondary border flex-sn-wrap"
          >
            <b>...</b>
          </span>
        )}
      </span>
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove this file from the note?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

const NoteTextRenderer = ({
  note,
  singleView = false,
  isExpanded = false,
  onExpand = () => {},
  shouldLoadLinks = true,
  showToast = () => {},
  onDeleteFile = () => {},
  onExcalidrawEdit = null,
}) => {
  const searchParams = useSearchParams();
  const highlightStart = searchParams
    ? parseInt(searchParams.get("highlight_start"))
    : null;
  const highlightEnd = searchParams
    ? parseInt(searchParams.get("highlight_end"))
    : null;

  useEffect(() => {
    if (singleView && !isNaN(highlightStart) && !isNaN(highlightEnd)) {
      setTimeout(() => {
        const highlightedElement = document.querySelector(
          ".highlighted-reminder-text",
        );
        if (highlightedElement) {
          highlightedElement.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 500);
    }
  }, [singleView, highlightStart, highlightEnd]);

  return (
    <DisplayRenderer
      note={note}
      singleView={singleView}
      isExpanded={isExpanded}
      onExpand={onExpand}
      shouldLoadLinks={shouldLoadLinks}
      showToast={showToast}
      highlightStart={!isNaN(highlightStart) ? highlightStart : null}
      highlightEnd={!isNaN(highlightEnd) ? highlightEnd : null}
      onDeleteFile={onDeleteFile}
      onExcalidrawEdit={onExcalidrawEdit}
    />
  );
};

export default NoteTextRenderer;
