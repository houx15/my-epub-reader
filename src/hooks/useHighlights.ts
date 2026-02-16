import { useCallback, useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../stores/appStore';
import { getStorageService } from '../services/storage';
import { getEPUBService } from '../services/epub';
import type { Highlight, HighlightColor, Selection } from '../types';
import type { Rendition } from 'epubjs';

const HIGHLIGHT_STYLES: Record<HighlightColor, Record<string, string>> = {
  yellow: { 'fill': 'rgba(255, 235, 59, 0.62)', 'fill-opacity': '0.62' },
  green:  { 'fill': 'rgba(76, 175, 80, 0.52)', 'fill-opacity': '0.52' },
  blue:   { 'fill': 'rgba(33, 150, 243, 0.46)', 'fill-opacity': '0.46' },
  pink:   { 'fill': 'rgba(233, 30, 99, 0.44)', 'fill-opacity': '0.44' },
  orange: { 'fill': 'rgba(255, 152, 0, 0.56)', 'fill-opacity': '0.56' },
  // Pen styles use epub.js underline annotations.
  'pencil': { 'stroke': 'rgba(100, 100, 100, 0.9)', 'stroke-width': '2', 'stroke-linecap': 'round' },
  'red-pen': { 'stroke': 'rgba(220, 53, 69, 0.95)', 'stroke-width': '2.4', 'stroke-linecap': 'round' },
  'blue-pen': { 'stroke': 'rgba(13, 110, 253, 0.95)', 'stroke-width': '2.4', 'stroke-linecap': 'round' },
};

const PEN_COLORS = new Set<HighlightColor>(['pencil', 'red-pen', 'blue-pen']);

const getAnnotationType = (color: HighlightColor): 'highlight' | 'underline' =>
  PEN_COLORS.has(color) ? 'underline' : 'highlight';

const getAnnotationClassName = (color: HighlightColor): string =>
  PEN_COLORS.has(color) ? 'epub-underline' : 'epub-highlight';

interface HighlightClickData {
  id: string;
}

interface UseHighlightsReturn {
  highlights: Highlight[];
  createHighlight: (selection: Selection, color: HighlightColor, annotation?: string) => Highlight;
  updateHighlight: (id: string, updates: Partial<Pick<Highlight, 'color' | 'annotation'>>) => void;
  removeHighlight: (id: string) => void;
  renderHighlights: () => void;
  activeHighlight: Highlight | null;
  setActiveHighlight: (highlight: Highlight | null) => void;
  activeHighlightPosition: { x: number; y: number } | null;
  loadHighlightsForBook: (bookId: string) => Promise<void>;
  onHighlightClick: (highlight: Highlight, position: { x: number; y: number }) => void;
  clearActiveHighlight: () => void;
}

export function useHighlights(): UseHighlightsReturn {
  const {
    highlights,
    addHighlight,
    updateHighlight: storeUpdateHighlight,
    removeHighlight: storeRemoveHighlight,
    currentBook,
  } = useAppStore();

  const [activeHighlight, setActiveHighlight] = useState<Highlight | null>(null);
  const [activeHighlightPosition, setActiveHighlightPosition] = useState<{ x: number; y: number } | null>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightsRef = useRef<Highlight[]>(highlights);
  const currentBookIdRef = useRef<string | null>(null);
  const registeredClickHandlersRef = useRef<Map<string, (e: MouseEvent) => void>>(new Map());
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    highlightsRef.current = highlights;

    if (activeHighlight) {
      const updatedHighlight = highlights.find((h) => h.id === activeHighlight.id);
      if (updatedHighlight && JSON.stringify(updatedHighlight) !== JSON.stringify(activeHighlight)) {
        setActiveHighlight(updatedHighlight);
      }
    }
  }, [highlights, activeHighlight]);

  useEffect(() => {
    currentBookIdRef.current = currentBook?.id || null;
  }, [currentBook?.id]);

  const debouncedSave = useCallback(async (bookId: string, highlightsToSave: Highlight[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const storage = await getStorageService();
        await storage.saveHighlights(bookId, highlightsToSave);
      } catch (error) {
        console.error('Failed to save highlights:', error);
      }
    }, 500);
  }, []);

  const createHighlightClickCallback = useCallback(
    (highlightId: string) => {
      return (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const highlightElement = target.closest('.epub-highlight, .epub-underline');
        if (!highlightElement) return;

        const highlight = highlightsRef.current.find((h) => h.id === highlightId);
        if (!highlight) return;

        const rect = highlightElement.getBoundingClientRect();
        const ownerDoc = highlightElement.ownerDocument;
        const frameElement = ownerDoc?.defaultView?.frameElement as HTMLElement | null;
        const frameRect = frameElement?.getBoundingClientRect();
        const offsetLeft = frameRect?.left ?? 0;
        const offsetTop = frameRect?.top ?? 0;

        const position = {
          x: offsetLeft + rect.left + rect.width / 2,
          y: offsetTop + rect.bottom,
        };

        setActiveHighlight(highlight);
        setActiveHighlightPosition(position);
      };
    },
    []
  );

  const createHighlight = useCallback(
    (selection: Selection, color: HighlightColor, annotation: string = ''): Highlight => {
      if (!currentBook) {
        throw new Error('No book loaded');
      }

      const now = Date.now();
      const highlight: Highlight = {
        id: uuidv4(),
        bookId: currentBook.id,
        cfi: selection.cfi,
        text: selection.text,
        color,
        annotation,
        chapterId: selection.chapterId,
        chapterTitle: selection.chapterTitle,
        createdAt: now,
        updatedAt: now,
      };

      addHighlight(highlight);

      const rendition = getEPUBService().getRendition();
      if (rendition) {
        const clickHandler = createHighlightClickCallback(highlight.id);
        registeredClickHandlersRef.current.set(highlight.id, clickHandler);
        const annotationType = getAnnotationType(highlight.color);
        const annotationClass = getAnnotationClassName(highlight.color);

        rendition.annotations[annotationType](
          highlight.cfi,
          { id: highlight.id } as HighlightClickData,
          clickHandler,
          annotationClass,
          HIGHLIGHT_STYLES[highlight.color]
        );
      }

      debouncedSave(currentBook.id, [...highlightsRef.current, highlight]);

      return highlight;
    },
    [currentBook, addHighlight, debouncedSave, createHighlightClickCallback]
  );

  const removeHighlightFromRendition = useCallback((cfi: string, type?: 'highlight' | 'underline', highlightId?: string) => {
    const rendition = getEPUBService().getRendition();
    if (rendition) {
      if (type) {
        rendition.annotations.remove(cfi, type);
      } else {
        rendition.annotations.remove(cfi, 'highlight');
        rendition.annotations.remove(cfi, 'underline');
      }
    }
    if (highlightId) {
      registeredClickHandlersRef.current.delete(highlightId);
    }
  }, []);

  const updateHighlight = useCallback(
    (id: string, updates: Partial<Pick<Highlight, 'color' | 'annotation'>>) => {
      const highlight = highlightsRef.current.find((h) => h.id === id);
      if (!highlight || !currentBook) return;

      storeUpdateHighlight(id, { ...updates, updatedAt: Date.now() });

      if (updates.color && updates.color !== highlight.color) {
        removeHighlightFromRendition(highlight.cfi, getAnnotationType(highlight.color), highlight.id);

        const rendition = getEPUBService().getRendition();
        if (rendition) {
          const clickHandler = createHighlightClickCallback(highlight.id);
          registeredClickHandlersRef.current.set(highlight.id, clickHandler);
          const annotationType = getAnnotationType(updates.color);
          const annotationClass = getAnnotationClassName(updates.color);

          rendition.annotations[annotationType](
            highlight.cfi,
            { id: highlight.id } as HighlightClickData,
            clickHandler,
            annotationClass,
            HIGHLIGHT_STYLES[updates.color]
          );
        }
      }

      const updatedHighlights = highlightsRef.current.map((h) =>
        h.id === id ? { ...h, ...updates, updatedAt: Date.now() } : h
      );
      debouncedSave(currentBook.id, updatedHighlights);
    },
    [currentBook, storeUpdateHighlight, removeHighlightFromRendition, debouncedSave, createHighlightClickCallback]
  );

  const removeHighlight = useCallback(
    (id: string) => {
      const highlight = highlightsRef.current.find((h) => h.id === id);
      if (!highlight || !currentBook) return;

      removeHighlightFromRendition(highlight.cfi, getAnnotationType(highlight.color), highlight.id);
      storeRemoveHighlight(id);

      const updatedHighlights = highlightsRef.current.filter((h) => h.id !== id);
      debouncedSave(currentBook.id, updatedHighlights);
    },
    [currentBook, storeRemoveHighlight, removeHighlightFromRendition, debouncedSave]
  );

  const renderHighlights = useCallback(() => {
    const rendition = getEPUBService().getRendition();
    if (!rendition || !currentBook) return;

    renditionRef.current = rendition;

    const bookHighlights = highlightsRef.current.filter((h) => h.bookId === currentBook.id);

    bookHighlights.forEach((highlight) => {
      try {
        rendition.annotations.remove(highlight.cfi, getAnnotationType(highlight.color));
      } catch {
        // Annotation might not exist yet
      }
    });

    registeredClickHandlersRef.current.clear();

    bookHighlights.forEach((highlight) => {
      try {
        const clickHandler = createHighlightClickCallback(highlight.id);
        registeredClickHandlersRef.current.set(highlight.id, clickHandler);
        const annotationType = getAnnotationType(highlight.color);
        const annotationClass = getAnnotationClassName(highlight.color);

        rendition.annotations[annotationType](
          highlight.cfi,
          { id: highlight.id } as HighlightClickData,
          clickHandler,
          annotationClass,
          HIGHLIGHT_STYLES[highlight.color]
        );
      } catch (error) {
        console.warn('Failed to render highlight:', highlight.id, error);
      }
    });
  }, [currentBook, createHighlightClickCallback]);

  const loadHighlightsForBook = useCallback(async (bookId: string) => {
    const bookIdAtLoadStart = bookId;

    try {
      const storage = await getStorageService();
      const loadedHighlights = await storage.loadHighlights(bookId);

      if (currentBookIdRef.current !== bookIdAtLoadStart) {
        return;
      }

      useAppStore.getState().setHighlights(loadedHighlights);

      setTimeout(() => {
        if (currentBookIdRef.current === bookIdAtLoadStart) {
          renderHighlights();
        }
      }, 0);
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  }, [renderHighlights]);

  const onHighlightClick = useCallback((highlight: Highlight, position: { x: number; y: number }) => {
    setActiveHighlight(highlight);
    setActiveHighlightPosition(position);
  }, []);

  const clearActiveHighlight = useCallback(() => {
    setActiveHighlight(null);
    setActiveHighlightPosition(null);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let retryId: number | null = null;
    let renderedHandler: (() => void) | null = null;

    const setupHighlightSystem = () => {
      if (isCancelled) return;

      const rendition = getEPUBService().getRendition();
      if (!rendition) {
        retryId = window.setTimeout(setupHighlightSystem, 100);
        return;
      }

      renditionRef.current = rendition;

      renderedHandler = () => {
        renderHighlights();
      };

      rendition.on('rendered', renderedHandler);
      cleanupFunctionsRef.current.push(() => {
        rendition.off('rendered', renderedHandler);
      });
    };

    setupHighlightSystem();

    return () => {
      isCancelled = true;
      if (retryId) {
        clearTimeout(retryId);
      }

      cleanupFunctionsRef.current.forEach((cleanup) => cleanup());
      cleanupFunctionsRef.current = [];

      registeredClickHandlersRef.current.clear();
    };
  }, [renderHighlights]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    highlights,
    createHighlight,
    updateHighlight,
    removeHighlight,
    renderHighlights,
    activeHighlight,
    setActiveHighlight,
    activeHighlightPosition,
    loadHighlightsForBook,
    onHighlightClick,
    clearActiveHighlight,
  };
}
