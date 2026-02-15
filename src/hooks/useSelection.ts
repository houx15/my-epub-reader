import { useState, useEffect, useCallback, useRef } from 'react';
import { getEPUBService } from '../services/epub';
import { useAppStore } from '../stores/appStore';
import type { Selection, Chapter, Highlight } from '../types';
import type { Rendition } from 'epubjs';

interface HighlightPopoverData {
  highlight: Highlight;
  position: { x: number; y: number };
}

interface UseSelectionReturn {
  selection: Selection | null;
  popoverPosition: { x: number; y: number } | null;
  clearSelection: () => void;
  dismissPopover: () => void;
  highlightPopoverData: HighlightPopoverData | null;
}

function forEachContent(rendition: Rendition | null, callback: (content: any) => void): void {
  if (!rendition) return;
  const contents = rendition.getContents();
  if (Array.isArray(contents)) {
    contents.forEach(callback);
  } else if (contents) {
    callback(contents);
  }
}

/**
 * React hook for handling text selection in EPUB viewer
 */
export function useSelection(
  _containerRef: React.RefObject<HTMLElement>,
  currentChapter: Chapter | null,
  chapters: Chapter[]
): UseSelectionReturn {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null);
  const [highlightPopoverData, setHighlightPopoverData] = useState<HighlightPopoverData | null>(null);
  const { setCurrentSelection, highlights } = useAppStore();
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  const findChapterByHref = useCallback((items: Chapter[], href: string): Chapter | null => {
    const normalizedHref = href.split('#')[0];
    for (const item of items) {
      const itemHref = item.href.split('#')[0];
      if (itemHref === normalizedHref) {
        return item;
      }
      if (item.children) {
        const found = findChapterByHref(item.children, href);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const checkForOverlappingHighlight = useCallback(
    (cfiRange: string): Highlight | null => {
      if (!highlights || highlights.length === 0) return null;

      for (const highlight of highlights) {
        if (cfiRange === highlight.cfi) {
          return highlight;
        }
      }

      return null;
    },
    [highlights]
  );

  const getIframeOffset = useCallback(() => {
    const rendition = getEPUBService().getRendition();
    if (!rendition) return { left: 0, top: 0 };

    let offset = { left: 0, top: 0 };
    forEachContent(rendition, (content: any) => {
      const doc = content?.document;
      if (doc) {
        const frameElement = doc.defaultView?.frameElement as HTMLElement | null;
        if (frameElement) {
          const rect = frameElement.getBoundingClientRect();
          offset = { left: rect.left, top: rect.top };
        }
      }
    });
    return offset;
  }, []);

  const handleSelected = useCallback(
    (cfiRange: string, contents: any) => {
      if (!currentChapter) {
        return;
      }

      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }

      selectionTimeoutRef.current = setTimeout(() => {
        const frameWindow = contents?.window;
        const frameDocument = contents?.document;
        const windowSelection = frameWindow?.getSelection?.();

        if (!windowSelection || windowSelection.isCollapsed || !windowSelection.toString().trim()) {
          setSelection(null);
          setPopoverPosition(null);
          setHighlightPopoverData(null);
          setCurrentSelection(null);
          return;
        }

        const overlappingHighlight = checkForOverlappingHighlight(cfiRange);
        if (overlappingHighlight) {
          const range = windowSelection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const iframeOffset = getIframeOffset();

          setHighlightPopoverData({
            highlight: overlappingHighlight,
            position: {
              x: iframeOffset.left + rect.left + rect.width / 2,
              y: iframeOffset.top + rect.top,
            },
          });
          setSelection(null);
          setPopoverPosition(null);
          return;
        }

        const selectedText = windowSelection.toString().trim();
        const range = windowSelection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const frameElement = frameDocument?.defaultView?.frameElement as HTMLElement | null;
        if (!frameElement) {
          return;
        }

        const frameRect = frameElement.getBoundingClientRect();
        const popoverX = frameRect.left + rect.left + rect.width / 2;
        const popoverY = frameRect.top + rect.top - 10;

        const epubService = getEPUBService();
        const location = epubService.getCurrentLocation();
        const chapterByHref = location?.href ? findChapterByHref(chapters, location.href) : null;
        const activeChapter = chapterByHref || currentChapter;

        const newSelection: Selection = {
          text: selectedText,
          chapterId: activeChapter.id,
          chapterTitle: activeChapter.title,
          cfi: cfiRange,
          timestamp: Date.now(),
        };

        setSelection(newSelection);
        setPopoverPosition({ x: popoverX, y: popoverY });
        setHighlightPopoverData(null);
      }, 50);
    },
    [chapters, currentChapter, findChapterByHref, setCurrentSelection, checkForOverlappingHighlight, getIframeOffset]
  );

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;

    if (target.closest('.selection-popover') || target.closest('.highlight-popover')) {
      return;
    }

    setSelection(null);
    setPopoverPosition(null);
    setHighlightPopoverData(null);
  }, []);

  const handleRelocated = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    const rendition = getEPUBService().getRendition();
    forEachContent(rendition, (content: any) => {
      content?.window?.getSelection()?.removeAllRanges();
    });
    setSelection(null);
    setPopoverPosition(null);
    setHighlightPopoverData(null);
  }, [setCurrentSelection]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    const rendition = getEPUBService().getRendition();
    forEachContent(rendition, (content: any) => {
      content?.window?.getSelection()?.removeAllRanges();
    });
    setSelection(null);
    setPopoverPosition(null);
    setHighlightPopoverData(null);
  }, [setCurrentSelection]);

  const dismissPopover = useCallback(() => {
    setSelection(null);
    setPopoverPosition(null);
    setHighlightPopoverData(null);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let retryId: number | null = null;

    const attach = () => {
      if (isCancelled) return;

      const rendition = getEPUBService().getRendition();
      if (!rendition) {
        retryId = window.setTimeout(attach, 100);
        return;
      }

      renditionRef.current = rendition;
      rendition.on('selected', handleSelected);
      rendition.on('relocated', handleRelocated);
      document.addEventListener('mousedown', handleClickOutside);
    };

    attach();

    return () => {
      isCancelled = true;
      if (retryId) {
        clearTimeout(retryId);
      }

      if (renditionRef.current && (renditionRef.current as any).off) {
        (renditionRef.current as any).off('selected', handleSelected);
        (renditionRef.current as any).off('relocated', handleRelocated);
      }

      document.removeEventListener('mousedown', handleClickOutside);

      if (selectionTimeoutRef.current) {
        clearTimeout(selectionTimeoutRef.current);
      }
    };
  }, [handleSelected, handleRelocated, handleClickOutside]);

  return {
    selection,
    popoverPosition,
    clearSelection,
    dismissPopover,
    highlightPopoverData,
  };
}
