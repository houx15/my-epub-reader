import type { Book, ChatSession, BooksIndex, Highlight } from '../types';

// Simple path join utility for renderer process (works for both Unix and Windows)
function joinPath(...parts: string[]): string {
  return parts
    .map((part, index) => {
      if (index === 0) {
        return part.replace(/\/+$/, '');
      }
      return part.replace(/^\/+|\/+$/g, '');
    })
    .filter(Boolean)
    .join('/');
}

/**
 * Storage Service - Handles local file storage for books, notes, and chat history
 */
export class StorageService {
  private userDataPath: string = '';
  private notesBasePath: string = '';

  async initialize() {
    this.userDataPath = await window.electron.getUserDataPath();
    await this.refreshConfig();
  }

  async refreshConfig() {
    const config = await window.electron.loadConfig();
    const configuredPath = config?.storage?.notesPath?.trim();
    this.notesBasePath = configuredPath || joinPath(this.userDataPath, 'books');
  }

  /**
   * Get the directory for a specific book
   */
  private getBookDir(bookId: string): string {
    return joinPath(this.notesBasePath, bookId);
  }

  /**
   * Save book metadata
   */
  async saveBookMetadata(book: Book): Promise<void> {
    const bookDir = this.getBookDir(book.id);
    await window.electron.ensureDir(bookDir);

    const metaPath = joinPath(bookDir, 'meta.json');
    await window.electron.writeJSON(metaPath, book);
  }

  /**
   * Load book metadata
   */
  async loadBookMetadata(bookId: string): Promise<Book | null> {
    try {
      const metaPath = joinPath(this.getBookDir(bookId), 'meta.json');
      const exists = await window.electron.fileExists(metaPath);

      if (!exists) {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return await window.electron.readJSON(metaPath) as any;
    } catch (error) {
      console.error('Failed to load book metadata:', error);
      return null;
    }
  }

  /**
   * Save notes for a book
   */
  async saveNotes(bookId: string, content: string): Promise<void> {
    const bookDir = this.getBookDir(bookId);
    await window.electron.ensureDir(bookDir);

    const notesPath = joinPath(bookDir, 'notes.md');
    await window.electron.writeFile(notesPath, content);
  }

  /**
   * Load notes for a book
   */
  async loadNotes(bookId: string): Promise<string> {
    try {
      const notesPath = joinPath(this.getBookDir(bookId), 'notes.md');
      const exists = await window.electron.fileExists(notesPath);

      if (!exists) {
        return '';
      }

      const buffer = await window.electron.readFile(notesPath);
      const decoder = new TextDecoder('utf-8');
      return decoder.decode(buffer);
    } catch (error) {
      console.error('Failed to load notes:', error);
      return '';
    }
  }

  /**
   * Save chat history for a book
   */
  async saveChatHistory(bookId: string, sessions: ChatSession[]): Promise<void> {
    const bookDir = this.getBookDir(bookId);
    await window.electron.ensureDir(bookDir);

    const chatPath = joinPath(bookDir, 'chat.json');
    await window.electron.writeJSON(chatPath, { sessions });
  }

  /**
   * Load chat history for a book
   */
  async loadChatHistory(bookId: string): Promise<ChatSession[]> {
    try {
      const chatPath = joinPath(this.getBookDir(bookId), 'chat.json');
      const exists = await window.electron.fileExists(chatPath);

      if (!exists) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await window.electron.readJSON(chatPath) as any;
      return data.sessions || [];
    } catch (error) {
      console.error('Failed to load chat history:', error);
      return [];
    }
  }

  /**
   * Update books index
   */
  async updateBooksIndex(book: Book): Promise<void> {
    const indexPath = joinPath(this.userDataPath, 'books.json');

    let index: BooksIndex;
    try {
      const exists = await window.electron.fileExists(indexPath);
      if (exists) {
        index = await window.electron.readJSON(indexPath) as BooksIndex;
      } else {
        index = { books: [] };
      }
    } catch {
      index = { books: [] };
    }

    // Check if book already exists
    const existingIndex = index.books.findIndex(b => b.id === book.id);

    const bookEntry = {
      id: book.id,
      title: book.title,
      author: book.author,
      filePath: book.filePath,
      addedAt: existingIndex >= 0 ? index.books[existingIndex].addedAt : Date.now(),
      lastOpenedAt: Date.now(),
    };

    if (existingIndex >= 0) {
      index.books[existingIndex] = bookEntry;
    } else {
      index.books.push(bookEntry);
    }

    await window.electron.writeJSON(indexPath, index);
  }

  /**
   * Save highlights for a book
   */
  async saveHighlights(bookId: string, highlights: Highlight[]): Promise<void> {
    const bookDir = this.getBookDir(bookId);
    await window.electron.ensureDir(bookDir);

    const highlightsPath = joinPath(bookDir, 'highlights.json');
    await window.electron.writeJSON(highlightsPath, { highlights });
  }

  /**
   * Load highlights for a book
   */
  async loadHighlights(bookId: string): Promise<Highlight[]> {
    try {
      const highlightsPath = joinPath(this.getBookDir(bookId), 'highlights.json');
      const exists = await window.electron.fileExists(highlightsPath);

      if (!exists) {
        return [];
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await window.electron.readJSON(highlightsPath) as any;
      return data.highlights || [];
    } catch (error) {
      console.error('Failed to load highlights:', error);
      return [];
    }
  }

  /**
   * Get books index
   */
  async getBooksIndex(): Promise<BooksIndex> {
    try {
      const indexPath = joinPath(this.userDataPath, 'books.json');
      const exists = await window.electron.fileExists(indexPath);

      if (!exists) {
        return { books: [] };
      }

      return await window.electron.readJSON(indexPath) as Promise<BooksIndex>;
    } catch (error) {
      console.error('Failed to load books index:', error);
      return { books: [] };
    }
  }
}

// Singleton instance
let storageServiceInstance: StorageService | null = null;

export async function getStorageService(): Promise<StorageService> {
  if (!storageServiceInstance) {
    storageServiceInstance = new StorageService();
    await storageServiceInstance.initialize();
  } else {
    await storageServiceInstance.refreshConfig();
  }
  return storageServiceInstance;
}
