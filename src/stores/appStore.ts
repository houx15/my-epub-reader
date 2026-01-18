import { create } from 'zustand';
import type { Book, Selection, AppConfig } from '../types';

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

  // Loading states
  isLoadingBook: false,
  setIsLoadingBook: (loading) => set({ isLoadingBook: loading }),
}));
