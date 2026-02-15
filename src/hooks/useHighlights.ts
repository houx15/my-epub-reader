import { useCallback, useRef, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAppStore } from '../stores/appStore';
import { getStorageService } from '../services/storage';
import { getEPUBService } from '../services/epub';
import type { Highlight, HighlightColor, Selection } from '../types';
import type { Rendition, Contents } from 'epubjs';

const HIGHLIGHT_STYLES: Record<HighlightColor, Record<string, string>> = {
  yellow: { 'fill': 'rgba(255, 235, 59, 0.35)', 'fill-opacity': '0.35', 'mix-blend-mode': 'multiply' },
  green:  { 'fill': 'rgba(76, 175, 80, 0.3)', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
  blue:   { 'fill': 'rgba(33, 150, 243, 0.25)', 'fill-opacity': '0.25', 'mix-blend-mode': 'multiply' },
  pink:   { 'fill': 'rgba(233, 30, 99, 0.25)', 'fill-opacity': '0.25', 'mix-blend-mode': 'multiply' },
  orange: { 'fill': 'rgba(255, 152, 0, 0.3)', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
};

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
  const clickHandlerRef = useRef<((event: MouseEvent) => void) | null>(null);

  useEffect(() => {
    highlightsRef.current = highlights;
  }, [highlights]);

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
        rendition.annotations.highlight(
          highlight.cfi,
          { id: highlight.id } as HighlightClickData,
          () => {},
          'epub-highlight',
          HIGHLIGHT_STYLES[highlight.color]
        );
      }

      debouncedSave(currentBook.id, [...highlightsRef.current, highlight]);

      return highlight;
    },
    [currentBook, addHighlight, debouncedSave]
  );

  const removeHighlightFromRendition = useCallback((cfi: string) => {
    const rendition = getEPUBService().getRendition();
    if (rendition) {
      rendition.annotations.remove(cfi, 'highlight');
    }
  }, []);

  const updateHighlight = useCallback(
    (id: string, updates: Partial<Pick<Highlight, 'color' | 'annotation'>>) => {
      const highlight = highlightsRef.current.find((h) => h.id === id);
      if (!highlight || !currentBook) return;

      storeUpdateHighlight(id, { ...updates, updatedAt: Date.now() });

      if (updates.color && updates.color !== highlight.color) {
        removeHighlightFromRendition(highlight.cfi);
        
        const rendition = getEPUBService().getRendition();
        if (rendition) {
          rendition.annotations.highlight(
            highlight.cfi,
            { id: highlight.id } as HighlightClickData,
            () => {},
            'epub-highlight',
            HIGHLIGHT_STYLES[updates.color]
          );
        }
      }

      const updatedHighlights = highlightsRef.current.map((h) =>
        h.id === id ? { ...h, ...updates, updatedAt: Date.now() } : h
      );
      debouncedSave(currentBook.id, updatedHighlights);
    },
    [currentBook, storeUpdateHighlight, removeHighlightFromRendition, debouncedSave]
  );

  const removeHighlight = useCallback(
    (id: string) => {
      const highlight = highlightsRef.current.find((h) => h.id === id);
      if (!highlight || !currentBook) return;

      removeHighlightFromRendition(highlight.cfi);
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
        rendition.annotations.remove(highlight.cfi, 'highlight');
      } catch {
        // Annotation might not exist yet
      }
    });

    bookHighlights.forEach((highlight) => {
      try {
        rendition.annotations.highlight(
          highlight.cfi,
          { id: highlight.id } as HighlightClickData,
          () => {},
          'epub-highlight',
          HIGHLIGHT_STYLES[highlight.color]
        );
      } catch (error) {
        console.warn('Failed to render highlight:', highlight.id, error);
      }
    });
  }, [currentBook]);

  const loadHighlightsForBook = useCallback(async (bookId: string) => {
    try {
      const storage = await getStorageService();
      const loadedHighlights = await storage.loadHighlights(bookId);
      useAppStore.getState().setHighlights(loadedHighlights);
    } catch (error) {
      console.error('Failed to load highlights:', error);
    }
  }, []);

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

    const setupHighlightClickHandler = () => {
      if (isCancelled) return;

      const rendition = getEPUBService().getRendition();
      if (!rendition) {
        retryId = window.setTimeout(setupHighlightClickHandler, 100);
        return;
      }

      renditionRef.current = rendition;

      const handleAnnotationClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        const highlightElement = target.closest('.epub-highlight');
        if (highlightElement) {
          const annotationData = (highlightElement as any).annotationData;
          if (annotationData?.id) {
            const highlight = highlightsRef.current.find((h) => h.id === annotationData.id);
            if (highlight) {
              const rect = highlightElement.getBoundingClientRect();
              onHighlightClick(highlight, {
                x: rect.left + rect.width / 2,
                y: rect.top,
              });
            }
          }
        }
      };

      clickHandlerRef.current = handleAnnotationClick;
      
      const contents = rendition.getContents();
      if (Array.isArray(contents)) {
        contents.forEach((content: Contents) => {
          content.document?.addEventListener('click', handleAnnotationClick);
        });
      } else if (contents) {
        contents.document?.addEventListener('click', handleAnnotationClick);
      }

      rendition.on('rendered', () => {
        renderHighlights();
        const newContents = rendition.getContents();
        if (Array.isArray(newContents)) {
          newContents.forEach((content: Contents) => {
            content.document?.addEventListener('click', handleAnnotationClick);
          });
        } else if (newContents) {
          newContents.document?.addEventListener('click', handleAnnotationClick);
        }
      });
    };

    setupHighlightClickHandler();

    return () => {
      isCancelled = true;
      if (retryId) {
        clearTimeout(retryId);
      }
    };
  }, [renderHighlights, onHighlightClick]);

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
