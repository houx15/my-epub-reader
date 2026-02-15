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

interface ParsedCFI {
  basePath: string;
  startPath: string;
  endPath: string;
  startOffset: number;
  endOffset: number;
}

function parseCFI(cfi: string): ParsedCFI | null {
  if (!cfi || typeof cfi !== 'string') return null;

  const match = cfi.match(/^epubcfi\((.*)\)$/);
  if (!match) return null;

  const body = match[1];
  const parts: string[] = [];
  let current = '';
  let parenDepth = 0;

  for (const char of body) {
    if (char === '(') parenDepth++;
    if (char === ')') parenDepth--;
    if (char === ',' && parenDepth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  if (parts.length < 2) return null;

  const extractOffset = (part: string): number => {
    const offsetMatch = part.match(/:(\d+)$/);
    return offsetMatch ? parseInt(offsetMatch[1], 10) : 0;
  };

  const stripOffset = (part: string): string => {
    return part.replace(/:\d+$/, '');
  };

  return {
    basePath: parts[0],
    startPath: stripOffset(parts[1]),
    endPath: parts.length > 2 ? stripOffset(parts[2]) : stripOffset(parts[1]),
    startOffset: extractOffset(parts[1]),
    endOffset: parts.length > 2 ? extractOffset(parts[2]) : extractOffset(parts[1]),
  };
}

function getPathSteps(path: string): number[] {
  const steps: number[] = [];
  const parts = path.split('/');
  for (const part of parts) {
    const numMatch = part.match(/^(\d+)/);
    if (numMatch) {
      steps.push(parseInt(numMatch[1], 10));
    }
  }
  return steps;
}

function comparePathSteps(steps1: number[], steps2: number[]): number {
  const minLen = Math.min(steps1.length, steps2.length);
  for (let i = 0; i < minLen; i++) {
    if (steps1[i] < steps2[i]) return -1;
    if (steps1[i] > steps2[i]) return 1;
  }
  if (steps1.length < steps2.length) return -1;
  if (steps1.length > steps2.length) return 1;
  return 0;
}

interface CFIRange {
  basePath: string;
  startPath: string;
  endPath: string;
  startOffset: number;
  endOffset: number;
}

function getCFIRange(cfi: string): CFIRange | null {
  const parsed = parseCFI(cfi);
  if (!parsed) return null;

  const startSteps = [...getPathSteps(parsed.basePath), ...getPathSteps(parsed.startPath)];
  const endSteps = [...getPathSteps(parsed.basePath), ...getPathSteps(parsed.endPath)];

  const cmp = comparePathSteps(startSteps, endSteps);
  if (cmp < 0 || (cmp === 0 && parsed.startOffset <= parsed.endOffset)) {
    return {
      basePath: parsed.basePath,
      startPath: parsed.startPath,
      endPath: parsed.endPath,
      startOffset: parsed.startOffset,
      endOffset: parsed.endOffset,
    };
  }
  return {
    basePath: parsed.basePath,
    startPath: parsed.endPath,
    endPath: parsed.startPath,
    startOffset: parsed.endOffset,
    endOffset: parsed.startOffset,
  };
}

function compareCFIPoints(
  basePath1: string,
  path1: string,
  offset1: number,
  basePath2: string,
  path2: string,
  offset2: number
): number {
  if (basePath1 !== basePath2) {
    return basePath1.localeCompare(basePath2);
  }

  const steps1 = [...getPathSteps(basePath1), ...getPathSteps(path1)];
  const steps2 = [...getPathSteps(basePath2), ...getPathSteps(path2)];

  const pathCmp = comparePathSteps(steps1, steps2);
  if (pathCmp !== 0) return pathCmp;

  return offset1 - offset2;
}

function cfiRangesOverlap(cfi1: string, cfi2: string): boolean {
  const range1 = getCFIRange(cfi1);
  const range2 = getCFIRange(cfi2);

  if (!range1 || !range2) return false;

  const baseSteps1 = getPathSteps(range1.basePath);
  const baseSteps2 = getPathSteps(range2.basePath);

  const minBaseLen = Math.min(baseSteps1.length, baseSteps2.length);
  let commonBaseDepth = 0;
  for (let i = 0; i < minBaseLen; i++) {
    if (baseSteps1[i] === baseSteps2[i]) {
      commonBaseDepth++;
    } else {
      break;
    }
  }
  const maxBaseDepth = Math.max(baseSteps1.length, baseSteps2.length);
  if (commonBaseDepth < maxBaseDepth - 2) {
    return false;
  }

  const start1VsEnd2 = compareCFIPoints(
    range1.basePath,
    range1.startPath,
    range1.startOffset,
    range2.basePath,
    range2.endPath,
    range2.endOffset
  );

  const end1VsStart2 = compareCFIPoints(
    range1.basePath,
    range1.endPath,
    range1.endOffset,
    range2.basePath,
    range2.startPath,
    range2.startOffset
  );

  return start1VsEnd2 <= 0 && end1VsStart2 >= 0;
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
        if (cfiRangesOverlap(cfiRange, highlight.cfi)) {
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
