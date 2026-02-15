import { useState, useCallback, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { ThreeColumnLayout } from './components/Layout/ThreeColumnLayout';
import { EPUBViewer, EPUBViewerRef } from './components/EPUBViewer/EPUBViewer';
import { LLMPanel } from './components/LLMPanel/LLMPanel';
import { NotesEditor } from './components/NotesEditor/NotesEditor';
import { SettingsDialog } from './components/Settings/SettingsDialog';
import { StatusBar } from './components/StatusBar/StatusBar';
import { LoadingSpinner } from './components/Loading/LoadingSpinner';
import { useEPUB } from './hooks/useEPUB';
import { useNotes } from './hooks/useNotes';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useTheme } from './hooks/useTheme';
import { useAppStore } from './stores/appStore';
import { insertSummaryAfterSelection } from './services/noteUtils';
import { getEPUBService } from './services/epub';

// Window.electron is declared in types/index.ts

function App() {
  const {
    currentBook,
    chapters,
    currentChapter,
    isLoading,
    loadBook,
    navigateToChapter,
    nextPage,
    prevPage,
    renderToElement,
    goToLocation,
    progress, // Real reading progress from EPUB service
  } = useEPUB();

  const {
    isLLMPanelCollapsed,
    toggleLLMPanel,
    currentSelection,
    notesFontSize,
  } = useAppStore();

  const {
    content: noteContent,
    wordCount,
    isSaving,
    lastSaved,
    setContent: setNoteContent,
    loadNotes,
    saveNotes,
  } = useNotes();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const epubViewerRef = useRef<EPUBViewerRef>(null);

  // Initialize theme system and get effective theme
  const { effectiveTheme } = useTheme();

  /**
   * Load notes when book ID changes (not on every position update)
   */
  useEffect(() => {
    if (currentBook) {
      loadNotes(currentBook);
    }
    // Only depend on book ID, not the entire currentBook object
    // This prevents reloading notes on every page navigation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBook?.id, loadNotes]);

  /**
   * Register animation callbacks with EPUBService for iframe key handlers
   */
  useEffect(() => {
    const epubService = getEPUBService();
    // Register callbacks that trigger animation before page turn
    epubService.setAnimationCallbacks({
      beforeNextPage: () => {
        epubViewerRef.current?.triggerAnimation('forward');
      },
      beforePrevPage: () => {
        epubViewerRef.current?.triggerAnimation('backward');
      },
    });

    return () => {
      // Clear callbacks on unmount
      epubService.setAnimationCallbacks(null);
    };
  }, []);

  /**
   * Handle jump to location from notes
   */
  const handleJumpToLocation = useCallback(
    async (cfi: string) => {
      await goToLocation(cfi);
    },
    [goToLocation]
  );

  /**
   * Handle file open
   */
  const handleOpenFile = useCallback(async () => {
    try {
      const result = await window.electron.openFileDialog();
      if (!result.canceled && result.filePath) {
        await loadBook(result.filePath);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      alert('Failed to open EPUB file. Please try again.');
    }
  }, [loadBook]);

  /**
   * Handle export notes
   */
  const handleExportNotes = useCallback(async () => {
    if (!currentBook || !noteContent) {
      alert('No notes to export');
      return;
    }

    try {
      const result = await window.electron.showSaveDialog({
        defaultPath: `${currentBook.title}-notes.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });

      if (!result.canceled && result.filePath) {
        const exportContent = noteContent.replace(/<!-- loc:[^>]+ -->\n?/g, '');
        await window.electron.writeFile(result.filePath, exportContent);
        alert('Notes exported successfully!');
      }
    } catch (error) {
      console.error('Failed to export notes:', error);
      alert('Failed to export notes. Please try again.');
    }
  }, [currentBook, noteContent]);

  /**
   * Handle settings dialog
   */
  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  /**
   * Handle EPUB render ready
   */
  const handleRenderReady = useCallback(
    async (element: HTMLElement, width: number, height: number) => {
      if (currentBook) {
        try {
          await renderToElement(element, width, height);
        } catch (error) {
          console.error('Failed to render EPUB:', error);
        }
      }
    },
    [currentBook, renderToElement]
  );

  /**
   * Handle insert summary to notes
   */
  const handleInsertSummary = useCallback(
    (summary: string) => {
      if (currentSelection) {
        // Insert summary after the relevant quote
        const updated = insertSummaryAfterSelection(
          noteContent,
          currentSelection.text,
          summary
        );
        setNoteContent(updated);
      } else {
        // Append to end
        setNoteContent(noteContent + '\n\n' + summary + '\n\n---\n');
      }
    },
    [currentSelection, noteContent, setNoteContent]
  );

  /**
   * Handle next page with animation
   */
  const handleNextPage = useCallback(async () => {
    epubViewerRef.current?.triggerAnimation('forward');
    await nextPage();
  }, [nextPage]);

  /**
   * Handle previous page with animation
   */
  const handlePrevPage = useCallback(async () => {
    epubViewerRef.current?.triggerAnimation('backward');
    await prevPage();
  }, [prevPage]);

  /**
   * Setup keyboard shortcuts
   */
  useKeyboardShortcuts({
    onOpenFile: handleOpenFile,
    onSaveNotes: async () => {
      if (currentBook) {
        await saveNotes();
      }
    },
    onExportNotes: handleExportNotes,
    onToggleLLMPanel: toggleLLMPanel,
    onNextChapter: () => {
      if (chapters.length > 0 && currentChapter) {
        const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
        if (currentIndex < chapters.length - 1) {
          navigateToChapter(chapters[currentIndex + 1].href);
        }
      }
    },
    onPrevChapter: () => {
      if (chapters.length > 0 && currentChapter) {
        const currentIndex = chapters.findIndex(ch => ch.id === currentChapter.id);
        if (currentIndex > 0) {
          navigateToChapter(chapters[currentIndex - 1].href);
        }
      }
    },
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    onOpenSettings: handleOpenSettings,
  });

  // Render empty state if no book loaded
  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">📖</div>
      <h2>Welcome to EPUB Reader</h2>
      <p>Open an EPUB file to get started</p>
      <button className="btn-primary" onClick={handleOpenFile}>
        📖 Open EPUB File
      </button>
    </div>
  );

  // Render loading state
  const renderLoadingState = () => (
    <div className="loading-state">
      <LoadingSpinner message="Loading book..." size="large" />
    </div>
  );


  return (
    <div className="app">
      {/* Toolbar */}
      <Toolbar
        bookTitle={currentBook?.title || null}
        onOpenFile={handleOpenFile}
        onExportNotes={handleExportNotes}
        onOpenSettings={handleOpenSettings}
        hasBook={!!currentBook}
      />

      {/* Main Content */}
      {isLoading ? (
        renderLoadingState()
      ) : !currentBook ? (
        renderEmptyState()
      ) : (
        <>
          <ThreeColumnLayout
            left={
              <EPUBViewer
                ref={epubViewerRef}
                onRenderReady={handleRenderReady}
                chapters={chapters}
                currentChapter={currentChapter}
                onChapterSelect={navigateToChapter}
                onNextPage={handleNextPage}
                onPrevPage={handlePrevPage}
                progress={progress.percentage} // Pass real reading progress from EPUB service
              />
            }
            center={
              <NotesEditor
                content={noteContent}
                onChange={setNoteContent}
                wordCount={wordCount}
                isSaving={isSaving}
                lastSaved={lastSaved}
                theme={effectiveTheme}
                fontSize={notesFontSize}
                onJumpToLocation={handleJumpToLocation}
                chapters={chapters}
              />
            }
            right={
              <LLMPanel
                bookTitle={currentBook.title}
                bookId={currentBook.id}
                isCollapsed={isLLMPanelCollapsed}
                onToggle={toggleLLMPanel}
                currentSelection={currentSelection}
                onInsertSummaryToNotes={handleInsertSummary}
              />
            }
            isRightCollapsed={isLLMPanelCollapsed}
          />

          {/* Status Bar */}
          <StatusBar
            currentChapter={currentChapter}
            totalChapters={chapters.length}
            currentChapterIndex={
              currentChapter
                ? chapters.findIndex(ch => ch.id === currentChapter.id)
                : 0
            }
            wordCount={wordCount}
          />
        </>
      )}

      {/* Settings Dialog */}
      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Inline styles for empty/loading states */}
      <style>{`
        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
        }

        .empty-state,
        .loading-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-lg);
          color: var(--text-secondary);
        }

        .empty-state-icon {
          font-size: 80px;
          opacity: 0.3;
        }

        .empty-state h2 {
          margin: 0;
          color: var(--text-primary);
        }

        .empty-state p {
          margin: 0;
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}

export default App;
