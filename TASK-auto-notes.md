# Task: auto-notes

## Context
This is an Electron + React + TypeScript EPUB reader being refactored from a three-column layout to an immersive book-like reader. The app already has a full notes editor (`NotesEditor.tsx` with TipTap) and highlights system (from feature/highlights).

We need a new "Notebook" slide-out panel that auto-generates a structured notes.md from highlights, grouped by chapter, and allows the user to view/edit notes without leaving the reading experience.

**Tech stack:** React 18, TypeScript (strict), Zustand 4, TipTap editor (already installed), marked for Markdown rendering.

## Objective
Create a slide-out Notebook panel that auto-generates structured notes from highlights grouped by chapter, and allows manual editing. The panel slides in from the right when activated.

## Dependencies
- Depends on: `feature/highlights` (uses `Highlight` type and highlights from store)
- Branch: feature/auto-notes
- Base: main

## Scope

### Files to Create
- `src/components/Notebook/Notebook.tsx` — Slide-out notebook panel component
- `src/components/Notebook/Notebook.css` — Styles for slide-out panel
- `src/components/Notebook/NotebookEntry.tsx` — Individual highlight/note entry component
- `src/services/notesGenerator.ts` — Logic to generate structured Markdown from highlights

### Files to Modify
- `src/services/noteUtils.ts` — Add helper to merge auto-generated notes with manual edits (minor additions)

### Files NOT to Touch
- `src/App.tsx` — Rewired in feature/app-rewire
- `src/components/NotesEditor/*` — Keep old editor intact
- `src/stores/appStore.ts` — Modified in feature/foundation only
- `src/services/storage.ts` — Modified in feature/foundation only

## Implementation Spec

### Step 1: Create `notesGenerator.ts`

A pure function that takes highlights and generates structured Markdown:

```typescript
export function generateNotesFromHighlights(
  highlights: Highlight[],
  bookTitle: string,
  author: string
): string
```

**Output format:**
```markdown
# Reading Notes: {bookTitle}
**Author:** {author}
**Generated:** {date}

---

## {Chapter Title 1}

> {highlighted text}

*{annotation if any}*

`{color emoji}` — {timestamp}

---

> {another highlight}

---

## {Chapter Title 2}

...
```

**Logic:**
1. Sort highlights by chapter order (use `chapterId` or `createdAt` as proxy)
2. Group by `chapterTitle`
3. Within each chapter, sort by `createdAt`
4. For each highlight: blockquote the text, add annotation in italics if present, add metadata line with color indicator and date

Color emoji mapping: yellow→🟡, green→🟢, blue→🔵, pink→🩷, orange→🟠

### Step 2: Create `NotebookEntry.tsx`

An individual entry showing one highlight with its annotation.

```typescript
interface NotebookEntryProps {
  highlight: Highlight;
  onClickHighlight: (highlight: Highlight) => void;  // navigate to location in book
  onEditAnnotation: (id: string, annotation: string) => void;
  onDelete: (id: string) => void;
}
```

**UI:**
- Color indicator bar on the left edge (4px wide, highlight color)
- Quoted text (truncated with expand-on-click)
- Annotation text (editable textarea, auto-save on blur)
- Chapter name in small muted text
- Date in small muted text
- Click on quoted text → calls `onClickHighlight` to navigate to that CFI in the book
- Small delete icon (trash) on hover

### Step 3: Create `Notebook.tsx`

The slide-out panel component.

```typescript
interface NotebookProps {
  isOpen: boolean;
  onClose: () => void;
  highlights: Highlight[];
  bookTitle: string;
  bookAuthor: string;
  onNavigateToHighlight: (cfi: string) => void;
  onEditAnnotation: (id: string, annotation: string) => void;
  onDeleteHighlight: (id: string) => void;
  onExportNotes: () => void;
}
```

**Structure:**
```
<div className={`notebook-panel ${isOpen ? 'open' : ''}`}>
  <div className="notebook-header">
    <h3>Notebook</h3>
    <div className="notebook-actions">
      <button onClick={onExportNotes}>Export</button>
      <button onClick={onClose}>✕</button>
    </div>
  </div>
  <div className="notebook-content">
    {grouped highlights by chapter, each with chapter heading}
    {for each highlight: <NotebookEntry />}
  </div>
  <div className="notebook-footer">
    <span>{highlights.length} highlights</span>
  </div>
</div>
```

**Behaviors:**
- Slides in from the right with CSS transition (`transform: translateX`)
- Width: 380px
- Has backdrop overlay that closes the panel on click
- Grouped by chapter with collapsible chapter headings
- "Export" button calls `onExportNotes` which generates Markdown using `notesGenerator.ts` and triggers a save dialog

### Step 4: Create `Notebook.css`

```css
.notebook-panel {
  position: fixed;
  top: 0;
  right: 0;
  width: 400px;
  height: 100vh;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 100;
  display: flex;
  flex-direction: column;
}

.notebook-panel.open {
  transform: translateX(0);
}

.notebook-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 99;
}
```

Style `NotebookEntry` with:
- Left color bar using `border-left: 4px solid {color}`
- Hover state revealing delete button
- Clickable quote text with subtle underline on hover

### Step 5: Add export helper in `noteUtils.ts`

Add a function:
```typescript
export function stripMarkdownForExport(content: string): string
```
That removes internal anchors (`<!-- loc:... -->`) from generated notes for clean export.

## Testing Requirements
- Notes are auto-generated from highlights correctly grouped by chapter
- Panel slides in/out smoothly
- Clicking a highlight quote navigates to that location in the book
- Editing an annotation saves it
- Deleting a highlight from notebook removes it
- Export generates clean Markdown file

## Acceptance Criteria
- [ ] `Notebook` panel slides in from right when opened
- [ ] Highlights are displayed grouped by chapter
- [ ] Each entry shows highlighted text, annotation, color, and date
- [ ] Clicking a quote navigates to the highlight location in the book
- [ ] Annotations are editable inline
- [ ] Export generates well-formatted Markdown notes
- [ ] `npx tsc --noEmit` passes

## Notes
- The existing `NotesEditor` (TipTap-based) is NOT being replaced — it remains for users who want a freeform editor. The Notebook is a structured view derived from highlights.
- Use the same CSS variable system for theming.
- The notebook is a "view" of highlights data — it doesn't have its own separate data store.
- Keep export simple — use the `window.electron.showSaveDialog` pattern already used in `App.tsx`.
