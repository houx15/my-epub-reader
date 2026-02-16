# My EPUB Reader

A desktop EPUB reader focused on deep reading: realistic book-like UI, precise typography controls (including CJK), highlight-first note capture, and Gemini-powered discussion/summarization.

## Highlights

- Real-book reading surface
- Page-turn animation, spine, and dynamic page-rim stacks
- Persistent reading position (CFI-based restore)
- Chapter navigation (TOC + status bar quick jump)
- Rich typography controls
- Latin/CJK fonts, CJK spacing, auto CJK-Latin spacing, line/paragraph spacing, alignment, reading background
- Selection workflow
- Highlight / underline directly from selection popover
- Discuss selected text with AI using selection-aware context
- Notebook workflow
- Per-highlight annotations, color editing, delete, and jump-back to source location
- Export notes as Markdown
- End page workflow
- At the end of a book, open an `End` panel with `Write | Chat`
- `Write` auto-syncs to notes as a dedicated section
- `Chat` can summarize into notes and export immediately
- AI integration (Gemini)
- Per-book chat sessions stored locally
- Conversation summarization into notes

## Tech Stack

- React 18 + TypeScript
- Electron
- Vite + `vite-plugin-electron`
- `epub.js` for rendering/navigation
- Zustand for app state
- Gemini API (direct HTTP)

## Screens and Core Modules

- `src/components/BookLayout/` - reading stage, page-turn animation, rim/spine visuals, end-page modal
- `src/components/EPUBViewer/` - selection popover + table of contents UI
- `src/components/Highlights/` - highlight popover/color tools
- `src/components/Notebook/` - highlight-centric notes panel and export
- `src/components/AIOverlay/` - chat UI, sessions, summarize to notes
- `src/components/Typography/` - typography popover controls
- `src/hooks/useEPUB.ts` - load/render/navigation/progress/restore
- `src/hooks/useSelection.ts` - selection + popover placement + overlap handling
- `src/hooks/useLLM.ts` - chat sessions and LLM orchestration
- `src/services/epub.ts` - epub.js service wrapper
- `src/services/storage.ts` - local persistence (notes, highlights, metadata, chat)
- `src/services/llm.ts` - Gemini request layer

## Project Structure

```text
.
├── electron/
│   ├── main.ts
│   ├── preload.ts
│   └── ipc/
│       └── file.ts
├── src/
│   ├── components/
│   ├── hooks/
│   ├── services/
│   ├── stores/
│   ├── styles/
│   ├── types/
│   ├── App.tsx
│   └── main.tsx
├── config.example.json
├── config.json
├── electron-builder.json
├── package.json
└── vite.config.ts
```

## Getting Started

### 1. Prerequisites

- Node.js 18+
- npm 9+

### 2. Install

```bash
npm install
```

### 3. Configure

Copy and edit config:

```bash
cp config.example.json config.json
```

Set at least:

- `llm.apiKey`
- optionally `storage.notesPath`

You can also manage these via the in-app Settings dialog.

### 4. Run (Development)

```bash
npm run dev
```

This starts Vite + Electron via plugin integration.

### 5. Build Desktop App

```bash
npm run build
```

Output is generated in `release/` (installer artifacts) and `dist*` build folders.

## Configuration

Configuration is loaded/saved through Electron IPC (`window.electron.loadConfig/saveConfig`).

`config.json` example:

```json
{
  "llm": {
    "provider": "gemini",
    "apiKey": "YOUR_GEMINI_API_KEY_HERE",
    "baseUrl": "https://generativelanguage.googleapis.com",
    "model": "gemini-3-pro-preview"
  },
  "display": {
    "theme": "system",
    "fontSize": 16,
    "notesFontSize": 14
  },
  "export": {
    "defaultPath": "~/Documents/EPUB-Notes"
  },
  "storage": {
    "notesPath": ""
  }
}
```

Notes:

- If `storage.notesPath` is empty, data falls back to `<userData>/books`.
- In development, config file read/write is based on project working directory (`process.cwd()`).

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
| --- | --- | --- |
| Open EPUB | `Cmd + O` | `Ctrl + O` |
| Save Notes | `Cmd + S` | `Ctrl + S` |
| Toggle AI Panel | `Cmd + /` | `Ctrl + /` |
| Toggle Notebook | `Cmd + B` | `Ctrl + B` |
| Open TOC | `Cmd + J` | `Ctrl + J` |
| Open Settings | `Cmd + ,` | `Ctrl + ,` |
| Next Page | `Right Arrow` | `Right Arrow` |
| Previous Page | `Left Arrow` | `Left Arrow` |
| Close overlays/panels | `Esc` | `Esc` |

## Persistence Model

Per book, data is stored under a stable `bookId` directory:

- `meta.json` - metadata + last read CFI
- `notes.md` - notes/reflections/chat summaries
- `highlights.json` - highlights + annotations
- `chat.json` - AI sessions/messages

There is also a global `books.json` index in app user data.

## Reading and Notes Flow

1. Open EPUB
2. Reader loads TOC + restores last CFI (if present)
3. Select text to:
- highlight/underline
- add quote to notes
- discuss with AI (selection context included)
4. Manage highlights in Notebook panel
5. Reach end page and use `Write | Chat`
- `Write` auto-appends a dedicated reflection section
- `Chat` can summarize into notes
- export notes directly

## AI Behavior

- Provider: Gemini (configured in Settings or `config.json`)
- Selection-aware context: selected text is injected into system instruction for contextual answers
- Sessions are per-book and persisted locally
- Conversation summaries can be inserted into notes

## Quality Checks

This repo currently has no formal test suite. Recommended checks:

```bash
npx tsc --noEmit
npm run build
```

## Known Limitations

- `npm run build` requires network access for Electron binary/artifact steps on clean environments.
- Lint script exists, but ESLint config may need setup depending on local environment.
- Some dependencies are currently ahead of actively used UI modules; cleanup can be done in a future refactor.

## Upcoming Features

These are the next major features requested for this project:

1. WYSIWYG note editor for all notes content, including end reflections.
2. Real-time speech interaction with AI for companion-style reading.
3. Ask AI about any content in the book with stronger memory and context engineering.
4. Support multiple LLM providers.

## Suggested Implementation Order

To reduce rework, implement in this sequence:

1. Multi-provider LLM architecture (foundation for all AI features).
2. Book-aware context engine (retrieval + citation for ask-anything queries).
3. Unified WYSIWYG notes model (regular notes + end thoughts).
4. Real-time speech companion (STT/TTS + streaming conversation loop).

## Milestone Plan

### Milestone 1: Provider Abstraction

- Introduce a provider interface (`chat`, `summarize`, optional `stream`/`audio`).
- Keep Gemini as first provider and add OpenAI-compatible provider next.
- Add provider/model selection in settings and config.

### Milestone 2: Enhanced Context + Memory

- Build chapter/paragraph chunk index per book.
- Retrieve top-k relevant chunks per user query.
- Inject retrieved context into prompts with chapter/location references.
- Persist session memory with retrieval traces.

### Milestone 3: WYSIWYG Notes

- Move end-thought writing into a unified rich-text note flow.
- Preserve Markdown export compatibility.
- Add safe migration for existing `notes.md` content.

### Milestone 4: Real-Time AI Companion

- Add push-to-talk first, then optional continuous mode.
- Stream voice input/output with interruption handling.
- Keep conversation memory and one-click “summary to notes”.

## Contributing

1. Fork and create a feature branch
2. Keep changes focused and small
3. Run type-check/build locally
4. Open a PR with before/after screenshots for UI changes

## License

MIT
