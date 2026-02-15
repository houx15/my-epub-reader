import ePub, { Book as EPubBook, Rendition, NavItem } from 'epubjs';
import { v4 as uuidv4 } from 'uuid';
import type { Book, Chapter, TypographySettings } from '../types';

export interface RenderOptions {
  width?: number;
  height?: number;
  spread?: 'none' | 'auto' | 'always';
  flow?: 'paginated' | 'scrolled';
}

interface AnimationCallbacks {
  beforeNextPage?: () => void;
  beforePrevPage?: () => void;
}

// Static callbacks that persist across service resets
let globalAnimationCallbacks: AnimationCallbacks | null = null;

/**
 * EPUB Service - Wraps epub.js for book management
 */
export class EPUBService {
  private book: EPubBook | null = null;
  private rendition: Rendition | null = null;
  private container: HTMLElement | null = null;
  private isDisplayed: boolean = false;
  private isNavigating: boolean = false; // Debounce flag for navigation
  private resizeObserver: ResizeObserver | null = null;
  private renderVersion: number = 0;
  private keyListenerDocs: WeakSet<Document> = new WeakSet();

  /**
   * Generate a stable book ID from the file path
   */
  private generateBookId(filePath: string): string {
    let hash = 5381;
    for (let i = 0; i < filePath.length; i += 1) {
      hash = ((hash << 5) + hash) ^ filePath.charCodeAt(i);
    }
    return `book-${hash >>> 0}`;
  }

  /**
   * Normalize chapter href to a spine item href if available.
   */
  private normalizeHref(href: string): string {
    if (!this.book) {
      return href;
    }

    const [path, hash] = href.split('#');
    const spineItem = this.book.spine.get(path);
    const resolved = spineItem?.href || path;
    return hash ? `${resolved}#${hash}` : resolved;
  }

  /**
   * Load an EPUB file from file path
   */
  async loadEPUB(filePath: string): Promise<Book> {
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await window.electron.readFile(filePath);

      // Create ePub book instance
      this.book = ePub(arrayBuffer);

      // Parse metadata and TOC
      await this.book.ready;

      const metadata = await this.parseMetadata();
      const toc = await this.extractTOC();

      // Generate book ID from file path
      const bookId = this.generateBookId(filePath);

      const bookData: Book = {
        id: bookId,
        title: metadata.title,
        author: metadata.author,
        filePath,
        coverImage: metadata.cover,
        toc,
        lastReadPosition: {
          chapterIndex: 0,
          cfi: '',
        },
      };

      return bookData;
    } catch (error) {
      console.error('Error loading EPUB:', error);
      throw new Error(`Failed to load EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse book metadata
   */
  private async parseMetadata(): Promise<{ title: string; author: string; cover?: string }> {
    if (!this.book) {
      throw new Error('No book loaded');
    }

    const metadata = this.book.packaging.metadata;

    let cover: string | undefined;
    try {
      const coverUrl = await this.book.coverUrl();
      if (coverUrl) {
        // Convert cover to base64
        const response = await fetch(coverUrl);
        const blob = await response.blob();
        cover = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      }
    } catch (error) {
      console.warn('Failed to load cover image:', error);
    }

    return {
      title: metadata.title || 'Unknown Title',
      author: metadata.creator || 'Unknown Author',
      cover,
    };
  }

  /**
   * Extract table of contents
   */
  private async extractTOC(): Promise<Chapter[]> {
    if (!this.book) {
      throw new Error('No book loaded');
    }

    await this.book.loaded.navigation;
    const navigation = this.book.navigation;

    const convertNavItem = (item: NavItem, level: number = 0): Chapter => {
      const chapter: Chapter = {
        id: item.id || uuidv4(),
        title: item.label,
        href: item.href,
        level,
      };

      if (item.subitems && item.subitems.length > 0) {
        chapter.children = item.subitems.map((subitem) => convertNavItem(subitem, level + 1));
      }

      return chapter;
    };

    return navigation.toc.map((item) => convertNavItem(item));
  }

  /**
   * Render EPUB to a container element
   */
  async renderToElement(
    element: HTMLElement,
    widthOrOptions?: number | RenderOptions,
    height?: number
  ): Promise<void> {
    if (!this.book) {
      throw new Error('No book loaded');
    }

    const currentRenderVersion = ++this.renderVersion;
    this.container = element;
    this.isDisplayed = false;

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.rendition) {
      this.rendition.destroy();
      this.rendition = null;
    }

    let containerWidth: number;
    let containerHeight: number;
    let spread: 'none' | 'auto' | 'always';
    let flow: 'paginated' | 'scrolled';

    if (typeof widthOrOptions === 'object') {
      containerWidth = widthOrOptions.width || element.clientWidth || 800;
      containerHeight = widthOrOptions.height || element.clientHeight || 600;
      spread = widthOrOptions.spread ?? 'auto';
      flow = widthOrOptions.flow ?? 'paginated';
    } else {
      containerWidth = widthOrOptions || element.clientWidth || 800;
      containerHeight = height || element.clientHeight || 600;
      spread = 'auto';
      flow = 'paginated';
    }

    element.innerHTML = '';

    const rendition = this.book.renderTo(element, {
      width: containerWidth,
      height: containerHeight,
      manager: 'default',
      flow,
      spread,
    });
    this.rendition = rendition;

    // Register themes with proper text colors
    rendition.themes.register('light', {
      'body': {
        'background-color': '#ffffff !important',
        'color': '#333333 !important',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'line-height': '1.6',
        'padding': '20px !important',
        'margin': '0 !important',
        'overflow': 'hidden !important',
      },
      'p, div, span, h1, h2, h3, h4, h5, h6, li, td, th': {
        'color': '#333333 !important',
      },
      'div[style*="height: 100vh"], div[style*="height:100vh"], section[style*="height: 100vh"], section[style*="height:100vh"]': {
        'height': 'auto !important',
        'min-height': '0 !important',
      },
      'img, svg, video': {
        'max-width': '100% !important',
        'max-height': '70vh !important',
        'height': 'auto !important',
      },
      'figure': {
        'margin': '0 !important',
      },
      'a': {
        'color': '#007bff !important',
      }
    });

    rendition.themes.register('dark', {
      'body': {
        'background-color': '#1e1e1e !important',
        'color': '#e0e0e0 !important',
        'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        'line-height': '1.6',
        'padding': '20px !important',
        'margin': '0 !important',
        'overflow': 'hidden !important',
      },
      'p, div, span, h1, h2, h3, h4, h5, h6, li, td, th': {
        'color': '#e0e0e0 !important',
      },
      'div[style*="height: 100vh"], div[style*="height:100vh"], section[style*="height: 100vh"], section[style*="height:100vh"]': {
        'height': 'auto !important',
        'min-height': '0 !important',
      },
      'img, svg, video': {
        'max-width': '100% !important',
        'max-height': '70vh !important',
        'height': 'auto !important',
      },
      'figure': {
        'margin': '0 !important',
      },
      'a': {
        'color': '#6ea8fe !important',
      }
    });

    // Apply light theme by default
    rendition.themes.select('light');

    // Add event listener for when content is rendered
    rendition.on('rendered', () => {
      this.bindContentKeyHandlers();
    });


    // Display the first page and wait for it to be ready
    await rendition.display();

    if (currentRenderVersion !== this.renderVersion) {
      rendition.destroy();
      return;
    }

    this.isDisplayed = true;
    this.bindContentKeyHandlers();
    this.setupResizeObserver(element);

    // Generate locations for pagination in background (non-blocking)
    // This enables percentage tracking but is not required for basic next/prev
    this.book.locations.generate(1024).catch((err: Error) => {
      console.warn('Failed to generate locations:', err);
    });
  }

  /**
   * Setup ResizeObserver to handle container size changes
   */
  private setupResizeObserver(element: HTMLElement): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (this.rendition && this.isDisplayed) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            this.rendition.resize(width, height);
          }
        }
      }
    });

    this.resizeObserver.observe(element);
  }

  /**
   * Bind arrow key handlers inside iframe contents
   */
  private bindContentKeyHandlers(): void {
    if (!this.rendition) {
      return;
    }

    const contents = this.rendition.getContents();
    const contentsArray = Array.isArray(contents) ? contents : contents ? [contents] : [];
    contentsArray.forEach((content: any) => {
      const doc = content?.document;
      if (!doc || this.keyListenerDocs.has(doc)) {
        return;
      }

      const handleKeyDown = (event: KeyboardEvent) => {
        const target = event.target as HTMLElement | null;
        if (
          target &&
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        ) {
          return;
        }

        if (event.key === 'ArrowRight') {
          event.preventDefault();
          // Trigger animation callback before navigating
          globalAnimationCallbacks?.beforeNextPage?.();
          this.nextPage();
        }

        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          // Trigger animation callback before navigating
          globalAnimationCallbacks?.beforePrevPage?.();
          this.prevPage();
        }
      };

      doc.addEventListener('keydown', handleKeyDown);
      this.keyListenerDocs.add(doc);
    });
  }

  /**
   * Register a callback for location changes (relocated event)
   */
  onRelocated(callback: (location: { cfi: string; percentage: number }) => void): void {
    if (!this.rendition) {
      console.warn('Cannot register relocated listener: rendition not initialized');
      return;
    }

    this.rendition.on('relocated', (location: unknown) => {
      const loc = location as { start?: { cfi: string; percentage?: number } };
      if (loc && loc.start) {
        callback({
          cfi: loc.start.cfi,
          percentage: loc.start.percentage || 0,
        });
      }
    });
  }

  /**
   * Set the theme for the EPUB viewer
   */
  setTheme(theme: 'light' | 'dark'): void {
    if (this.rendition) {
      this.rendition.themes.select(theme);
    }
  }

  /**
   * Set animation callbacks for page navigation
   * Called before page turns to trigger visual animations
   * Stored globally to persist across service resets
   */
  setAnimationCallbacks(callbacks: AnimationCallbacks | null): void {
    globalAnimationCallbacks = callbacks;
  }

  applyTypography(settings: Partial<TypographySettings>): void {
    if (!this.rendition) {
      return;
    }

    if (settings.fontFamily) {
      this.rendition.themes.override('font-family', settings.fontFamily);
    }
    if (settings.fontSize) {
      this.rendition.themes.override('font-size', `${settings.fontSize}px`);
    }
    if (settings.lineHeight) {
      this.rendition.themes.override('line-height', String(settings.lineHeight));
    }
    if (settings.backgroundColor) {
      this.rendition.themes.override('background-color', settings.backgroundColor);
    }
  }

  /**
   * Set font size for the EPUB content
   */
  setFontSize(size: number): void {
    if (this.rendition) {
      this.rendition.themes.override('font-size', `${size}px`);
    }
  }

  getProgress(): { currentPage: number; totalPages: number; percentage: number } {
    if (!this.book || !this.rendition) {
      return { currentPage: 0, totalPages: 0, percentage: 0 };
    }

    const location = this.rendition.currentLocation() as { start?: { cfi: string; percentage?: number; index?: number } };
    if (!location || !location.start) {
      return { currentPage: 0, totalPages: 0, percentage: 0 };
    }

    const percentage = location.start.percentage || 0;
    const totalLocations = this.book.locations.length();
    
    if (totalLocations > 0) {
      // Clamp currentPage to valid range [1, totalLocations]
      // At percentage === 1, we want currentPage === totalLocations (not totalLocations + 1)
      const currentPage = Math.min(Math.floor(percentage * totalLocations) + 1, totalLocations);
      return {
        currentPage,
        totalPages: totalLocations,
        percentage,
      };
    }

    return {
      currentPage: 0,
      totalPages: 0,
      percentage,
    };
  }

  async goToChapter(href: string): Promise<void> {
    if (!this.rendition) {
      throw new Error('Rendition not initialized');
    }

    const targetHref = this.normalizeHref(href);
    await this.rendition.display(targetHref);
  }

  /**
   * Navigate to a specific CFI location
   */
  async goToLocation(cfi: string): Promise<void> {
    if (!this.rendition) {
      throw new Error('Rendition not initialized');
    }

    await this.rendition.display(cfi);
  }

  /**
   * Go to next page
   */
  async nextPage(): Promise<void> {
    if (!this.rendition || !this.isDisplayed) {
      console.warn('Rendition not ready for navigation');
      return;
    }

    // Debounce: prevent rapid consecutive calls
    if (this.isNavigating) {
      return;
    }

    this.isNavigating = true;

    try {
      // Clear any text selection before navigating
      window.getSelection()?.removeAllRanges();

      const beforeLoc = this.rendition.currentLocation() as { start?: { cfi: string; index?: number } };
      await this.rendition.next();
      const afterLoc = this.rendition.currentLocation() as { start?: { cfi: string; index?: number } };

      if (beforeLoc?.start?.cfi === afterLoc?.start?.cfi && this.book) {
        const nextIndex = (beforeLoc?.start?.index ?? -1) + 1;
        const nextItem = this.book.spine.get(nextIndex);
        if (nextItem) {
          await this.rendition.display(nextItem.href);
        }
      }
    } catch (err) {
      console.error('Error navigating to next page:', err);
    } finally {
      setTimeout(() => {
        this.isNavigating = false;
      }, 150);
    }
  }

  /**
   * Go to previous page
   */
  async prevPage(): Promise<void> {
    if (!this.rendition || !this.isDisplayed) {
      console.warn('Rendition not ready for navigation');
      return;
    }

    // Debounce: prevent rapid consecutive calls
    if (this.isNavigating) {
      return;
    }

    this.isNavigating = true;

    try {
      // Clear any text selection before navigating
      window.getSelection()?.removeAllRanges();

      const beforeLoc = this.rendition.currentLocation() as { start?: { cfi: string; index?: number } };
      await this.rendition.prev();
      const afterLoc = this.rendition.currentLocation() as { start?: { cfi: string; index?: number } };

      if (beforeLoc?.start?.cfi === afterLoc?.start?.cfi && this.book) {
        const prevIndex = (beforeLoc?.start?.index ?? 0) - 1;
        const prevItem = this.book.spine.get(prevIndex);
        if (prevItem) {
          await this.rendition.display(prevItem.href);
        }
      }
    } catch (err) {
      console.error('Error navigating to previous page:', err);
    } finally {
      setTimeout(() => {
        this.isNavigating = false;
      }, 150);
    }
  }

  /**
   * Get current location
   */
  getCurrentLocation(): { cfi: string; percentage: number; href?: string } | null {
    if (!this.rendition) {
      return null;
    }

    const location = this.rendition.currentLocation() as { start?: { cfi: string; percentage?: number; href?: string } };
    if (!location || !location.start) {
      return null;
    }

    return {
      cfi: location.start.cfi || '',
      percentage: location.start.percentage || 0,
      href: location.start.href,
    };
  }

  /**
   * Get current chapter info
   */
  getCurrentChapter(chapters: Chapter[]): Chapter | null {
    const location = this.getCurrentLocation();
    if (!location) return null;

    // Find chapter by checking CFI
    // This is a simplified approach - in production you'd want more sophisticated chapter detection
    const findChapter = (chaps: Chapter[]): Chapter | null => {
      for (const chapter of chaps) {
        // You would need to implement proper chapter detection here
        // For now, just return the first chapter
        if (chapter.children && chapter.children.length > 0) {
          const found = findChapter(chapter.children);
          if (found) return found;
        }
      }
      return chaps[0] || null;
    };

    return findChapter(chapters);
  }

  /**
   * Resize rendition
   */
  resize(width?: number, height?: number): void {
    if (!this.rendition || !this.container) {
      return;
    }

    this.rendition.resize(
      width || this.container.clientWidth,
      height || this.container.clientHeight
    );
  }

  /**
   * Get the rendition for external use (e.g., text selection)
   */
  getRendition(): Rendition | null {
    return this.rendition;
  }

  /**
   * Get the book instance
   */
  getBook(): EPubBook | null {
    return this.book;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.renderVersion += 1;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.rendition) {
      this.rendition.destroy();
      this.rendition = null;
    }

    if (this.book) {
      this.book.destroy();
      this.book = null;
    }

    this.container = null;
    this.isDisplayed = false;
    this.isNavigating = false;
  }
}

// Singleton instance
let epubServiceInstance: EPUBService | null = null;

export function getEPUBService(): EPUBService {
  if (!epubServiceInstance) {
    epubServiceInstance = new EPUBService();
  }
  return epubServiceInstance;
}

export function resetEPUBService(): void {
  if (epubServiceInstance) {
    epubServiceInstance.destroy();
    epubServiceInstance = null;
  }
}
