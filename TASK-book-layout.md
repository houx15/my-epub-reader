# Task: book-layout

## Context
This is an Electron + React + TypeScript EPUB reader using epub.js with Zustand state management. Currently the EPUB is rendered in a single-pane viewer (`EPUBViewer.tsx`) using epub.js's default manager with `flow: 'paginated'` and `spread: 'none'`.

We're transforming this into an immersive two-page book spread with a visible spine/gutter, page-stack progress indicator (visual thickness of pages read), and page-turn animations.

**Tech stack:** React 18, TypeScript (strict), Zustand 4, epub.js 0.3.93, CSS variables in `src/styles/globals.css`.

## Objective
Create a `BookLayout` component that renders the EPUB as a two-page spread resembling an open physical book — with a center spine, page-edge shadows, page-stack thickness indicator, and CSS page-turn animation on navigation.

## Dependencies
- Depends on: `feature/foundation` (uses `TypographySettings` type from store, `PanelMode`)
- Branch: feature/book-layout
- Base: main

## Scope

### Files to Create
- `src/components/BookLayout/BookLayout.tsx` — Main two-page spread container component
- `src/components/BookLayout/BookLayout.css` — Styles for book spread, spine, page stack, animations
- `src/components/BookLayout/PageStack.tsx` — Visual page-thickness progress indicator

### Files to Modify
- `src/services/epub.ts` — Change `renderToElement` to support `spread: 'auto'` or two-page mode, add `setFontSize` method, expose font/style injection

### Files NOT to Touch
- `src/App.tsx` — Will be rewired in feature/app-rewire
- `src/components/EPUBViewer/*` — Keep old viewer intact; new layout replaces it at integration
- `src/stores/appStore.ts` — Modified only in feature/foundation
- `src/types/index.ts` — Modified only in feature/foundation

## Implementation Spec

### Step 1: Modify `EPUBService` in `src/services/epub.ts`

Add a new render method or modify `renderToElement` to accept options:

```typescript
interface RenderOptions {
  width?: number;
  height?: number;
  spread?: 'none' | 'auto' | 'always';
  flow?: 'paginated' | 'scrolled';
}
```

Update `renderToElement` to accept `RenderOptions` with default `spread: 'auto'` (instead of current `'none'`). This makes epub.js display two pages side by side when the container is wide enough.

Add method:
```typescript
applyTypography(settings: { fontFamily?: string; fontSize?: number; lineHeight?: number }): void
```
- Uses `this.rendition.themes.override()` to apply font-family, font-size, and line-height to the epub content.

Add method:
```typescript
getProgress(): { currentPage: number; totalPages: number; percentage: number }
```
- Uses `this.book.locations` (already generated in background) to compute progress.

### Step 2: Create `BookLayout.tsx`

A container component that wraps the epub.js rendition in a book-like visual frame.

**Props:**
```typescript
interface BookLayoutProps {
  onRenderReady: (element: HTMLElement, width: number, height: number) => void;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onChapterSelect: (href: string) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  progress: number;  // 0–1 reading progress
}
```

**Structure (JSX):**
```
<div className="book-layout">
  <div className="book-container">
    <div className="page-stack page-stack-left" />  <!-- visual thickness left -->
    <div className="book-spread">
      <div className="book-page book-page-left">
        <!-- epub.js renders here (left page) -->
      </div>
      <div className="book-spine" />
      <div className="book-page book-page-right">
        <!-- epub.js renders here (right page) -->
      </div>
    </div>
    <div className="page-stack page-stack-right" /> <!-- visual thickness right -->
  </div>
  <PageStack progress={progress} />
</div>
```

**Key behaviors:**
- The `book-spread` div is the actual epub.js container — epub.js with `spread: 'auto'` handles putting content on two columns.
- Clicking the left third of the spread → `onPrevPage`, right third → `onNextPage`.
- Arrow key navigation triggers a CSS page-turn animation class briefly.
- The `book-spine` is a narrow vertical decorative element in the center.

**Note on epub.js spread rendering:** With `spread: 'auto'`, epub.js uses CSS columns to render two pages side by side in one container. We do NOT need two separate containers. The `book-page-left` and `book-page-right` are visual framing divs, and the actual epub iframe fills the `book-spread` area.

### Step 3: Create `BookLayout.css`

**Book container styling:**
- `book-layout`: Full available height, centered, warm background (`var(--bg-secondary)`)
- `book-container`: Max-width ~1200px, centered, perspective for 3D transforms
- `book-spread`: The main reading area with subtle box-shadow for "open book" look, `min-height: calc(100vh - var(--toolbar-height) - var(--statusbar-height) - 80px)`, white/cream background
- `book-spine`: 4px wide, vertical gradient (dark brown → lighter) positioned at horizontal center, `box-shadow` on both sides for depth

**Page stack (visual page thickness):**
- Left stack: represents pages already read — grows thicker as progress increases
- Right stack: represents pages remaining — grows thinner
- Use stacked `box-shadow` or pseudo-elements to simulate page edges
- `page-stack-left { width: calc(3px + ${progress} * 12px) }` etc.

**Page-turn animation:**
```css
.book-spread.turning-forward {
  animation: page-turn-forward 0.4s ease-out;
}

.book-spread.turning-backward {
  animation: page-turn-backward 0.4s ease-out;
}

@keyframes page-turn-forward {
  0% { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
  40% { transform: perspective(1200px) rotateY(-3deg); opacity: 0.85; }
  100% { transform: perspective(1200px) rotateY(0deg); opacity: 1; }
}
```

**Click zones for navigation:**
- Left 30% of `book-spread` → cursor: `w-resize`, click goes to prev page
- Right 30% of `book-spread` → cursor: `e-resize`, click goes to next page
- Center 40% → normal cursor (for text selection)

### Step 4: Create `PageStack.tsx`

A small visual component below or beside the book showing reading progress.

```typescript
interface PageStackProps {
  progress: number; // 0-1
}
```

Renders a horizontal bar with two segments:
- Left segment (read pages): filled, width proportional to progress
- Right segment (remaining): lighter
- Show percentage text label

### Step 5: Wire up page-turn animation

In `BookLayout.tsx`, when `onNextPage` or `onPrevPage` is called:
1. Add CSS class `turning-forward` or `turning-backward` to `book-spread`
2. Remove it after animation ends (listen for `animationend` event or use `setTimeout(400)`)

## Testing Requirements
- Component renders without errors when given valid props
- epub.js renders in two-page spread mode (content spans two columns)
- Page-turn animation triggers on forward/backward navigation
- PageStack displays correct progress
- Click zones work: left side → prev, right side → next
- Responsive: on narrow windows, falls back gracefully (epub.js handles this with `spread: 'auto'`)

## Acceptance Criteria
- [ ] `BookLayout` component renders an open-book style visual with spine
- [ ] epub.js is configured with `spread: 'auto'` for two-page display
- [ ] Page-turn CSS animation plays on navigation
- [ ] `PageStack` shows reading progress visually
- [ ] Click zones on left/right of spread navigate pages
- [ ] `EPUBService` has `applyTypography` and `getProgress` methods
- [ ] `npx tsc --noEmit` passes

## Notes
- epub.js 0.3.93's `spread: 'auto'` uses CSS columns — it renders both pages inside a single iframe. Don't try to create two separate renditions.
- The `renderToElement` call happens from `useEPUB.renderToElement` — don't break that contract. Just change the default options.
- Keep the existing `EPUBViewer` component untouched. `BookLayout` is a replacement that will be wired in during feature/app-rewire.
- The `progress` prop will come from `EPUBService.getProgress()` called in `useEPUB` — update `useEPUB` to expose progress if needed.
