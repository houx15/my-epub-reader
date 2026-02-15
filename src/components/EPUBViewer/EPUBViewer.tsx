import { useEffect, useRef, useState } from 'react';
import { TableOfContents } from './TableOfContents';
import { SelectionPopover } from './SelectionPopover';
import { HighlightPopover } from '../Highlights/HighlightPopover';
import { useSelection } from '../../hooks/useSelection';
import { useHighlights } from '../../hooks/useHighlights';
import { useAppStore } from '../../stores/appStore';
import type { HighlightColor } from '../../types';
import './EPUBViewer.css';
import type { Chapter } from '../../types';

interface EPUBViewerProps {
  onRenderReady: (element: HTMLElement, width: number, height: number) => void;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onChapterSelect: (href: string) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
}

export function EPUBViewer({
  onRenderReady,
  chapters,
  currentChapter,
  onChapterSelect,
  onNextPage,
  onPrevPage,
}: EPUBViewerProps) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);
  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [bookId, setBookId] = useState<string | null>(null);

  const { requestNoteInsert, isLLMPanelCollapsed, toggleLLMPanel, currentBook, setCurrentSelection } = useAppStore();
  const { selection, popoverPosition, clearSelection, dismissPopover } = useSelection(
    viewerRef,
    currentChapter,
    chapters
  );

  const {
    createHighlight,
    updateHighlight,
    removeHighlight,
    renderHighlights,
    activeHighlight,
    activeHighlightPosition,
    loadHighlightsForBook,
    clearActiveHighlight,
  } = useHighlights();

  useEffect(() => {
    if (currentBook?.id !== bookId) {
      setBookId(currentBook?.id || null);
      setIsRendered(false);
      isInitializingRef.current = false;
    }
  }, [currentBook?.id, bookId]);

  useEffect(() => {
    if (currentBook?.id) {
      loadHighlightsForBook(currentBook.id);
    }
  }, [currentBook?.id, loadHighlightsForBook]);

  useEffect(() => {
    if (viewerRef.current && wrapperRef.current && !isRendered) {
      if (isInitializingRef.current) {
        return;
      }

      isInitializingRef.current = true;

      const initRender = () => {
        if (viewerRef.current && wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          const width = Math.floor(rect.width);
          const height = Math.floor(rect.height);

          if (width > 100 && height > 100) {
            Promise.resolve(onRenderReady(viewerRef.current, width, height))
              .then(() => {
                setIsRendered(true);
                if (currentBook?.id) {
                  setTimeout(() => {
                    renderHighlights();
                  }, 100);
                }
              })
              .finally(() => {
                isInitializingRef.current = false;
              });
          } else {
            setTimeout(initRender, 100);
          }
        }
      };

      setTimeout(initRender, 50);
    }
  }, [onRenderReady, isRendered, currentBook?.id, renderHighlights]);

  useEffect(() => {
    if (isRendered && currentBook?.id) {
      renderHighlights();
    }
  }, [isRendered, currentBook?.id, renderHighlights]);

  const toggleTOC = () => {
    setIsTOCOpen(!isTOCOpen);
  };

  const handleChapterSelect = (href: string) => {
    onChapterSelect(href);
    setIsTOCOpen(false);
  };

  const handleQuoteToNotes = (formattedQuote: string) => {
    requestNoteInsert(formattedQuote);
  };

  const handleDiscussWithAI = () => {
    if (selection) {
      setCurrentSelection(selection);
    }
    if (isLLMPanelCollapsed) {
      toggleLLMPanel();
    }
  };

  const handleHighlight = (color: HighlightColor) => {
    if (selection) {
      createHighlight(selection, color);
      clearSelection();
    }
  };

  const handleAskAI = (highlight: typeof activeHighlight) => {
    if (highlight) {
      setCurrentSelection({
        text: highlight.text,
        chapterId: highlight.chapterId,
        chapterTitle: highlight.chapterTitle,
        cfi: highlight.cfi,
        timestamp: Date.now(),
      });
    }
    if (isLLMPanelCollapsed) {
      toggleLLMPanel();
    }
  };

  return (
    <div className="epub-viewer">
      <TableOfContents
        chapters={chapters}
        currentChapter={currentChapter}
        isOpen={isTOCOpen}
        onClose={() => setIsTOCOpen(false)}
        onChapterSelect={handleChapterSelect}
      />

      <div className="epub-controls">
        <button className="btn-secondary" onClick={toggleTOC} title="Toggle Table of Contents">
          📑 {isTOCOpen ? 'Close' : 'Contents'}
        </button>
      </div>

      <div ref={wrapperRef} className="epub-content-wrapper">
        <div ref={viewerRef} className="epub-content" />
      </div>

      <div className="epub-navigation">
        <button
          className="nav-button nav-prev"
          onClick={onPrevPage}
          title="Previous page"
        >
          ← Previous
        </button>
        <button
          className="nav-button nav-next"
          onClick={onNextPage}
          title="Next page"
        >
          Next →
        </button>
      </div>

      {selection && popoverPosition && (
        <SelectionPopover
          selection={selection}
          position={popoverPosition}
          onQuoteToNotes={handleQuoteToNotes}
          onDiscussWithAI={handleDiscussWithAI}
          onHighlight={handleHighlight}
          onClose={clearSelection}
          onDismiss={dismissPopover}
        />
      )}

      {activeHighlight && activeHighlightPosition && (
        <HighlightPopover
          highlight={activeHighlight}
          position={activeHighlightPosition}
          onUpdateAnnotation={(id, annotation) => updateHighlight(id, { annotation })}
          onChangeColor={(id, color) => updateHighlight(id, { color })}
          onDelete={removeHighlight}
          onAskAI={handleAskAI}
          onClose={clearActiveHighlight}
        />
      )}
    </div>
  );
}
