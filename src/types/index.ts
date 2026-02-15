// Book and EPUB related types
export interface Book {
  id: string;
  title: string;
  author: string;
  filePath: string;
  coverImage?: string;
  toc: Chapter[];
  lastReadPosition: {
    chapterIndex: number;
    cfi: string;
  };
}

export interface Chapter {
  id: string;
  title: string;
  href: string;
  level: number;
  children?: Chapter[];
}

// Selection and Notes related types
export interface Selection {
  text: string;
  chapterId: string;
  chapterTitle: string;
  cfi: string;
  timestamp: number;
}

export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange';

export interface Highlight {
  id: string;
  bookId: string;
  cfi: string;               // epub.js CFI range string
  text: string;               // highlighted text content
  color: HighlightColor;
  annotation: string;         // user annotation text (can be empty)
  chapterId: string;
  chapterTitle: string;
  createdAt: number;
  updatedAt: number;
}

export interface TypographySettings {
  fontFamily: string;          // e.g. 'Georgia', 'system-ui', 'Merriweather'
  fontSize: number;            // in px, 14-28
  lineHeight: number;          // multiplier, 1.4-2.2
  backgroundColor: string;    // hex color for reading background
}

export type PanelMode = 'reading' | 'notebook' | 'ai';

// LLM related types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  relatedSelection?: Selection;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  selection?: Selection;
  messages: ChatMessage[];
}

// Gemini API types
export interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{
    text: string;
  }>;
}

export interface GeminiGenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  stopSequences?: string[];
  responseMimeType?: string;
  responseSchema?: Record<string, any>;
  thinkingConfig?: {
    includeThoughts?: boolean;
  };
}

export interface GeminiRequest {
  contents: GeminiContent[];
  systemInstruction?: {
    parts: Array<{
      text: string;
    }>;
  };
  generationConfig?: GeminiGenerationConfig;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
      role: string;
    };
    finishReason: string;
    safetyRatings?: any[];
    citationMetadata?: any;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

// Configuration types
export interface AppConfig {
  llm: {
    provider: 'gemini' | 'openai';
    apiKey: string;
    baseUrl?: string;
    model: string;
  };
  display: {
    theme: 'light' | 'dark' | 'system';
    fontSize: number;
    notesFontSize: number;
  };
  export: {
    defaultPath: string;
  };
  storage?: {
    notesPath?: string;
  };
}

export interface BooksIndex {
  books: Array<{
    id: string;
    title: string;
    author: string;
    filePath: string;
    addedAt: number;
    lastOpenedAt: number;
  }>;
}

// LLM Service types
export interface LLMServiceConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

export interface ChatOptions {
  bookTitle: string;
  selectedText?: string;
  conversationHistory?: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface SummarizeOptions {
  conversationHistory: ChatMessage[];
  format?: 'bullet-points' | 'paragraph';
}

export interface OrganizeNotesOptions {
  bookTitle: string;
  noteContent: string;
}
