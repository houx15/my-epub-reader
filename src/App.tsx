import { useState, useCallback, useEffect, useRef } from 'react';
import { BookOpen } from './components/Icons';
import { Toolbar } from './components/Toolbar/Toolbar';
import { BookLayout, BookLayoutRef } from './components/BookLayout';
import { Notebook } from './components/Notebook/Notebook';
import { AIOverlay } from './components/AIOverlay/AIOverlay';
import { SelectionPopover } from './components/EPUBViewer/SelectionPopover';
import { TableOfContents } from './components/EPUBViewer/TableOfContents';
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
import { getStorageService } from './services/storage';
import { insertSummaryAfterSelection, stripMarkdownForExport, updateLastModifiedDate } from './services/noteUtils';
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
  const [isTOCOpen, setIsTOCOpen] = useState(false);
  const [showEndPage, setShowEndPage] = useState(false);
  const [endThoughts, setEndThoughts] = useState('');
  const [aiContext, setAiContext] = useState<{ text: string; cfi: string; chapterTitle: string } | null>(null);
  const [uiVisible, setUiVisible] = useState(true);
  const hideUiTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bookLayoutRef = useRef<BookLayoutRef>(null);

  useEffect(() => {
    if (currentBook) {
      loadHighlightsForBook(currentBook.id);
      loadNotes(currentBook);
      setShowEndPage(false);
      setEndThoughts('');
    }
  }, [currentBook?.id, loadHighlightsForBook, loadNotes]);

  useEffect(() => {
    if (progress.percentage < 0.999 && showEndPage) {
      setShowEndPage(false);
    }
  }, [progress.percentage, showEndPage]);

  useEffect(() => {
    const epubService = getEPUBService();
    epubService.applyTypography(typography);
  }, [typography, currentBook?.id]);

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

  // Auto-hide UI after inactivity
  const resetHideTimer = useCallback(() => {
    if (hideUiTimeoutRef.current) {
      clearTimeout(hideUiTimeoutRef.current);
    }
    
    // Only auto-hide when reading (not when panels are open or in empty state)
    if (currentBook && panelMode === 'reading' && !settingsOpen) {
      hideUiTimeoutRef.current = setTimeout(() => {
        setUiVisible(false);
      }, 3000); // Hide after 3 seconds of inactivity
    }
  }, [currentBook, panelMode, settingsOpen]);

  const showUi = useCallback(() => {
    setUiVisible(true);
    resetHideTimer();
  }, [resetHideTimer]);

  const hideUi = useCallback(() => {
    if (currentBook && panelMode === 'reading' && !settingsOpen) {
      setUiVisible(false);
    }
  }, [currentBook, panelMode, settingsOpen]);

  // Track mouse activity for auto-hide
  useEffect(() => {
    if (!currentBook || panelMode !== 'reading') {
      setUiVisible(true);
      return;
    }

    const handleMouseMove = () => {
      showUi();
    };

    const handleKeyDown = () => {
      showUi();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    resetHideTimer();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (hideUiTimeoutRef.current) {
        clearTimeout(hideUiTimeoutRef.current);
      }
    };
  }, [currentBook, panelMode, showUi, resetHideTimer]);

  // Show UI when settings open or panel mode changes
  useEffect(() => {
    if (settingsOpen || panelMode !== 'reading') {
      setUiVisible(true);
    }
  }, [settingsOpen, panelMode]);

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
    if (showEndPage) {
      return;
    }
    if (progress.percentage >= 0.999) {
      bookLayoutRef.current?.triggerAnimation('forward');
      setShowEndPage(true);
      setUiVisible(true);
      return;
    }
    bookLayoutRef.current?.triggerAnimation('forward');
    await nextPage();
  }, [nextPage, progress.percentage, showEndPage]);

  const handlePrevPage = useCallback(async () => {
    if (showEndPage) {
      bookLayoutRef.current?.triggerAnimation('backward');
      setShowEndPage(false);
      return;
    }
    bookLayoutRef.current?.triggerAnimation('backward');
    await prevPage();
  }, [prevPage, showEndPage]);

  const handleToggleNotebook = useCallback(() => {
    setPanelMode(panelMode === 'notebook' ? 'reading' : 'notebook');
  }, [panelMode, setPanelMode]);

  const handleToggleAI = useCallback(() => {
    setPanelMode(panelMode === 'ai' ? 'reading' : 'ai');
  }, [panelMode, setPanelMode]);

  const handleEscape = useCallback(() => {
    if (isTOCOpen) {
      setIsTOCOpen(false);
      return;
    }
    if (showEndPage) {
      setShowEndPage(false);
      return;
    }
    setPanelMode('reading');
    clearSelection();
    clearActiveHighlight();
  }, [isTOCOpen, showEndPage, setPanelMode, clearSelection, clearActiveHighlight]);

  const handleOpenTOC = useCallback(() => {
    setUiVisible(true);
    setIsTOCOpen(true);
  }, []);

  const handleSelectChapter = useCallback(async (href: string) => {
    await navigateToChapter(href);
    setShowEndPage(false);
    setIsTOCOpen(false);
  }, [navigateToChapter]);

  const persistNotesImmediately = useCallback(async (content: string) => {
    if (!currentBook) return;
    const normalized = updateLastModifiedDate(content);
    setNoteContent(normalized);
    const storage = await getStorageService();
    await storage.saveNotes(currentBook.id, normalized);
  }, [currentBook, setNoteContent]);

  const handleSubmitEndThoughts = useCallback(async () => {
    const thoughts = endThoughts.trim();
    if (!thoughts) return;

    const stamp = new Date().toLocaleString();
    const section = `\n\n## End Notes\n\n${thoughts}\n\n*Added on ${stamp}*\n\n---\n`;
    await persistNotesImmediately(noteContent + section);
    setEndThoughts('');
  }, [endThoughts, noteContent, persistNotesImmediately]);

  const handleExportNotes = useCallback(async () => {
    if (!currentBook) return;
    try {
      const result = await window.electron.showSaveDialog({
        defaultPath: `${currentBook.title}-notes.md`,
        filters: [{ name: 'Markdown', extensions: ['md'] }],
      });

      if (!result.canceled && result.filePath) {
        const contentToExport = stripMarkdownForExport(noteContent);
        await window.electron.writeFile(result.filePath, contentToExport);
      }
    } catch (error) {
      console.error('Failed to export notes:', error);
      alert('Failed to export notes.');
    }
  }, [currentBook, noteContent]);

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
    onOpenTOC: handleOpenTOC,
    onEscape: handleEscape,
    onNextPage: handleNextPage,
    onPrevPage: handlePrevPage,
    onOpenSettings: () => setSettingsOpen(true),
  });

  const renderEmptyState = () => (
    <div className="empty-state">
      <div className="empty-state-icon">
        <BookOpen size={64} strokeWidth={1} />
      </div>
      <h2>Welcome to EPUB Reader</h2>
      <p>Open an EPUB file to get started</p>
      <button className="btn-primary empty-state-btn" onClick={handleOpenFile}>
        <BookOpen size={18} />
        <span>Open EPUB File</span>
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
      <div className={`toolbar-wrapper ${uiVisible ? 'visible' : 'hidden'}`}>
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
      </div>
      
      {/* Hover zone for toolbar */}
      {!uiVisible && currentBook && panelMode === 'reading' && (
        <div className="toolbar-hover-zone" onMouseEnter={showUi} />
      )}

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
            onContentClick={hideUi}
            showEndPage={showEndPage}
            endThoughts={endThoughts}
            onEndThoughtsChange={setEndThoughts}
            onEndSubmit={handleSubmitEndThoughts}
            onEndExport={handleExportNotes}
          />

          <TableOfContents
            chapters={chapters}
            currentChapter={currentChapter}
            isOpen={isTOCOpen}
            onClose={() => setIsTOCOpen(false)}
            onChapterSelect={handleSelectChapter}
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

          <div className={`statusbar-wrapper ${uiVisible ? 'visible' : 'hidden'}`}>
            <StatusBar
              currentChapter={currentChapter}
              totalChapters={chapters.length}
              currentChapterIndex={
                currentChapter
                  ? chapters.findIndex((ch) => ch.id === currentChapter.id)
                  : 0
              }
              progress={progress.percentage}
              onOpenTOC={handleOpenTOC}
            />
          </div>
          
          {/* Hover zone for status bar */}
          {!uiVisible && currentBook && panelMode === 'reading' && (
            <div className="statusbar-hover-zone" onMouseEnter={showUi} />
          )}
        </>
      )}

      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <style>{`
        .app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          position: relative;
        }

        .toolbar-wrapper {
          transition: transform 0.3s ease, opacity 0.3s ease;
          position: relative;
          z-index: 3000;
        }

        .toolbar-wrapper.hidden {
          transform: translateY(-100%);
          opacity: 0;
        }

        .toolbar-wrapper.visible {
          transform: translateY(0);
          opacity: 1;
        }

        .statusbar-wrapper {
          transition: transform 0.3s ease, opacity 0.3s ease;
          position: relative;
          z-index: 2500;
        }

        .statusbar-wrapper.hidden {
          transform: translateY(100%);
          opacity: 0;
        }

        .statusbar-wrapper.visible {
          transform: translateY(0);
          opacity: 1;
        }

        .toolbar-hover-zone {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 12px;
          z-index: 1000;
        }

        .statusbar-hover-zone {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20px;
          z-index: 2000;
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
          color: var(--text-tertiary);
          opacity: 0.5;
          margin-bottom: 16px;
        }

        .empty-state-btn {
          display: flex;
          align-items: center;
          gap: 8px;
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
