import { useState, useCallback, useRef, useEffect } from 'react';
import { getEPUBService, resetEPUBService } from '../services/epub';
import { getStorageService } from '../services/storage';
import { useAppStore } from '../stores/appStore';
import type { Book, Chapter } from '../types';

interface UseEPUBReturn {
  currentBook: Book | null;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  isLoading: boolean;
  error: Error | null;
  loadBook: (filePath: string) => Promise<void>;
  navigateToChapter: (href: string) => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  goToLocation: (cfi: string) => Promise<void>;
  getCurrentCFI: () => string | null;
  renderToElement: (element: HTMLElement, width?: number, height?: number) => Promise<void>;
  setEPUBTheme: (theme: 'light' | 'dark') => void;
  progress: { currentPage: number; totalPages: number; percentage: number };
}

/**
 * Get effective theme from app theme setting
 */
function getEffectiveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * React hook for EPUB book management
 */
export function useEPUB(): UseEPUBReturn {
  const { currentBook, setCurrentBook, setIsLoadingBook, theme } = useAppStore();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState({ currentPage: 0, totalPages: 0, percentage: 0 });

  const epubService = useRef(getEPUBService());
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedCFIRef = useRef<string | null>(null);

  const normalizeHref = useCallback((href: string): string => href.split('#')[0], []);

  const findChapterByHref = useCallback((items: Chapter[], href: string): Chapter | null => {
    const normalized = normalizeHref(href);
    for (const item of items) {
      if (normalizeHref(item.href) === normalized) {
        return item;
      }
      if (item.children && item.children.length > 0) {
        const found = findChapterByHref(item.children, href);
        if (found) return found;
      }
    }
    return null;
  }, [normalizeHref]);

  /**
   * Load a book from file path
   */
  const loadBook = useCallback(async (filePath: string) => {
    setIsLoading(true);
    setIsLoadingBook(true);
    setError(null);
    // Reset progress when loading a new book
    setProgress({ currentPage: 0, totalPages: 0, percentage: 0 });

    try {
      // Clean up previous book if any
      resetEPUBService();
      epubService.current = getEPUBService();

      // Load the EPUB
      const book = await epubService.current.loadEPUB(filePath);
      const storage = await getStorageService();
      const storedMeta = await storage.loadBookMetadata(book.id);
      if (storedMeta?.lastReadPosition?.cfi) {
        book.lastReadPosition = storedMeta.lastReadPosition;
      }

      // Update state
      setCurrentBook(book);
      setChapters(book.toc);

      // Set first chapter as current
      if (book.toc.length > 0) {
        setCurrentChapter(book.toc[0]);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load book');
      setError(error);
      console.error('Error loading book:', error);
    } finally {
      setIsLoading(false);
      setIsLoadingBook(false);
    }
  }, [setCurrentBook, setIsLoadingBook]);

  /**
   * Set EPUB theme
   */
  const setEPUBTheme = useCallback((newTheme: 'light' | 'dark') => {
    epubService.current.setTheme(newTheme);
  }, []);

  /**
   * Sync EPUB theme with app theme
   */
  useEffect(() => {
    if (currentBook) {
      const effectiveTheme = getEffectiveTheme(theme);
      epubService.current.setTheme(effectiveTheme);
    }
  }, [theme, currentBook]);

  /**
   * Listen for system theme changes when in system mode
   */
  useEffect(() => {
    if (theme !== 'system' || !currentBook) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      epubService.current.setTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, currentBook]);

  /**
   * Update progress from EPUB service
   */
  const updateProgress = useCallback(() => {
    const currentProgress = epubService.current.getProgress();
    setProgress(currentProgress);
  }, []);

  /**
   * Render book to a container element
   */
  const renderToElement = useCallback(async (element: HTMLElement, width?: number, height?: number) => {
    if (!currentBook) {
      throw new Error('No book loaded');
    }

    try {
      await epubService.current.renderToElement(element, width, height);

      // Apply current theme
      const effectiveTheme = getEffectiveTheme(theme);
      epubService.current.setTheme(effectiveTheme);

      // Register relocation listener BEFORE navigating to last position
      // This ensures we capture the initial location update
      epubService.current.onRelocated(async (location) => {
        // Update progress on every relocation
        updateProgress();

        if (location.href) {
          const chapter = findChapterByHref(chapters, location.href);
          if (chapter) {
            setCurrentChapter(chapter);
          }
        }

        if (!currentBook) return;
        if (!location.cfi || location.cfi === lastSavedCFIRef.current) {
          return;
        }

        const updatedBook = {
          ...currentBook,
          lastReadPosition: {
            ...currentBook.lastReadPosition,
            cfi: location.cfi,
          },
        };

        setCurrentBook(updatedBook);
        lastSavedCFIRef.current = location.cfi;

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(async () => {
          try {
            const storage = await getStorageService();
            await storage.saveBookMetadata(updatedBook);
          } catch (err) {
            console.warn('Failed to save reading position:', err);
          }
        }, 500);
      });

      // Navigate to last read position after listener is registered
      if (currentBook.lastReadPosition.cfi) {
        await epubService.current.goToLocation(currentBook.lastReadPosition.cfi);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to render book');
      setError(error);
      console.error('Error rendering book:', error);
      throw error;
    }
  }, [currentBook, theme, updateProgress, findChapterByHref, chapters]);

  /**
   * Navigate to a chapter
   */
  const navigateToChapter = useCallback(async (href: string) => {
    if (!currentBook) {
      throw new Error('No book loaded');
    }

    try {
      await epubService.current.goToChapter(href);

      // Find and set current chapter
      const chapter = findChapterByHref(chapters, href);
      if (chapter) {
        setCurrentChapter(chapter);
      }

      // Save reading position
      const location = epubService.current.getCurrentLocation();
      if (location) {
        const updatedBook = {
          ...currentBook,
          lastReadPosition: {
            chapterIndex: 0, // TODO: Calculate actual chapter index
            cfi: location.cfi,
          },
        };
        setCurrentBook(updatedBook);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to navigate to chapter');
      setError(error);
      console.error('Error navigating to chapter:', error);
    }
  }, [currentBook, chapters, setCurrentBook, findChapterByHref]);



  /**
   * Go to a specific CFI location
   */
  const goToLocation = useCallback(async (cfi: string) => {
    if (!currentBook) {
      return;
    }

    try {
      await epubService.current.goToLocation(cfi);
    } catch (err) {
      console.error('Error going to location:', err);
    }
  }, [currentBook]);

  /**
   * Get current CFI location
   */
  const getCurrentCFI = useCallback((): string | null => {
    const location = epubService.current.getCurrentLocation();
    return location ? location.cfi : null;
  }, []);

  /**
   * Go to next page with progress update
   */
  const nextPage = useCallback(async () => {
    if (!currentBook) {
      return;
    }

    try {
      await epubService.current.nextPage();
      updateProgress();

      // Update reading position
      const location = epubService.current.getCurrentLocation();
      if (location) {
        const updatedBook = {
          ...currentBook,
          lastReadPosition: {
            ...currentBook.lastReadPosition,
            cfi: location.cfi,
          },
        };
        setCurrentBook(updatedBook);
      }
    } catch (err) {
      console.error('Error going to next page:', err);
    }
  }, [currentBook, setCurrentBook, updateProgress]);

  /**
   * Go to previous page with progress update
   */
  const prevPage = useCallback(async () => {
    if (!currentBook) {
      return;
    }

    try {
      await epubService.current.prevPage();
      updateProgress();

      // Update reading position
      const location = epubService.current.getCurrentLocation();
      if (location) {
        const updatedBook = {
          ...currentBook,
          lastReadPosition: {
            ...currentBook.lastReadPosition,
            cfi: location.cfi,
          },
        };
        setCurrentBook(updatedBook);
      }
    } catch (err) {
      console.error('Error going to previous page:', err);
    }
  }, [currentBook, setCurrentBook, updateProgress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      resetEPUBService();
    };
  }, []);

  return {
    currentBook,
    chapters,
    currentChapter,
    isLoading,
    error,
    loadBook,
    navigateToChapter,
    nextPage,
    prevPage,
    goToLocation,
    getCurrentCFI,
    renderToElement,
    setEPUBTheme,
    progress,
  };
}
