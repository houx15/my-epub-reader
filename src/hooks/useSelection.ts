import { useState, useEffect, useCallback, useRef } from 'react';
import { getEPUBService } from '../services/epub';
import { useAppStore } from '../stores/appStore';
import type { Selection, Chapter } from '../types';
import type { Rendition } from 'epubjs';

interface UseSelectionReturn {
  selection: Selection | null;
  popoverPosition: { x: number; y: number } | null;
  clearSelection: () => void;
  dismissPopover: () => void;
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
  const { setCurrentSelection } = useAppStore();
  const selectionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const renditionRef = useRef<Rendition | null>(null);

  /**
   * Handle selection inside EPUB iframe
   */
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
          setCurrentSelection(null);
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
      }, 50);
    },
    [chapters, currentChapter, findChapterByHref, setCurrentSelection]
  );

  /**
   * Handle click outside to clear selection
   */
  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as HTMLElement;

    // Don't clear if clicking on popover
    if (target.closest('.selection-popover')) {
      return;
    }

    // Hide popover but keep selection for LLM context
    setSelection(null);
    setPopoverPosition(null);
  }, []);

  /**
   * Clear selection state on page change
   */
  const handleRelocated = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    const rendition = getEPUBService().getRendition();
    rendition?.getContents().forEach((content) => {
      content?.window?.getSelection()?.removeAllRanges();
    });
    setSelection(null);
    setPopoverPosition(null);
  }, [setCurrentSelection]);

  /**
   * Programmatically clear selection
   */
  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    const rendition = getEPUBService().getRendition();
    rendition?.getContents().forEach((content) => {
      content?.window?.getSelection()?.removeAllRanges();
    });
    setSelection(null);
    setPopoverPosition(null);
  }, [setCurrentSelection]);

  /**
   * Hide popover but keep current selection in store (for LLM usage)
   */
  const dismissPopover = useCallback(() => {
    setSelection(null);
    setPopoverPosition(null);
  }, []);

  /**
   * Attach event listeners
   */
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
  };
}
