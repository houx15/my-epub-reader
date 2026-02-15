# Task: app-rewire

## Context
This is the final integration step for the EPUB reader refactoring. All component features have been built in separate branches:
- `feature/foundation` — Types, store, storage for highlights/typography/panelMode
- `feature/book-layout` — BookLayout component with two-page spread, PageStack, epub.ts enhancements
- `feature/highlights` — useHighlights hook, HighlightPopover, ColorPicker, modified SelectionPopover
- `feature/auto-notes` — Notebook slide-out panel, NotebookEntry, notesGenerator
- `feature/ai-overlay` — AIOverlay slide-in chat component
- `feature/typography` — TypographyPopover component

Now we need to rewire `App.tsx` to use the new components, simplify the toolbar, and clean up old components.

**Tech stack:** React 18, TypeScript (strict), Zustand 4, epub.js 0.3.93.

## Objective
Replace the three-column layout with the immersive book layout, wire all new components together in `App.tsx`, simplify the toolbar, and remove old unused components.

## Dependencies
- Depends on: ALL other features (foundation, book-layout, highlights, auto-notes, ai-overlay, typography)
- Branch: feature/app-rewire
- Base: main (after all other features are merged)

## Scope

### Files to Modify
- `src/App.tsx` — Complete rewrite of main application layout
- `src/components/Toolbar/Toolbar.tsx` — Simplify: just Open, book title, Aa, Notebook, AI, Settings
- `src/components/Toolbar/Toolbar.css` — Updated styles for simplified toolbar
- `src/components/StatusBar/StatusBar.tsx` — Update to show reading progress from BookLayout
- `src/hooks/useKeyboardShortcuts.ts` — Update shortcuts for new UI (toggle notebook, toggle AI, etc.)

### Files to Delete (after verification)
- `src/components/Layout/ThreeColumnLayout.tsx` — Replaced by BookLayout
- `src/components/Layout/ThreeColumnLayout.css` — No longer needed
- `src/components/LLMPanel/LLMPanel.tsx` — Replaced by AIOverlay
- `src/components/LLMPanel/LLMPanel.css` — No longer needed

### Files NOT to Touch
- `src/services/epub.ts` — Already modified in book-layout
- `src/services/storage.ts` — Already modified in foundation
- `src/stores/appStore.ts` — Already modified in foundation
- `src/types/index.ts` — Already modified in foundation
- `src/hooks/useLLM.ts` — Reused as-is by AIOverlay
- `src/components/EPUBViewer/*` — Keep as fallback (may be useful for single-page mode)

## Implementation Spec

### Step 1: Rewrite `App.tsx`

The new App structure:

```tsx
function App() {
  // Existing hooks
  const { currentBook, chapters, currentChapter, isLoading, loadBook, navigateToChapter, nextPage, prevPage, renderToElement, goToLocation } = useEPUB();
  const { panelMode, setPanelMode, typography, setTypography } = useAppStore();
  const { effectiveTheme } = useTheme();

  // Highlights hook
  const { highlights, createHighlight, updateHighlight, removeHighlight, renderHighlights, activeHighlight, setActiveHighlight, loadHighlightsForBook } = useHighlights();

  // Notes (keep for auto-save, but less prominent)
  const { content: noteContent, setContent: setNoteContent, saveNotes, loadNotes } = useNotes();

  // AI overlay state
  const [aiContext, setAiContext] = useState<{text: string; cfi: string; chapterTitle: string} | null>(null);

  // Reading progress
  const [progress, setProgress] = useState(0);

  // Settings dialog
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load highlights when book changes
  useEffect(() => {
    if (currentBook) {
      loadHighlightsForBook(currentBook.id);
    }
  }, [currentBook?.id]);

  // Apply typography to epub when it changes
  useEffect(() => {
    const epubService = getEPUBService();
    epubService.applyTypography(typography);
  }, [typography]);

  return (
    <div className="app">
      {/* Simplified Toolbar */}
      <Toolbar
        bookTitle={currentBook?.title || null}
        onOpenFile={handleOpenFile}
        onOpenSettings={() => setSettingsOpen(true)}
        hasBook={!!currentBook}
        onToggleNotebook={() => setPanelMode(panelMode === 'notebook' ? 'reading' : 'notebook')}
        onToggleAI={() => setPanelMode(panelMode === 'ai' ? 'reading' : 'ai')}
        panelMode={panelMode}
        typography={typography}
        onTypographyChange={setTypography}
      />

      {/* Main Content: BookLayout replaces ThreeColumnLayout */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !currentBook ? (
        <EmptyState onOpenFile={handleOpenFile} />
      ) : (
        <BookLayout
          onRenderReady={handleRenderReady}
          chapters={chapters}
          currentChapter={currentChapter}
          onChapterSelect={navigateToChapter}
          onNextPage={nextPage}
          onPrevPage={prevPage}
          progress={progress}
        />
      )}

      {/* Notebook slide-out */}
      <Notebook
        isOpen={panelMode === 'notebook'}
        onClose={() => setPanelMode('reading')}
        highlights={highlights}
        bookTitle={currentBook?.title || ''}
        bookAuthor={currentBook?.author || ''}
        onNavigateToHighlight={(cfi) => goToLocation(cfi)}
        onEditAnnotation={(id, ann) => updateHighlight(id, { annotation: ann })}
        onDeleteHighlight={removeHighlight}
        onExportNotes={handleExportNotes}
      />

      {/* AI Overlay */}
      <AIOverlay
        isOpen={panelMode === 'ai'}
        onClose={() => setPanelMode('reading')}
        bookTitle={currentBook?.title || ''}
        bookId={currentBook?.id || ''}
        initialContext={aiContext}
        onInsertToNotes={handleInsertSummary}
      />

      {/* StatusBar */}
      <StatusBar
        currentChapter={currentChapter}
        totalChapters={chapters.length}
        currentChapterIndex={chapters.findIndex(ch => ch.id === currentChapter?.id)}
        progress={progress}
      />

      <SettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
```

### Step 2: Simplify `Toolbar.tsx`

New toolbar layout:
```
[ 📖 Open ] [ Book Title                    ] [ Aa ] [ 📓 ] [ 💬 ] [ ⚙️ ]
```

- Remove "Export Notes" from toolbar (it's in the Notebook now)
- Add "Aa" button that toggles TypographyPopover
- Add Notebook toggle button (📓) — active state when notebook is open
- Add AI toggle button (💬) — active state when AI is open
- Keep Open and Settings buttons

New props:
```typescript
interface ToolbarProps {
  bookTitle: string | null;
  onOpenFile: () => void;
  onOpenSettings: () => void;
  hasBook: boolean;
  onToggleNotebook: () => void;
  onToggleAI: () => void;
  panelMode: PanelMode;
  typography: TypographySettings;
  onTypographyChange: (updates: Partial<TypographySettings>) => void;
}
```

### Step 3: Update `StatusBar.tsx`

Add `progress` prop (0–1) and show it as a percentage alongside existing chapter info.

Remove `wordCount` prop (no longer showing notes word count in status bar).

### Step 4: Update `useKeyboardShortcuts.ts`

Update shortcuts:
- `Cmd/Ctrl + /` → Toggle AI overlay (was: toggle LLM panel)
- `Cmd/Ctrl + B` → Toggle Notebook
- `Escape` → Close any open panel (set panelMode to 'reading')
- Keep existing: arrow keys for pages, Cmd+O for open, Cmd+S for save, Cmd+, for settings

New handler props:
```typescript
interface ShortcutHandlers {
  onOpenFile?: () => void;
  onSaveNotes?: () => void;
  onToggleAI?: () => void;
  onToggleNotebook?: () => void;
  onEscape?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onOpenSettings?: () => void;
}
```

### Step 5: Wire highlight → AI flow

When user clicks "Ask AI" in `HighlightPopover`:
1. Set `aiContext` to the highlight's text/cfi/chapterTitle
2. Set `panelMode` to `'ai'`
3. AIOverlay opens with the highlight context pre-loaded

### Step 6: Delete old components

Remove the following files that are no longer used:
- `src/components/Layout/ThreeColumnLayout.tsx`
- `src/components/Layout/ThreeColumnLayout.css`
- `src/components/LLMPanel/LLMPanel.tsx`
- `src/components/LLMPanel/LLMPanel.css`

Also clean up old store fields in `appStore.ts`:
- Remove `isLLMPanelCollapsed` and `toggleLLMPanel` (replaced by `panelMode`)
- Remove `noteInsertRequest`, `requestNoteInsert`, `clearNoteInsertRequest` (replaced by direct highlight-to-notes flow)

### Step 7: Clean up imports

Remove all imports of deleted components from any file. Ensure no dead imports remain.

## Testing Requirements
- App launches without errors
- Open EPUB → displays as two-page spread in BookLayout
- Arrow keys navigate with animation
- "Aa" button → typography popover → changes apply
- Select text → popover → "Highlight" → text highlighted
- Click highlight → edit/AI/remove popover
- Open notebook → highlights grouped by chapter
- "Ask AI" on highlight → AI overlay slides in with context
- Close and reopen book → highlights restored
- All keyboard shortcuts work
- Dark/light theme works throughout

## Acceptance Criteria
- [ ] `App.tsx` uses BookLayout instead of ThreeColumnLayout
- [ ] Toolbar has Open, book title, Aa, Notebook, AI, Settings buttons
- [ ] Notebook and AI panels are slide-in overlays (not permanent columns)
- [ ] Highlight → Ask AI flow works end-to-end
- [ ] Typography popover works from toolbar
- [ ] StatusBar shows reading progress
- [ ] Keyboard shortcuts updated for new UI
- [ ] Old ThreeColumnLayout and LLMPanel files deleted
- [ ] Old store fields (isLLMPanelCollapsed etc.) cleaned up
- [ ] `npx tsc --noEmit` passes
- [ ] `npm run dev` launches without errors

## Notes
- This is the final integration branch — it should be the last one merged.
- All other feature branches must be merged into main before this one is branched off or rebased.
- Be careful with import paths — new components are in `src/components/BookLayout/`, `src/components/Highlights/`, `src/components/Notebook/`, `src/components/AIOverlay/`, `src/components/Typography/`.
- The `NotesEditor` component is kept but not shown in the main UI — it could be added back as a tab in the Notebook if needed later.
- Test the full flow: open book → read → select → highlight → annotate → ask AI → notebook → export.
