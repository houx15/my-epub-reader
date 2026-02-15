import { create } from 'zustand';
import type { Book, Selection, AppConfig, Highlight, TypographySettings, PanelMode } from '../types';

interface AppState {
  // Book state
  currentBook: Book | null;
  setCurrentBook: (book: Book | null) => void;

  // UI state
  isLLMPanelCollapsed: boolean;
  toggleLLMPanel: () => void;
  isTOCOpen: boolean;
  toggleTOC: () => void;

  // Settings
  config: AppConfig | null;
  setConfig: (config: AppConfig) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  notesFontSize: number;
  setNotesFontSize: (size: number) => void;

  // Notes state
  noteContent: string;
  setNoteContent: (content: string) => void;
  noteInsertRequest: string | null;
  requestNoteInsert: (content: string) => void;
  clearNoteInsertRequest: () => void;

  // Selection state
  currentSelection: Selection | null;
  setCurrentSelection: (selection: Selection | null) => void;

  // Highlights state
  highlights: Highlight[];
  setHighlights: (highlights: Highlight[]) => void;
  addHighlight: (highlight: Highlight) => void;
  updateHighlight: (id: string, updates: Partial<Highlight>) => void;
  removeHighlight: (id: string) => void;

  // Typography state
  typography: TypographySettings;
  setTypography: (settings: Partial<TypographySettings>) => void;

  // Panel mode (replaces isLLMPanelCollapsed concept)
  panelMode: PanelMode;
  setPanelMode: (mode: PanelMode) => void;

  // Loading states
  isLoadingBook: boolean;
  setIsLoadingBook: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Book state
  currentBook: null,
  setCurrentBook: (book) => set({ currentBook: book }),

  // UI state
  isLLMPanelCollapsed: false,
  toggleLLMPanel: () => set((state) => ({ isLLMPanelCollapsed: !state.isLLMPanelCollapsed })),
  isTOCOpen: false,
  toggleTOC: () => set((state) => ({ isTOCOpen: !state.isTOCOpen })),

  // Settings
  config: null,
  setConfig: (config) => set({ config }),
  theme: 'system',
  setTheme: (theme) => set({ theme }),
  fontSize: 16,
  setFontSize: (size) => set({ fontSize: size }),
  notesFontSize: 14,
  setNotesFontSize: (size) => set({ notesFontSize: size }),

  // Notes state
  noteContent: '',
  setNoteContent: (content) => set({ noteContent: content }),
  noteInsertRequest: null,
  requestNoteInsert: (content) => set({ noteInsertRequest: content }),
  clearNoteInsertRequest: () => set({ noteInsertRequest: null }),

  // Selection state
  currentSelection: null,
  setCurrentSelection: (selection) => set({ currentSelection: selection }),

  // Highlights state
  highlights: [],
  setHighlights: (highlights) => set({ highlights }),
  addHighlight: (highlight) => set((state) => ({ highlights: [...state.highlights, highlight] })),
  updateHighlight: (id, updates) => set((state) => ({
    highlights: state.highlights.map(h => h.id === id ? { ...h, ...updates } : h)
  })),
  removeHighlight: (id) => set((state) => ({
    highlights: state.highlights.filter(h => h.id !== id)
  })),

  // Typography state
  typography: { fontFamily: 'Georgia', fontSize: 18, lineHeight: 1.8, backgroundColor: '#fefefe' },
  setTypography: (settings) => set((state) => ({ typography: { ...state.typography, ...settings } })),

  // Panel mode (replaces isLLMPanelCollapsed concept)
  panelMode: 'reading' as PanelMode,
  setPanelMode: (mode) => set({ panelMode: mode }),

  // Loading states
  isLoadingBook: false,
  setIsLoadingBook: (loading) => set({ isLoadingBook: loading }),
}));
