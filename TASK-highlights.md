# Task: highlights

## Context
This is an Electron + React + TypeScript EPUB reader using epub.js with Zustand state management. The app already has text selection handling in `useSelection.ts` and a `SelectionPopover` component. We need to add inline highlight/annotation support: users can highlight text in the EPUB, add annotations, and persist them.

**Tech stack:** React 18, TypeScript (strict), Zustand 4, epub.js 0.3.93, uuid for ID generation.

## Objective
Implement a full inline highlight system: create highlights from text selections, render them visually in the EPUB content, allow click-to-edit/delete, persist highlights per book, and restore them on book reload.

## Dependencies
- Depends on: `feature/foundation` (uses `Highlight`, `HighlightColor` types; `highlights` store slice; `saveHighlights`/`loadHighlights` storage methods)
- Branch: feature/highlights
- Base: main

## Scope

### Files to Create
- `src/hooks/useHighlights.ts` — Hook for highlight CRUD, persistence, and epub.js highlight rendering
- `src/components/Highlights/HighlightPopover.tsx` — Popover for clicking existing highlights (edit annotation, change color, delete, ask AI)
- `src/components/Highlights/HighlightPopover.css` — Styles
- `src/components/Highlights/ColorPicker.tsx` — Small color dot picker component for highlight colors

### Files to Modify
- `src/hooks/useSelection.ts` — Add "Highlight" action to selection flow; pass highlight creation callback
- `src/components/EPUBViewer/SelectionPopover.tsx` — Add "Highlight" button with color picker to the popover

### Files NOT to Touch
- `src/App.tsx` — Rewired in feature/app-rewire
- `src/stores/appStore.ts` — Modified in feature/foundation only
- `src/services/storage.ts` — Modified in feature/foundation only
- `src/services/epub.ts` — Modified in feature/book-layout only

## Implementation Spec

### Step 1: Create `useHighlights.ts` hook

```typescript
interface UseHighlightsReturn {
  highlights: Highlight[];
  createHighlight: (selection: Selection, color: HighlightColor, annotation?: string) => Highlight;
  updateHighlight: (id: string, updates: Partial<Pick<Highlight, 'color' | 'annotation'>>) => void;
  removeHighlight: (id: string) => void;
  renderHighlights: () => void;  // re-applies all highlights to epub.js rendition
  activeHighlight: Highlight | null;
  setActiveHighlight: (highlight: Highlight | null) => void;
  loadHighlightsForBook: (bookId: string) => Promise<void>;
}
```

**Key implementation details:**

**`createHighlight`:**
- Generate ID with `v4()` from uuid
- Create `Highlight` object from the Selection's cfi, text, chapterId, chapterTitle
- Add to store via `addHighlight`
- Apply highlight to epub.js rendition using `rendition.annotations.highlight(cfi, {}, callback, className, styles)`
- Save all highlights to storage (debounced)

**`renderHighlights`:**
- Called after rendition is ready or after page navigation
- Clears existing annotations and re-applies all highlights for the current chapter
- Uses `rendition.annotations.highlight()` for each highlight
- Each annotation gets a click handler that sets `activeHighlight`

**`loadHighlightsForBook`:**
- Load from storage via `loadHighlights(bookId)`
- Set in store via `setHighlights`

**Persistence:**
- After any create/update/delete, debounce-save (500ms) all highlights to storage via `saveHighlights`

**epub.js annotation API:**
```typescript
// epub.js highlight API:
rendition.annotations.highlight(
  cfiRange,           // the CFI range string
  data,               // arbitrary data object (store highlight id)
  callback,           // click callback
  className,          // CSS class name
  styles              // inline styles object
);

// Remove:
rendition.annotations.remove(cfiRange, 'highlight');
```

**Styles for highlight colors:**
```typescript
const HIGHLIGHT_STYLES: Record<HighlightColor, object> = {
  yellow: { 'fill': 'rgba(255, 235, 59, 0.35)', 'fill-opacity': '0.35', 'mix-blend-mode': 'multiply' },
  green:  { 'fill': 'rgba(76, 175, 80, 0.3)', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
  blue:   { 'fill': 'rgba(33, 150, 243, 0.25)', 'fill-opacity': '0.25', 'mix-blend-mode': 'multiply' },
  pink:   { 'fill': 'rgba(233, 30, 99, 0.25)', 'fill-opacity': '0.25', 'mix-blend-mode': 'multiply' },
  orange: { 'fill': 'rgba(255, 152, 0, 0.3)', 'fill-opacity': '0.3', 'mix-blend-mode': 'multiply' },
};
```

### Step 2: Create `ColorPicker.tsx`

A row of 5 colored dots (yellow, green, blue, pink, orange) that the user clicks to select a highlight color.

```typescript
interface ColorPickerProps {
  selectedColor: HighlightColor;
  onColorSelect: (color: HighlightColor) => void;
  size?: 'small' | 'medium';  // dot size
}
```

Each dot is a `<button>` with a colored circle (CSS background). Selected dot has a ring/border.

### Step 3: Modify `SelectionPopover.tsx`

Add a "Highlight" button to the existing popover. When clicked:
1. Show the `ColorPicker` inline in the popover (expand the popover to show color options)
2. On color selection, call `createHighlight` with the current selection and chosen color
3. Close the popover

Add a new prop: `onHighlight: (color: HighlightColor) => void`

The flow:
- User selects text → popover appears with existing buttons + new "🖍 Highlight" button
- User clicks "Highlight" → popover expands to show ColorPicker
- User clicks a color → highlight is created, popover closes

### Step 4: Create `HighlightPopover.tsx`

A popover that appears when clicking an existing highlight in the EPUB.

```typescript
interface HighlightPopoverProps {
  highlight: Highlight;
  position: { x: number; y: number };
  onUpdateAnnotation: (id: string, annotation: string) => void;
  onChangeColor: (id: string, color: HighlightColor) => void;
  onDelete: (id: string) => void;
  onAskAI: (highlight: Highlight) => void;
  onClose: () => void;
}
```

**UI:**
- Show the highlighted text (truncated to ~80 chars)
- `ColorPicker` to change color
- Annotation textarea (editable, auto-save on blur)
- Buttons: "Ask AI", "Delete"
- Close on click outside

### Step 5: Modify `useSelection.ts`

Add the `onHighlight` callback to the selection handling flow:
- When creating a selection, also pass it to the highlight system if the user chooses to highlight
- The `handleSelected` callback should check if the selected CFI range overlaps with an existing highlight — if so, show `HighlightPopover` instead of `SelectionPopover`

Add to the return type:
```typescript
highlightPopoverData: { highlight: Highlight; position: { x: number; y: number } } | null;
```

When the user clicks on a highlighted region (detected via epub.js annotation click callback), populate `highlightPopoverData`.

## Testing Requirements
- Creating a highlight applies visual highlight in epub.js
- Highlight persists: close and reopen book → highlights are restored
- Clicking a highlight shows HighlightPopover with correct data
- Changing color updates the visual highlight
- Deleting a highlight removes it visually and from storage
- Annotation text is saved on blur
- All 5 highlight colors render with correct visual style

## Acceptance Criteria
- [ ] `useHighlights` hook manages highlight CRUD with persistence
- [ ] Text selection popover includes "Highlight" button with color picker
- [ ] Highlights are visually rendered in the EPUB via epub.js annotations API
- [ ] Clicking an existing highlight shows edit popover (change color, edit annotation, delete, ask AI)
- [ ] Highlights persist to `{bookDir}/highlights.json` and restore on book load
- [ ] `npx tsc --noEmit` passes

## Notes
- epub.js annotations use SVG overlays. The `styles` object passed to `highlight()` uses SVG fill properties, not CSS background.
- epub.js re-renders content on page turn, so highlights need to be re-applied. The `rendition.on('rendered')` event can be used to re-apply highlights for the current section.
- Be careful with CFI ranges — they can span multiple elements. epub.js handles this but the visual result may vary.
- The annotation click callback in epub.js fires with the CFI range and the data object — use the highlight ID stored in data to look up the full highlight.
