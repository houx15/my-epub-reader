# EPUB Reader with AI-Powered Note-Taking

A desktop EPUB reader with integrated AI assistance for deep reading and structured note-taking.

---

## Quick Start

### 1. Install Dependencies

Make sure you have [Node.js](https://nodejs.org/) (v18+) installed, then:

```bash
npm install
```

### 2. Run the App

```bash
npm run dev
```

### 3. First-Time Setup

When you first open the app:

1. **Open Settings** (gear icon in toolbar or `Cmd/Ctrl + ,`)
2. **Set Notes Directory** - Choose where your notes will be saved
3. **Enter Gemini API Key** - Get your free key from [Google AI Studio](https://aistudio.google.com/app/apikey)
4. **Save Settings**

### 4. Start Reading

1. Click **"Open EPUB File"** to load a book
2. Read and select text to **quote to notes** or **discuss with AI**
3. Your notes auto-save and sync with your reading position

---

## Features

### Reading
- EPUB file parsing and paginated rendering
- Chapter navigation with table of contents
- Reading position memory - picks up where you left off
- Text selection with quick actions (quote to notes, discuss with AI)
- Light/Dark/System theme support

### WYSIWYG Note-Taking
- **Tiptap rich-text editor** - Write in a clean, distraction-free interface
- **Source mode** - Switch to Markdown source when needed
- **Location links** - Click 📍 badges to jump back to the original text in the book
- Auto-save functionality
- Word count tracking
- Export to Markdown files

### AI Assistant (Gemini)
- **Chat with AI** about your book content
- **Chat history** - Conversations persist across sessions per book
- **Summarize discussions** into structured notes
- **Context-aware** - Select text and discuss specific passages
- **Organize notes** - AI can restructure and summarize your reading notes

---

## Roadmap

Planned features for future releases:

| Feature | Description |
|---------|-------------|
| **Image Support** | Embed and manage images in your notes |
| **AI Auto-Organize** | Let LLM automatically structure and organize your reading notes |
| **Knowledge Base** | Manage all your books and notes in one place, chat with your entire library |
| **Book Q&A** | Ask LLM questions about the book content directly |
| **Mind Maps & Graphs** | Generate visual mind maps and knowledge graphs from book content |
| **Reading Analytics** | Track reading habits, time spent, and progress across all books |

---

## Keyboard Shortcuts

| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Open file | `Cmd + O` | `Ctrl + O` |
| Save notes | `Cmd + S` | `Ctrl + S` |
| Export notes | `Cmd + E` | `Ctrl + E` |
| Settings | `Cmd + ,` | `Ctrl + ,` |
| Toggle AI panel | `Cmd + B` | `Ctrl + B` |
| Next page | `→` or `Space` | `→` or `Space` |
| Previous page | `←` | `←` |
| Next chapter | `Cmd + →` | `Ctrl + →` |
| Previous chapter | `Cmd + ←` | `Ctrl + ←` |

---

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Desktop**: Electron
- **EPUB**: epub.js
- **Editor**: Tiptap (WYSIWYG) + Monaco (source mode)
- **AI**: Google Gemini API
- **State**: Zustand
- **Build**: Vite + electron-builder

---

## Configuration

### Gemini API

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key (free tier available)
3. Enter it in the app's Settings dialog

**Supported Models:**

| Model | Speed | Best For |
|-------|-------|----------|
| gemini-3.0-pro-preview | Fast | Daily use, quick responses |

### Data Storage

Notes and chat history are saved in your chosen directory:

```
your-notes-folder/
├── Book Title/
│   ├── notes.md          # Your reading notes
│   └── chat-history.json # AI conversation history
```

App settings are stored in:
- macOS: `~/Library/Application Support/epub-reader/`
- Windows: `%APPDATA%/epub-reader/`
- Linux: `~/.config/epub-reader/`

---

## Development

### Project Structure

```
my-epub-reader/
├── electron/                 # Electron main process
│   ├── main.ts              # Main window & app lifecycle
│   ├── preload.ts           # IPC bridge
│   └── ipc/
│       └── file.ts          # File operations
├── src/
│   ├── components/
│   │   ├── EPUBViewer/      # EPUB rendering + TOC
│   │   ├── NotesEditor/     # Tiptap + Monaco editors
│   │   ├── LLMPanel/        # AI chat interface
│   │   ├── Layout/          # Three-column layout
│   │   ├── Toolbar/         # Top toolbar
│   │   ├── Settings/        # Settings dialog
│   │   └── StatusBar/       # Bottom status bar
│   ├── hooks/
│   │   ├── useEPUB.ts       # EPUB management
│   │   ├── useNotes.ts      # Notes state
│   │   ├── useLLM.ts        # AI chat
│   │   └── useSelection.ts  # Text selection
│   ├── services/
│   │   ├── epub.ts          # epub.js wrapper
│   │   ├── llm.ts           # Gemini API
│   │   ├── storage.ts       # Local storage
│   │   └── noteUtils.ts     # Note formatting
│   ├── stores/
│   │   └── appStore.ts      # Zustand global state
│   └── types/
│       └── index.ts         # TypeScript definitions
├── package.json
├── vite.config.ts
└── electron-builder.json
```

### Build for Production

```bash
npm run build
```

This creates distributable packages in the `release/` folder.

---

## Troubleshooting

### App won't start
- Delete `node_modules` and run `npm install` again
- Check for TypeScript errors: `npx tsc --noEmit`
- Make sure the required port is not in use

### EPUB won't load
- Ensure the file is a valid `.epub` file
- Try a different EPUB file
- Check DevTools console (Cmd/Ctrl + Option + I) for errors

### AI not responding
- Verify your Gemini API key in Settings
- Check your internet connection
- Look for rate limit errors in the console

### Notes not saving
- Ensure you've set a valid notes directory in Settings
- Check that the directory is writable

---

## Platform Support

- ✅ macOS (primary)
- ⚠️ Windows (should work, less tested)
- ⚠️ Linux (should work, less tested)

---

## License

MIT

---

## Resources

- [Gemini API Documentation](https://ai.google.dev/docs)
- [epub.js Documentation](https://github.com/futurepress/epub.js)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Tiptap Documentation](https://tiptap.dev/)

---

**Built with Electron + React + Gemini AI**
