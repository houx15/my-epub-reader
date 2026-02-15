# Task: typography

## Context
This is an Electron + React + TypeScript EPUB reader using epub.js. The app has basic font size control in the settings dialog. We need a more accessible, in-reading-experience typography customizer — an "Aa" button in the toolbar that opens a popover for adjusting font family, size, line height, and reading background color.

**Tech stack:** React 18, TypeScript (strict), Zustand 4, epub.js 0.3.93. The `TypographySettings` type and `typography` store slice are defined in feature/foundation. The `EPUBService.applyTypography()` method is added in feature/book-layout.

## Objective
Create a typography popover component triggered by an "Aa" button. Changes apply live to the epub.js rendition and persist in the Zustand store.

## Dependencies
- Depends on: `feature/book-layout` (uses `EPUBService.applyTypography()` method)
- Branch: feature/typography
- Base: main

## Scope

### Files to Create
- `src/components/Typography/TypographyPopover.tsx` — "Aa" popover with font/size/line-height/background controls
- `src/components/Typography/TypographyPopover.css` — Styles

### Files to Modify
- None directly (wired into toolbar in feature/app-rewire)

### Files NOT to Touch
- `src/App.tsx` — Rewired in feature/app-rewire
- `src/services/epub.ts` — Modified in feature/book-layout only
- `src/stores/appStore.ts` — Modified in feature/foundation only

## Implementation Spec

### Step 1: Create `TypographyPopover.tsx`

```typescript
interface TypographyPopoverProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;  // the "Aa" button for positioning
  onClose: () => void;
  settings: TypographySettings;
  onSettingsChange: (updates: Partial<TypographySettings>) => void;
}
```

**UI layout:**
```
┌─────────────────────────────┐
│ Typography                  │
├─────────────────────────────┤
│ Font Family                 │
│ [Georgia ▾] [Serif ▾]      │
│                             │
│ Font Size                   │
│ [A-] ──────●────── [A+]    │
│            18px             │
│                             │
│ Line Height                 │
│ [≡-] ──────●────── [≡+]    │
│           1.8x              │
│                             │
│ Background                  │
│ ○ ○ ○ ○ ○                  │
│ (white/cream/sepia/gray/   │
│  dark)                      │
└─────────────────────────────┘
```

**Font Family options:**
- `Georgia` (serif, default)
- `'Palatino Linotype', Palatino` (serif)
- `'Merriweather', serif` (serif — note: web font, may not be available)
- `system-ui, -apple-system, sans-serif` (system sans)
- `'Helvetica Neue', Helvetica, Arial, sans-serif` (sans)
- `'Courier New', monospace` (mono)

Render as a `<select>` dropdown with display names.

**Font Size:** Range slider, 14–28px, step 1. Show current value. Plus/minus buttons for precise control.

**Line Height:** Range slider, 1.4–2.2, step 0.1. Show current value.

**Background Color presets:**
- White: `#ffffff`
- Cream: `#fefcf5`
- Sepia: `#f5e6c8`
- Light Gray: `#e8e8e8`
- Dark: `#1e1e1e`

Render as circular color swatches. Selected one has a ring/checkmark.

**Behaviors:**
- Every change immediately calls `onSettingsChange` with the partial update
- The parent applies it to epub.js via `EPUBService.applyTypography()`
- Popover is positioned below the "Aa" anchor button
- Close on click outside
- Close on Escape

### Step 2: Create `TypographyPopover.css`

- Position: absolute or fixed, anchored below the trigger button
- Width: 280px
- Background: `var(--bg-primary)`, border, shadow
- Font family select: styled to match app theme
- Range sliders: custom styled with CSS (`::-webkit-slider-*` pseudo-elements)
- Color swatches: 32px circles with border, selected state with ring
- Smooth transitions on value changes

```css
.typography-popover {
  position: absolute;
  top: 100%;
  right: 0;
  width: 280px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: var(--shadow-lg);
  padding: var(--spacing-md);
  z-index: 50;
}

.typo-range {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  outline: none;
}

.typo-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  background: var(--accent-color);
  border-radius: 50%;
  cursor: pointer;
}

.bg-swatch {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid var(--border-color);
  cursor: pointer;
}

.bg-swatch.selected {
  border-color: var(--accent-color);
  box-shadow: 0 0 0 2px var(--accent-color);
}
```

### Step 3: Integration hook (for use in app-rewire)

The popover is designed to be used like this in the toolbar:

```tsx
const { typography, setTypography } = useAppStore();
const aaButtonRef = useRef<HTMLButtonElement>(null);
const [isTypoOpen, setIsTypoOpen] = useState(false);

// When settings change, apply to epub
useEffect(() => {
  const epubService = getEPUBService();
  epubService.applyTypography(typography);
}, [typography]);

<button ref={aaButtonRef} onClick={() => setIsTypoOpen(!isTypoOpen)}>Aa</button>
<TypographyPopover
  isOpen={isTypoOpen}
  anchorRef={aaButtonRef}
  onClose={() => setIsTypoOpen(false)}
  settings={typography}
  onSettingsChange={setTypography}
/>
```

This integration code will live in the toolbar during app-rewire. The popover just needs to render correctly when given these props.

## Testing Requirements
- Popover opens and closes correctly
- Font family change applies to epub content
- Font size slider changes text size in epub
- Line height slider changes spacing in epub
- Background color presets change epub background
- Changes are reflected immediately (no need to re-render)
- Popover closes on outside click and Escape

## Acceptance Criteria
- [ ] `TypographyPopover` renders with font family, size, line height, and background controls
- [ ] All controls update settings via `onSettingsChange` callback
- [ ] Font family rendered as dropdown with 6 options
- [ ] Font size has range slider (14-28px) with plus/minus buttons
- [ ] Line height has range slider (1.4-2.2) with display value
- [ ] Background has 5 color presets rendered as circular swatches
- [ ] Popover closes on outside click and Escape
- [ ] `npx tsc --noEmit` passes

## Notes
- The `applyTypography` method on `EPUBService` is created in feature/book-layout. If testing this component standalone, you can mock that integration.
- Don't try to use Google Fonts or load external fonts — stick with system fonts that are likely to be available.
- The popover should work in both light and dark themes (use CSS variables).
- The "Aa" button itself will be added to the toolbar in feature/app-rewire — this feature only creates the popover component.
