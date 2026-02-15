import { useState, useMemo } from 'react';
import type { Highlight } from '../../types';
import { NotebookEntry } from './NotebookEntry';
import { generateNotesFromHighlights } from '../../services/notesGenerator';
import { stripMarkdownForExport } from '../../services/noteUtils';
import './Notebook.css';

interface NotebookProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  bookTitle: string;
  bookAuthor: string;
  onNavigateToHighlight: (cfi: string) => void;
  onEditAnnotation: (id: string, annotation: string) => void;
  onDeleteHighlight: (id: string) => void;
  onExportNotes?: (markdown: string) => void;
}

async function exportViaElectron(markdown: string, bookTitle: string): Promise<void> {
  const result = await window.electron.showSaveDialog({
    defaultPath: `${bookTitle}-笔记.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }],
  });

  if (!result.canceled && result.filePath) {
    await window.electron.writeFile(result.filePath, markdown);
  }
}

export function Notebook({
  isOpen,
  onClose,
  highlights,
  bookTitle,
  bookAuthor,
  onNavigateToHighlight,
  onEditAnnotation,
  onDeleteHighlight,
  onExportNotes,
}: NotebookProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(
    new Set()
  );

  const groupedHighlights = useMemo(() => {
    const sorted = [...highlights].sort((a, b) => {
      if (a.chapterId !== b.chapterId) {
        return a.chapterId.localeCompare(b.chapterId);
      }
      return a.createdAt - b.createdAt;
    });

    const grouped = new Map<string, Highlight[]>();
    for (const h of sorted) {
      const title = h.chapterTitle || '未知章节';
      if (!grouped.has(title)) {
        grouped.set(title, []);
      }
      grouped.get(title)!.push(h);
    }
    return grouped;
  }, [highlights]);

  const toggleChapter = (chapterTitle: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterTitle)) {
        next.delete(chapterTitle);
      } else {
        next.add(chapterTitle);
      }
      return next;
    });
  };

  const handleExport = async () => {
    const markdown = generateNotesFromHighlights(highlights, bookTitle, bookAuthor);
    const cleanMarkdown = stripMarkdownForExport(markdown);

    if (onExportNotes) {
      onExportNotes(cleanMarkdown);
    } else {
      await exportViaElectron(cleanMarkdown, bookTitle);
    }
  };

  const handleClickHighlight = (highlight: Highlight) => {
    onNavigateToHighlight(highlight.cfi);
    onClose();
  };

  return (
    <>
      <div
        className={`notebook-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <div
        className={`notebook-panel ${isOpen ? 'open' : ''}`}
        aria-hidden={!isOpen}
        {...(!isOpen && { inert: true })}
      >
        <div className="notebook-header">
          <h3 className="notebook-title">笔记本</h3>
          <div className="notebook-actions">
            <button className="notebook-btn notebook-btn-export" onClick={handleExport}>
              导出
            </button>
            <button className="notebook-btn notebook-btn-close" onClick={onClose}>
              ✕
            </button>
          </div>
        </div>

        <div className="notebook-content">
          {highlights.length === 0 ? (
            <div className="notebook-empty">
              <p>暂无高亮笔记</p>
              <p className="notebook-empty-hint">在阅读时选中文本即可添加高亮</p>
            </div>
          ) : (
            Array.from(groupedHighlights.entries()).map(([chapterTitle, chapterHighlights]) => (
              <div key={chapterTitle} className="notebook-chapter">
                <div
                  className="notebook-chapter-header"
                  onClick={() => toggleChapter(chapterTitle)}
                >
                  <span className="notebook-chapter-toggle">
                    {expandedChapters.has(chapterTitle) ? '▼' : '▶'}
                  </span>
                  <span className="notebook-chapter-title">{chapterTitle}</span>
                  <span className="notebook-chapter-count">
                    ({chapterHighlights.length})
                  </span>
                </div>
                {expandedChapters.has(chapterTitle) && (
                  <div className="notebook-chapter-entries">
                    {chapterHighlights.map((highlight) => (
                      <NotebookEntry
                        key={highlight.id}
                        highlight={highlight}
                        onClickHighlight={handleClickHighlight}
                        onEditAnnotation={onEditAnnotation}
                        onDelete={onDeleteHighlight}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="notebook-footer">
          <span>{highlights.length} 条高亮</span>
        </div>
      </div>
    </>
  );
}
