import { useEffect, useRef, useState, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { Mark, mergeAttributes } from '@tiptap/core';
import Placeholder from '@tiptap/extension-placeholder';
import Typography from '@tiptap/extension-typography';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { lowlight } from 'lowlight';
import { marked } from 'marked';
import TurndownService from 'turndown';
import './NotesEditor.css';
import type { Chapter } from '../../types';
import { useAppStore } from '../../stores/appStore';

// Custom extension for location links that preserves data-loc attribute
const LocationLink = Mark.create({
  name: 'locationLink',
  priority: 1001, // Higher than regular Link

  addAttributes() {
    return {
      'data-loc': {
        default: null,
        parseHTML: (element) => element.getAttribute('data-loc'),
        renderHTML: (attributes) => {
          if (!attributes['data-loc']) return {};
          return { 'data-loc': attributes['data-loc'] };
        },
      },
      href: {
        default: null,
        parseHTML: (element) => element.getAttribute('href'),
        renderHTML: (attributes) => {
          if (!attributes.href) return {};
          return { href: attributes.href };
        },
      },
      class: {
        default: 'loc-link',
        parseHTML: (element) => element.getAttribute('class'),
        renderHTML: (attributes) => {
          return { class: attributes.class || 'loc-link' };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-loc]',
        priority: 60,
      },
      {
        tag: 'a[href^="loc:"]',
        priority: 60,
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes(HTMLAttributes), 0];
  },
});

type ViewMode = 'write' | 'source';

interface NotesEditorProps {
  content: string;
  onChange: (content: string) => void;
  wordCount: number;
  isSaving: boolean;
  lastSaved: Date | null;
  theme: 'light' | 'dark';
  fontSize: number;
  onJumpToLocation: (cfi: string) => void;
  chapters: Chapter[];
}

export function NotesEditor({
  content,
  onChange,
  wordCount,
  isSaving,
  lastSaved,
  theme,
  fontSize,
  onJumpToLocation,
  chapters,
}: NotesEditorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('write');
  const editorRef = useRef<import('monaco-editor').editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);
  const { noteInsertRequest, clearNoteInsertRequest } = useAppStore();
  const isApplyingContentRef = useRef(false);
  const lastMarkdownRef = useRef(content);
  const turndownRef = useRef(
    new TurndownService({
      headingStyle: 'atx',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
    })
  );
  const turndownConfiguredRef = useRef(false);

  const findChapterTitle = useMemo(() => {
    const findById = (items: Chapter[], id: string): Chapter | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findById(item.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    return (chapterId: string) => findById(chapters, chapterId)?.title || 'Location';
  }, [chapters]);

  const replaceLocationComments = useMemo(() => {
    return (markdown: string) =>
      markdown.replace(/<!-- loc:([^:]+):([^>]+) -->/g, (_match, chapterId, cfi) => {
        const title = findChapterTitle(chapterId);
        return `<a class="loc-link" data-loc="${chapterId}:${cfi}" href="loc:${chapterId}:${cfi}">📍 ${title}</a>`;
      });
  }, [findChapterTitle]);

  const handleEditorChange = (value: string | undefined) => {
    onChange(value || '');
  };

  const handleEditorMount = (
    editor: import('monaco-editor').editor.IStandaloneCodeEditor,
    monaco: typeof import('monaco-editor')
  ) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      LocationLink, // Custom extension for location links - must come before Link
      Link.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your notes...',
      }),
      Typography,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: marked.parse(replaceLocationComments(content)) as string,
    editorProps: {
      attributes: {
        class: 'notes-wysiwyg',
      },
      handleClick: (_view, _pos, event) => {
        const target = event.target as HTMLElement | null;
        // Try to find location link - either by data-loc attribute or href starting with loc:
        let anchor: HTMLAnchorElement | null = target?.closest('[data-loc]') as HTMLAnchorElement | null;
        if (!anchor) {
          anchor = target?.closest('a[href^="loc:"]') as HTMLAnchorElement | null;
        }
        if (!anchor && target?.tagName === 'A') {
          const el = target as HTMLAnchorElement;
          if (el.getAttribute('data-loc') || el.getAttribute('href')?.startsWith('loc:')) {
            anchor = el;
          }
        }

        if (anchor) {
          const locValue = anchor.getAttribute('data-loc') || anchor.getAttribute('href')?.replace(/^loc:/, '');
          if (locValue) {
            event.preventDefault();
            event.stopPropagation();
            const splitIndex = locValue.indexOf(':');
            const cfi = splitIndex >= 0 ? locValue.slice(splitIndex + 1) : '';
            if (cfi) {
              onJumpToLocation(cfi);
            }
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      if (isApplyingContentRef.current) {
        return;
      }
      const html = editor.getHTML();
      const markdown = turndownRef.current.turndown(html);
      if (markdown !== lastMarkdownRef.current) {
        lastMarkdownRef.current = markdown;
        onChange(markdown);
      }
    },
  });

  useEffect(() => {
    if (turndownConfiguredRef.current) {
      return;
    }

    turndownRef.current.addRule('loc-links', {
      filter: (node: Node) => {
        if (node.nodeName === 'A') {
          const element = node as HTMLAnchorElement;
          return element.getAttribute('data-loc') !== null || (element.getAttribute('href') || '').startsWith('loc:');
        }

        return false;
      },
      replacement: (_content: string, node: Node) => {
        const locValue =
          (node as HTMLElement).getAttribute('data-loc') ||
          (node as HTMLAnchorElement).getAttribute('href')?.replace(/^loc:/, '') ||
          '';
        const splitIndex = locValue.indexOf(':');
        if (splitIndex < 0) {
          return '';
        }
        const chapterId = locValue.slice(0, splitIndex);
        const cfi = locValue.slice(splitIndex + 1);
        return `<!-- loc:${chapterId}:${cfi} -->`;
      },
    });

    turndownConfiguredRef.current = true;
  }, []);

  useEffect(() => {
    if (!editor) return;

    if (content === lastMarkdownRef.current) {
      return;
    }

    isApplyingContentRef.current = true;
    const html = marked.parse(replaceLocationComments(content)) as string;
    editor.commands.setContent(html, false);
    lastMarkdownRef.current = content;
    isApplyingContentRef.current = false;
  }, [content, editor, replaceLocationComments]);

  useEffect(() => {
    if (!noteInsertRequest) {
      return;
    }

    if (viewMode === 'write' && editor) {
      const html = marked.parse(replaceLocationComments(noteInsertRequest)) as string;
      const shouldAppend = !editor.isFocused;
      if (shouldAppend) {
        editor.commands.insertContentAt(editor.state.doc.content.size, html);
        editor.commands.focus('end');
      } else {
        editor.commands.insertContent(html);
        editor.commands.focus();
      }
      clearNoteInsertRequest();
      return;
    }

    const monacoEditor = editorRef.current;
    const monaco = monacoRef.current;

    if (viewMode === 'source' && monacoEditor && monaco) {
      const selection = monacoEditor.getSelection();
      const hasFocus = monacoEditor.hasTextFocus();
      let range: import('monaco-editor').Range | null = selection || null;

      if (!range || !hasFocus) {
        const model = monacoEditor.getModel();
        if (model) {
          const line = model.getLineCount();
          const column = model.getLineMaxColumn(line);
          range = new monaco.Range(line, column, line, column);
        }
      }

      if (range) {
        const model = monacoEditor.getModel();
        const insertOffset = model
          ? model.getOffsetAt({ lineNumber: range.startLineNumber, column: range.startColumn })
          : null;
        monacoEditor.executeEdits('insert-quote', [
          {
            range,
            text: noteInsertRequest,
            forceMoveMarkers: true,
          },
        ]);
        monacoEditor.focus();
        if (model && insertOffset !== null) {
          const endOffset = insertOffset + noteInsertRequest.length;
          const endPosition = model.getPositionAt(endOffset);
          monacoEditor.setPosition(endPosition);
          monacoEditor.revealPositionInCenter(endPosition);
        }
        clearNoteInsertRequest();
        return;
      }
    }

    onChange(`${content}${content.endsWith('\n') ? '' : '\n'}${noteInsertRequest}`);
    clearNoteInsertRequest();
  }, [noteInsertRequest, content, onChange, clearNoteInsertRequest, editor, replaceLocationComments, viewMode]);

  const formatLastSaved = () => {
    if (!lastSaved) return 'Not saved yet';
    const now = Date.now();
    const diff = now - lastSaved.getTime();

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    return lastSaved.toLocaleTimeString();
  };

  return (
    <div className="notes-editor">
      {/* Header with controls */}
      <div className="notes-header">
        <div className="notes-header-left">
          <h3>Notes</h3>
          <div className="notes-stats">
            <span className="word-count">{wordCount} words</span>
            <span className="save-status">
              {isSaving ? (
                <>
                  <span className="spinner-small"></span> Saving...
                </>
              ) : (
                <>✓ {formatLastSaved()}</>
              )}
            </span>
          </div>
        </div>

      <div className="notes-header-right">
        <div className="view-mode-toggle">
          <button
            className={`mode-button ${viewMode === 'write' ? 'active' : ''}`}
            onClick={() => setViewMode('write')}
            title="Write mode"
          >
            ✍️ Write
          </button>
          <button
            className={`mode-button ${viewMode === 'source' ? 'active' : ''}`}
            onClick={() => setViewMode('source')}
            title="Source mode"
          >
            {'</>'} Source
          </button>
        </div>
      </div>
      </div>

      {/* Editor and Preview */}
      <div className={`notes-content notes-content-${viewMode}`}>
        {viewMode === 'write' && (
          <div className="notes-editor-pane">
            <EditorContent editor={editor} />
          </div>
        )}

        {viewMode === 'source' && (
          <div className="notes-editor-pane">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              value={content}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
              theme={theme === 'dark' ? 'vs-dark' : 'vs'}
              options={{
                fontSize,
                wordWrap: 'on',
                minimap: { enabled: false },
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                renderWhitespace: 'selection',
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
