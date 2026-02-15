import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { TableOfContents } from './TableOfContents';
import { SelectionPopover } from './SelectionPopover';
import { HighlightPopover } from '../Highlights/HighlightPopover';
import { useSelection } from '../../hooks/useSelection';
import { useHighlights } from '../../hooks/useHighlights';
import { useAppStore } from '../../stores/appStore';
import type { HighlightColor, Highlight } from '../../types';
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
  progress: number;
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
  const { currentBook, setPanelMode, setCurrentSelection, noteContent, setNoteContent } = useAppStore();
  const [loadTimestamp, setLoadTimestamp] = useState(0);
  
  useEffect(() => {
    if (currentBook?.id) {
      setLoadTimestamp(Date.now());
    }
  }, [currentBook]);

  const { selection, popoverPosition, clearSelection, dismissPopover, highlightPopoverData } = useSelection(
    { current: null } as React.RefObject<HTMLElement>,
    currentChapter,
    chapters
  );

  const {
    createHighlight,
    updateHighlight,
    removeHighlight,
    activeHighlight,
    activeHighlightPosition,
    loadHighlightsForBook,
    clearActiveHighlight,
  } = useHighlights();

  useEffect(() => {
    if (currentBook?.id) {
      loadHighlightsForBook(currentBook.id);
    }
  }, [currentBook?.id, loadHighlightsForBook]);

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
    setNoteContent(noteContent + '\n\n' + formattedQuote + '\n\n');
    clearSelection();
  };

  const handleDiscussWithAI = () => {
    if (selection) {
      setCurrentSelection(selection);
    }
    setPanelMode('ai');
    clearSelection();
  };

  const handleHighlight = (color: HighlightColor) => {
    if (selection) {
      createHighlight(selection, color);
      clearSelection();
    }
  };

  const handleAskAI = (highlight: Highlight | null) => {
    if (highlight) {
      setCurrentSelection({
        text: highlight.text,
        chapterId: highlight.chapterId,
        chapterTitle: highlight.chapterTitle,
        cfi: highlight.cfi,
        timestamp: Date.now(),
      });
    }
    setPanelMode('ai');
    clearActiveHighlight();
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
