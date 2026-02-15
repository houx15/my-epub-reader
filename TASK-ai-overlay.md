# Task: ai-overlay

## Context
This is an Electron + React + TypeScript EPUB reader being refactored. Currently the AI chat is a permanently visible panel (`LLMPanel.tsx`) in a three-column layout. We're replacing it with an on-demand slide-in overlay modal that can be triggered from highlight popovers or a toolbar button.

**Tech stack:** React 18, TypeScript (strict), Zustand 4, marked for Markdown rendering. The existing `useLLM` hook handles all LLM interactions (chat, summarize, organize notes) and is fully functional.

## Objective
Create an `AIOverlay` component — a modal/overlay panel that slides in from the right, reuses the existing `useLLM` hook for all AI functionality, and can be triggered from highlight context or standalone.

## Dependencies
- Depends on: `feature/highlights` (triggers AI from highlight popover, passes highlight context)
- Branch: feature/ai-overlay
- Base: main

## Scope

### Files to Create
- `src/components/AIOverlay/AIOverlay.tsx` — Slide-in AI chat overlay component
- `src/components/AIOverlay/AIOverlay.css` — Styles for overlay

### Files to Modify
- None directly (integration happens in feature/app-rewire)

### Files NOT to Touch
- `src/components/LLMPanel/*` — Keep old panel intact (removed in app-rewire)
- `src/hooks/useLLM.ts` — Reuse as-is, don't modify
- `src/App.tsx` — Rewired in feature/app-rewire
- `src/stores/appStore.ts` — Modified in feature/foundation only

## Implementation Spec

### Step 1: Create `AIOverlay.tsx`

```typescript
interface AIOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  bookTitle: string;
  bookId: string;
  initialContext?: {
    text: string;
    cfi: string;
    chapterTitle: string;
  } | null;
  onInsertToNotes?: (summary: string) => void;
}
```

**Structure:**
```
<>
  {isOpen && <div className="ai-overlay-backdrop" onClick={onClose} />}
  <div className={`ai-overlay ${isOpen ? 'open' : ''}`}>
    <div className="ai-overlay-header">
      <h3>AI Assistant</h3>
      <button onClick={onClose}>✕</button>
    </div>

    {/* Context display */}
    {initialContext && (
      <div className="ai-context">
        <div className="ai-context-label">Discussing:</div>
        <blockquote>{initialContext.text}</blockquote>
        <span className="ai-context-chapter">{initialContext.chapterTitle}</span>
      </div>
    )}

    {/* Chat sessions tabs */}
    <div className="ai-sessions">...</div>

    {/* Messages */}
    <div className="ai-messages">
      {messages.map(...)}
    </div>

    {/* Input */}
    <div className="ai-input">
      <textarea ... />
      <button>Send</button>
    </div>
  </div>
</>
```

**Behaviors:**
- Uses `useLLM` hook internally for all chat state and API calls
- When `initialContext` is provided (from a highlight), auto-prepares a session for that context using `prepareSessionForSelection`
- Convert `initialContext` to a `Selection` object for `useLLM`:
  ```typescript
  const contextAsSelection: Selection = {
    text: initialContext.text,
    chapterId: '', // can be empty
    chapterTitle: initialContext.chapterTitle,
    cfi: initialContext.cfi,
    timestamp: Date.now(),
  };
  ```
- Messages are rendered with Markdown (use `marked.parse()` for assistant messages, same as `LLMPanel`)
- Session switcher (compact horizontal tabs or dropdown)
- "Summarize to Notes" button calls `summarizeConversation()` and passes result to `onInsertToNotes`
- Keyboard: Escape closes the overlay, Enter sends message (Shift+Enter for newline)

**Reuse from LLMPanel:**
- The entire chat logic: `useLLM` hook — sessions, messages, send, summarize, clear
- Message rendering pattern with `marked`
- Session management (new, switch, history)
- Input handling (Enter to send, Shift+Enter for newline)

### Step 2: Create `AIOverlay.css`

```css
.ai-overlay {
  position: fixed;
  top: 0;
  right: 0;
  width: 440px;
  height: 100vh;
  background: var(--bg-primary);
  border-left: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  transform: translateX(100%);
  transition: transform 0.3s ease;
  z-index: 200;  /* above notebook */
  display: flex;
  flex-direction: column;
}

.ai-overlay.open {
  transform: translateX(0);
}

.ai-overlay-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
  z-index: 199;
}
```

Style the messages area similar to `LLMPanel.css`:
- Message bubbles with role-based styling (user vs assistant)
- Typing indicator animation
- Markdown content styling for assistant responses
- Context blockquote styling (subtle background, left border)
- Compact session tabs

**Key differences from LLMPanel:**
- Overlay positioning (fixed, slides from right)
- More generous padding and spacing
- Context block at the top with the highlighted text
- Larger, more comfortable input area

### Step 3: Interaction patterns

When opened from a highlight's "Ask AI" button:
1. `AIOverlay` opens with `initialContext` containing the highlighted text
2. `useLLM.prepareSessionForSelection` is called with the context
3. User types a question about the highlighted text
4. AI responds with context-aware answer

When opened standalone (from toolbar):
1. Opens without `initialContext`
2. User can ask general questions about the book

## Testing Requirements
- Overlay slides in/out smoothly
- Chat works: send message, get response, display with Markdown
- Context from highlight is displayed and passed to LLM
- Session management works (new session, switch, history)
- Summarize to notes generates summary
- Escape key closes overlay
- Click on backdrop closes overlay

## Acceptance Criteria
- [ ] `AIOverlay` component slides in from right when opened
- [ ] Reuses `useLLM` hook for all chat functionality
- [ ] Displays highlight context when triggered from a highlight
- [ ] Chat messages render with Markdown (assistant) and plain text (user)
- [ ] Session management works (new, switch, history list)
- [ ] "Summarize to Notes" button works
- [ ] Escape and backdrop click close the overlay
- [ ] `npx tsc --noEmit` passes

## Notes
- Do NOT duplicate LLM logic — reuse the `useLLM` hook exactly as `LLMPanel` does.
- The overlay has higher z-index (200) than the Notebook (100) so it can appear on top.
- The `LLMPanel` component will be removed during feature/app-rewire — for now, both can coexist.
- The marked library is already installed and configured — import and use it the same way as LLMPanel.
