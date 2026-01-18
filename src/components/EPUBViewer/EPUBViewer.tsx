import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TableOfContents } from './TableOfContents';
import { SelectionPopover } from './SelectionPopover';
import { useSelection } from '../../hooks/useSelection';
import { useAppStore } from '../../stores/appStore';
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

  // Reset isRendered when book changes
  useEffect(() => {
    if (currentBook?.id !== bookId) {
      setBookId(currentBook?.id || null);
      setIsRendered(false);
      isInitializingRef.current = false;
    }
  }, [currentBook?.id, bookId]);

  // Initialize EPUB rendering with actual dimensions
  useEffect(() => {
    if (viewerRef.current && wrapperRef.current && !isRendered) {
      if (isInitializingRef.current) {
        return;
      }

      isInitializingRef.current = true;

      // Wait multiple frames to ensure layout is fully complete
      const initRender = () => {
        if (viewerRef.current && wrapperRef.current) {
          const rect = wrapperRef.current.getBoundingClientRect();
          const width = Math.floor(rect.width);
          const height = Math.floor(rect.height);

          // Only render if we have valid dimensions
          if (width > 100 && height > 100) {
            Promise.resolve(onRenderReady(viewerRef.current, width, height))
              .then(() => {
                setIsRendered(true);
              })
              .finally(() => {
                isInitializingRef.current = false;
              });
          } else {
            setTimeout(initRender, 100);
          }
        }
      };

      // Start with a slight delay to allow layout to stabilize
      setTimeout(initRender, 50);
    }
  }, [onRenderReady, isRendered]);

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

      {/* EPUB content container */}
      <div ref={wrapperRef} className="epub-content-wrapper">
        <div ref={viewerRef} className="epub-content" />
      </div>

      {/* Navigation controls */}
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
}
