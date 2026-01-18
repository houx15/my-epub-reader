import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { getStorageService } from '../services/storage';
import { generateNoteHeader, updateLastModifiedDate, countWords } from '../services/noteUtils';
import type { Book } from '../types';

interface UseNotesReturn {
  content: string;
  wordCount: number;
  isSaving: boolean;
  lastSaved: Date | null;
  setContent: (content: string) => void;
  saveNotes: () => Promise<void>;
  loadNotes: (book: Book) => Promise<void>;
}

/**
 * React hook for notes management with auto-save
 */
export function useNotes(): UseNotesReturn {
  const { currentBook, noteContent, setNoteContent } = useAppStore();
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>('');

  /**
   * Update word count when content changes
   */
  useEffect(() => {
    const count = countWords(noteContent);
    setWordCount(count);
  }, [noteContent]);

  /**
   * Save notes to storage
   */
  const saveNotes = useCallback(async () => {
    if (!currentBook) return;

    // Don't save if content hasn't changed
    if (noteContent === lastContentRef.current) {
      return;
    }

    setIsSaving(true);

    try {
      const storage = await getStorageService();

      // Update last modified date in content
      const updatedContent = updateLastModifiedDate(noteContent);

      await storage.saveNotes(currentBook.id, updatedContent);

      lastContentRef.current = updatedContent;
      setLastSaved(new Date());

      // Update content in store if it was modified
      if (updatedContent !== noteContent) {
        setNoteContent(updatedContent);
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
    } finally {
      setIsSaving(false);
    }
  }, [currentBook, noteContent, setNoteContent]);

  /**
   * Load notes for a book
   */
  const loadNotes = useCallback(async (book: Book) => {
    try {
      const storage = await getStorageService();
      let content = await storage.loadNotes(book.id);

      // If no notes exist, create a header
      if (!content) {
        content = generateNoteHeader(book.title, book.author);
      }

      setNoteContent(content);
      lastContentRef.current = content;
      setWordCount(countWords(content));
      setLastSaved(null);
    } catch (error) {
      console.error('Failed to load notes:', error);
      // Create new notes if loading fails
      const content = generateNoteHeader(book.title, book.author);
      setNoteContent(content);
      lastContentRef.current = content;
    }
  }, [setNoteContent]);

  /**
   * Auto-save with debounce (2 seconds after last change)
   */
  useEffect(() => {
    if (!currentBook) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't auto-save if content hasn't changed
    if (noteContent === lastContentRef.current) {
      return;
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      saveNotes();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [noteContent, currentBook, saveNotes]);

  /**
   * Save on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Force save on unmount if there are unsaved changes
      if (currentBook && noteContent !== lastContentRef.current) {
        saveNotes();
      }
    };
  }, [currentBook, noteContent, saveNotes]);

  /**
   * Handle content changes from external sources
   */
  const setContent = useCallback(
    (content: string) => {
      setNoteContent(content);
    },
    [setNoteContent]
  );

  return {
    content: noteContent,
    wordCount,
    isSaving,
    lastSaved,
    setContent,
    saveNotes,
    loadNotes,
  };
}
