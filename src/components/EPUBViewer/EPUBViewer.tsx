import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { TableOfContents } from './TableOfContents';
import { SelectionPopover } from './SelectionPopover';
import { useSelection } from '../../hooks/useSelection';
import { useAppStore } from '../../stores/appStore';
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
}

export const EPUBViewer = forwardRef<EPUBViewerRef, EPUBViewerProps>(function EPUBViewer(
  {
    onRenderReady,
    chapters,
    currentChapter,
    onChapterSelect,
    onNextPage,
    onPrevPage,
  },
  ref
) {
  const bookLayoutRef = useRef<BookLayoutRef>(null);
  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const { requestNoteInsert, isLLMPanelCollapsed, toggleLLMPanel, currentBook, setCurrentSelection } = useAppStore();
  
  // Create a unique key that changes when the book is reloaded
  // Use both bookId and a reload counter to force remount on re-open
  const [reloadCounter, setReloadCounter] = useState(0);
  
  useEffect(() => {
    if (currentBook?.id) {
      // Increment reload counter whenever book changes
      setReloadCounter(prev => prev + 1);
    }
  }, [currentBook?.id]);

  const { selection, popoverPosition, clearSelection, dismissPopover } = useSelection(
    { current: null } as React.RefObject<HTMLElement>, // BookLayout handles its own ref
    currentChapter,
    chapters
  );

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
    setIsTOCOpen(false); // Close TOC after selection
  };

  /**
   * Handle quote to notes
   */
  const handleQuoteToNotes = (formattedQuote: string) => {
    requestNoteInsert(formattedQuote);
  };

  /**
   * Handle discuss with AI
   */
  const handleDiscussWithAI = () => {
    if (selection) {
      setCurrentSelection(selection);
    }
    // Open LLM panel if collapsed
    if (isLLMPanelCollapsed) {
      toggleLLMPanel();
    }
  };

  // Calculate progress based on current chapter
  const progress = currentBook && chapters.length > 0 && currentChapter
    ? chapters.findIndex(ch => ch.id === currentChapter.id) / Math.max(1, chapters.length - 1)
    : 0;

  return (
    <div className="epub-viewer">
      {/* Table of Contents */}
      <TableOfContents
        chapters={chapters}
        currentChapter={currentChapter}
        isOpen={isTOCOpen}
        onClose={() => setIsTOCOpen(false)}
        onChapterSelect={handleChapterSelect}
      />

      {/* Header controls */}
      <div className="epub-controls">
        <button className="btn-secondary" onClick={toggleTOC} title="Toggle Table of Contents">
          📑 {isTOCOpen ? 'Close' : 'Contents'}
        </button>
      </div>

      {/* EPUB content container - now using BookLayout */}
      {currentBook && (
        <BookLayout
          key={`${currentBook.id}-${reloadCounter}`}
          ref={bookLayoutRef}
          bookId={`${currentBook.id}-${reloadCounter}`}
          onRenderReady={onRenderReady}
          chapters={chapters}
          currentChapter={currentChapter}
          onChapterSelect={handleChapterSelect}
          onNextPage={onNextPage}
          onPrevPage={onPrevPage}
          progress={progress}
        />
      )}

      {/* Selection popover */}
      {selection && popoverPosition && (
        <SelectionPopover
          selection={selection}
          position={popoverPosition}
          onQuoteToNotes={handleQuoteToNotes}
          onDiscussWithAI={handleDiscussWithAI}
          onClose={clearSelection}
          onDismiss={dismissPopover}
        />
      )}
    </div>
  );
});
