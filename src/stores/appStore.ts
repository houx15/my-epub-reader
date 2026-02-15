import { create } from 'zustand';
import type { Book, Selection, AppConfig, Highlight, TypographySettings, PanelMode } from '../types';

interface AppState {
  currentBook: Book | null;
  setCurrentBook: (book: Book | null) => void;

  isTOCOpen: boolean;
  toggleTOC: () => void;

  config: AppConfig | null;
  setConfig: (config: AppConfig) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  notesFontSize: number;
  setNotesFontSize: (size: number) => void;

  noteContent: string;
  setNoteContent: (content: string) => void;

  currentSelection: Selection | null;
  setCurrentSelection: (selection: Selection | null) => void;

  highlights: Highlight[];
  setHighlights: (highlights: Highlight[]) => void;
  addHighlight: (highlight: Highlight) => void;
  updateHighlight: (id: string, updates: Partial<Highlight>) => void;
  removeHighlight: (id: string) => void;

  typography: TypographySettings;
  setTypography: (settings: Partial<TypographySettings>) => void;

  panelMode: PanelMode;
  setPanelMode: (mode: PanelMode) => void;

  isLoadingBook: boolean;
  setIsLoadingBook: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentBook: null,
  setCurrentBook: (book) => set({ currentBook: book }),

  isTOCOpen: false,
  toggleTOC: () => set((state) => ({ isTOCOpen: !state.isTOCOpen })),

  config: null,
  setConfig: (config) => set({ config }),
  theme: 'system',
  setTheme: (theme) => set({ theme }),
  fontSize: 16,
  setFontSize: (size) => set({ fontSize: size }),
  notesFontSize: 14,
  setNotesFontSize: (size) => set({ notesFontSize: size }),

  noteContent: '',
  setNoteContent: (content) => set({ noteContent: content }),

  currentSelection: null,
  setCurrentSelection: (selection) => set({ currentSelection: selection }),

  highlights: [],
  setHighlights: (highlights) => set({ highlights }),
  addHighlight: (highlight) => set((state) => ({ highlights: [...state.highlights, highlight] })),
  updateHighlight: (id, updates) => set((state) => ({
    highlights: state.highlights.map(h => h.id === id ? { ...h, ...updates } : h)
  })),
  removeHighlight: (id) => set((state) => ({
    highlights: state.highlights.filter(h => h.id !== id)
  })),

  typography: { fontFamily: 'Georgia', fontSize: 18, lineHeight: 1.8, backgroundColor: '#ffffff' },
  setTypography: (settings) => set((state) => ({ typography: { ...state.typography, ...settings } })),

  panelMode: 'reading' as PanelMode,
  setPanelMode: (mode) => set({ panelMode: mode }),

  isLoadingBook: false,
  setIsLoadingBook: (loading) => set({ isLoadingBook: loading }),
}));
