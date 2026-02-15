import { useState, useCallback, useEffect, useRef } from 'react';
import { Toolbar } from './components/Toolbar/Toolbar';
import { BookLayout, BookLayoutRef } from './components/BookLayout';
import { Notebook } from './components/Notebook/Notebook';
import { AIOverlay } from './components/AIOverlay/AIOverlay';
import { SelectionPopover } from './components/EPUBViewer/SelectionPopover';
import { HighlightPopover } from './components/Highlights/HighlightPopover';
import { SettingsDialog } from './components/Settings/SettingsDialog';
import { StatusBar } from './components/StatusBar/StatusBar';
import { LoadingSpinner } from './components/Loading/LoadingSpinner';
import { useEPUB } from './hooks/useEPUB';
import { useNotes } from './hooks/useNotes';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useHighlights } from './hooks/useHighlights';
import { useSelection } from './hooks/useSelection';
import { useAppStore } from './stores/appStore';
import { getEPUBService } from './services/epub';
import { insertSummaryAfterSelection } from './services/noteUtils';
import type { Highlight, HighlightColor } from './types';

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
    progress,
  } = useEPUB();

  const {
    panelMode,
    setPanelMode,
    typography,
    setTypography,
    currentSelection,
    setCurrentSelection,
  } = useAppStore();

  const {
    highlights,
    createHighlight,
    updateHighlight,
    removeHighlight,
    loadHighlightsForBook,
    activeHighlight,
    activeHighlightPosition,
    clearActiveHighlight,
  } = useHighlights();

  const {
    content: noteContent,
    setContent: setNoteContent,
    loadNotes,
    saveNotes,
  } = useNotes();

  const {
    selection,
    popoverPosition,
    clearSelection,
    dismissPopover,
    highlightPopoverData,
  } = useSelection({ current: null } as React.RefObject<HTMLElement>, currentChapter, chapters);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiContext, setAiContext] = useState<{ text: string; cfi: string; chapterTitle: string } | null>(null);
  const bookLayoutRef = useRef<BookLayoutRef>(null);

  useEffect(() => {
    if (currentBook) {
      loadHighlightsForBook(currentBook.id);
      loadNotes(currentBook);
    }
  }, [currentBook?.id, loadHighlightsForBook, loadNotes]);

  useEffect(() => {
    const epubService = getEPUBService();
    epubService.applyTypography(typography);
  }, [typography]);

  useEffect(() => {
    const epubService = getEPUBService();
    epubService.setAnimationCallbacks({
      beforeNextPage: () => {
        bookLayoutRef.current?.triggerAnimation('forward');
      },
      beforePrevPage: () => {
        bookLayoutRef.current?.triggerAnimation('backward');
      },
    });

    return () => {
      epubService.setAnimationCallbacks(null);
    };
  }, []);

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

  const handleInsertSummary = useCallback(
    (summary: string) => {
      if (currentSelection) {
        const updated = insertSummaryAfterSelection(
          noteContent,
          currentSelection.text,
          summary
        );
        setNoteContent(updated);
      } else {
        setNoteContent(noteContent + '\n\n' + summary + '\n\n---\n');
      }
    },
    [currentSelection, noteContent, setNoteContent]
  );

  const handleNavigateToHighlight = useCallback(
    async (cfi: string) => {
      await goToLocation(cfi);
    },
    [goToLocation]
  );

  const handleEditAnnotation = useCallback(
    (id: string, annotation: string) => {
      updateHighlight(id, { annotation });
    },
    [updateHighlight]
  );

  const handleChangeHighlightColor = useCallback(
    (id: string, color: HighlightColor) => {
      updateHighlight(id, { color });
    },
    [updateHighlight]
  );

  const handleAskAI = useCallback(
    (highlight: Highlight) => {
      setAiContext({
        text: highlight.text,
        cfi: highlight.cfi,
        chapterTitle: highlight.chapterTitle,
      });
      setCurrentSelection({
        text: highlight.text,
        chapterId: highlight.chapterId,
        chapterTitle: highlight.chapterTitle,
        cfi: highlight.cfi,
        timestamp: Date.now(),
      });
      clearActiveHighlight();
      setPanelMode('ai');
    },
    [setPanelMode, clearActiveHighlight, setCurrentSelection]
  );

  const handleNextPage = useCallback(async () => {
    bookLayoutRef.current?.triggerAnimation('forward');
    await nextPage();
  }, [nextPage]);

  const handlePrevPage = useCallback(async () => {
    bookLayoutRef.current?.triggerAnimation('backward');
    await prevPage();
  }, [prevPage]);

  const handleToggleNotebook = useCallback(() => {
    setPanelMode(panelMode === 'notebook' ? 'reading' : 'notebook');
  }, [panelMode, setPanelMode]);

  const handleToggleAI = useCallback(() => {
    setPanelMode(panelMode === 'ai' ? 'reading' : 'ai');
  }, [panelMode, setPanelMode]);

  const handleEscape = useCallback(() => {
    setPanelMode('reading');
    clearSelection();
    clearActiveHighlight();
  }, [setPanelMode, clearSelection, clearActiveHighlight]);

  const handleHighlight = useCallback(
    (color: HighlightColor) => {
      if (selection) {
        createHighlight(selection, color);
        clearSelection();
      }
    },
    [selection, createHighlight, clearSelection]
  );

  const handleDiscussWithAI = useCallback(() => {
    if (selection) {
      setCurrentSelection(selection);
    }
    clearSelection();
    setPanelMode('ai');
  }, [selection, setCurrentSelection, clearSelection, setPanelMode]);

  useKeyboardShortcuts({
    onOpenFile: handleOpenFile,
    onSaveNotes: async () => {
      if (currentBook) {
        await saveNotes();
      }
    },
    onToggleAI: handleToggleAI,
    onToggleNotebook: handleToggleNotebook,
    onEscape: handleEscape,
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    onOpenSettings: () => setSettingsOpen(true),
  });

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

  const renderLoadingState = () => (
    <div className="loading-state">
      <LoadingSpinner message="Loading book..." size="large" />
    </div>
  );

  return (
    <div className="app">
      <Toolbar
        bookTitle={currentBook?.title || null}
        onOpenFile={handleOpenFile}
        onOpenSettings={() => setSettingsOpen(true)}
        hasBook={!!currentBook}
        onToggleNotebook={handleToggleNotebook}
        onToggleAI={handleToggleAI}
        panelMode={panelMode}
        typography={typography}
        onTypographyChange={setTypography}
      />

      {isLoading ? (
        renderLoadingState()
      ) : !currentBook ? (
        renderEmptyState()
      ) : (
        <>
          <BookLayout
            ref={bookLayoutRef}
            bookId={currentBook.id}
            onRenderReady={handleRenderReady}
            chapters={chapters}
            currentChapter={currentChapter}
            onChapterSelect={navigateToChapter}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
            progress={progress.percentage}
          />

          <Notebook
            isOpen={panelMode === 'notebook'}
            onClose={() => setPanelMode('reading')}
            highlights={highlights}
            bookTitle={currentBook.title}
            bookAuthor={currentBook.author}
            onNavigateToHighlight={handleNavigateToHighlight}
            onEditAnnotation={handleEditAnnotation}
            onDeleteHighlight={removeHighlight}
          />

          <AIOverlay
            isOpen={panelMode === 'ai'}
            onClose={() => setPanelMode('reading')}
            bookTitle={currentBook.title}
            bookId={currentBook.id}
            initialContext={aiContext}
            onInsertToNotes={handleInsertSummary}
          />

          {selection && popoverPosition && (
            <SelectionPopover
              selection={selection}
              position={popoverPosition}
              onQuoteToNotes={(formattedQuote) => {
                setNoteContent(noteContent + formattedQuote);
                clearSelection();
              }}
              onDiscussWithAI={handleDiscussWithAI}
              onHighlight={handleHighlight}
              onClose={clearSelection}
              onDismiss={dismissPopover}
            />
          )}

          {activeHighlight && activeHighlightPosition && (
            <HighlightPopover
              highlight={activeHighlight}
              position={activeHighlightPosition}
              onUpdateAnnotation={handleEditAnnotation}
              onChangeColor={handleChangeHighlightColor}
              onDelete={removeHighlight}
              onAskAI={handleAskAI}
              onClose={clearActiveHighlight}
            />
          )}

          {highlightPopoverData && !activeHighlight && (
            <HighlightPopover
              highlight={highlightPopoverData.highlight}
              position={highlightPopoverData.position}
              onUpdateAnnotation={handleEditAnnotation}
              onChangeColor={handleChangeHighlightColor}
              onDelete={removeHighlight}
              onAskAI={handleAskAI}
              onClose={clearSelection}
            />
          )}

          <StatusBar
            currentChapter={currentChapter}
            totalChapters={chapters.length}
            currentChapterIndex={
              currentChapter
                ? chapters.findIndex((ch) => ch.id === currentChapter.id)
                : 0
            }
            progress={progress.percentage}
          />
        </>
      )}

      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

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
