import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { TableOfContents } from './TableOfContents';
import { SelectionPopover } from './SelectionPopover';
import { HighlightPopover } from '../Highlights/HighlightPopover';
import { useSelection } from '../../hooks/useSelection';
import { useHighlights } from '../../hooks/useHighlights';
import { useAppStore } from '../../stores/appStore';
import type { HighlightColor } from '../../types';
import { BookLayout, BookLayoutRef } from '../BookLayout/BookLayout';
import './EPUBViewer.css';
import type { Chapter } from '../../types';

export interface EPUBViewerRef {
  triggerAnimation: (direction: 'forward' | 'backward') => void;
}

interface EPUBViewerProps {
  onRenderReady: (element: HTMLElement, width: number, height: number) => void;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onChapterSelect: (href: string) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  progress: number; // Real reading progress (0-1) from EPUB service
}

export const EPUBViewer = forwardRef<EPUBViewerRef, EPUBViewerProps>(function EPUBViewer(
  {
    onRenderReady,
    chapters,
    currentChapter,
    onChapterSelect,
    onNextPage,
    onPrevPage,
    progress,
  },
  ref
) {
  const bookLayoutRef = useRef<BookLayoutRef>(null);
  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const { requestNoteInsert, isLLMPanelCollapsed, toggleLLMPanel, currentBook, setCurrentSelection } = useAppStore();
  // Track the last book load time to force remount when same file is reopened
  // This ensures BookLayout re-initializes properly on same-file reload
  const [loadTimestamp, setLoadTimestamp] = useState(0);
  
  // Increment timestamp whenever currentBook reference changes (including same-file reload)
  useEffect(() => {
    if (currentBook?.id) {
      setLoadTimestamp(Date.now());
    }
  }, [currentBook]);

  const { selection, popoverPosition, clearSelection, dismissPopover, highlightPopoverData } = useSelection(
    { current: null } as React.RefObject<HTMLElement>, // BookLayout handles its own ref
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
  // Expose animation trigger to parent
  useImperativeHandle(ref, () => ({
    triggerAnimation: (direction: 'forward' | 'backward') => {
      bookLayoutRef.current?.triggerAnimation(direction);
    },
  }), []);

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
      {/* EPUB content container - now using BookLayout */}
      {currentBook && (
        <BookLayout
          key={`${currentBook.id}-${loadTimestamp}`}
          ref={bookLayoutRef}
          bookId={`${currentBook.id}-${loadTimestamp}`}
          onRenderReady={onRenderReady}
          chapters={chapters}
          currentChapter={currentChapter}
          onChapterSelect={handleChapterSelect}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
          progress={progress}
        />
      )}

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

      {highlightPopoverData && !activeHighlight && (
        <HighlightPopover
          highlight={highlightPopoverData.highlight}
          position={highlightPopoverData.position}
          onUpdateAnnotation={(id, annotation) => updateHighlight(id, { annotation })}
          onChangeColor={(id, color) => updateHighlight(id, { color })}
          onDelete={removeHighlight}
          onAskAI={handleAskAI}
          onClose={clearSelection}
        />
      )}
    </div>
  );
});
