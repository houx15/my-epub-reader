import { useState, useCallback, useRef, useEffect } from 'react';
import { getLLMService } from '../services/llm';
import { getStorageService } from '../services/storage';
import type { ChatMessage, ChatSession, Selection } from '../types';

interface UseLLMOptions {
  bookTitle: string;
  bookId?: string;
  onError?: (error: Error) => void;
}

interface UseLLMReturn {
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: ChatMessage[];
  isLoading: boolean;
  error: Error | null;
  currentSelection: Selection | undefined;
  prepareSessionForSelection: (selection: Selection | null) => void;
  setCurrentSessionId: (sessionId: string) => void;
  startNewSession: () => void;
  clearSelectionContext: () => void;
  sendMessage: (content: string, selectedText?: Selection) => Promise<void>;
  summarizeConversation: () => Promise<string>;
  organizeNotes: (noteContent: string) => Promise<string>;
  clearMessages: () => void;
  clearError: () => void;
}

/**
 * React hook for managing LLM chat interactions
 */
export function useLLM(options: UseLLMOptions): UseLLMReturn {
  const { bookTitle, bookId, onError } = options;

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Keep track of the selected text for the current conversation context
  const currentSelectionRef = useRef<Selection | undefined>(undefined);
  const isLoadingHistoryRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getCurrentSession = useCallback(() => {
    if (!currentSessionId) return null;
    return sessions.find((session) => session.id === currentSessionId) || null;
  }, [currentSessionId, sessions]);

  const createSession = useCallback((selection?: Selection): ChatSession => {
    const now = Date.now();
    const selectionSnippet = selection?.text?.trim().split('\n')[0] || '';
    const title = selectionSnippet ? `Selection: ${selectionSnippet.slice(0, 40)}` : 'New chat';
    return {
      id: `${now}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      createdAt: now,
      updatedAt: now,
      selection,
      messages: [],
    };
  }, []);

  const selectSession = useCallback(
    (sessionId: string) => {
      const target = sessions.find((session) => session.id === sessionId);
      setCurrentSessionId(sessionId);
      currentSelectionRef.current = target?.selection;
    },
    [sessions]
  );

  useEffect(() => {
    if (!bookId) {
      setSessions([]);
      setCurrentSessionId(null);
      currentSelectionRef.current = undefined;
      return;
    }

    let isCancelled = false;

    const loadHistory = async () => {
      isLoadingHistoryRef.current = true;
      try {
        const storage = await getStorageService();
        const history = await storage.loadChatHistory(bookId);
        if (!isCancelled) {
          setSessions(history);
          const lastSession = [...history].sort((a, b) => b.updatedAt - a.updatedAt)[0];
          setCurrentSessionId(lastSession?.id || null);
          currentSelectionRef.current = lastSession?.selection;
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        isLoadingHistoryRef.current = false;
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [bookId]);

  useEffect(() => {
    if (!bookId || isLoadingHistoryRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const storage = await getStorageService();
        const persistedSessions = sessions.filter((session) => session.messages.length > 0);
        await storage.saveChatHistory(bookId, persistedSessions);
      } catch (error) {
        console.error('Failed to save chat history:', error);
      }
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [bookId, sessions]);

  const prepareSessionForSelection = useCallback(
    (selection: Selection | null) => {
      if (!selection) return;

      const currentSession = getCurrentSession();
      const sameSelection = currentSession?.selection?.cfi === selection.cfi;

      if (!currentSession) {
        const newSession = createSession(selection);
        setSessions((prev) => [...prev, newSession]);
        setCurrentSessionId(newSession.id);
        currentSelectionRef.current = selection;
        return;
      }

      if (currentSession.messages.length === 0) {
        if (!sameSelection) {
          const updatedSession = {
            ...currentSession,
            selection,
            title: `Selection: ${selection.text.trim().slice(0, 40)}`,
          };
          setSessions((prev) =>
            prev.map((session) => (session.id === currentSession.id ? updatedSession : session))
          );
          currentSelectionRef.current = selection;
        }
        return;
      }

      if (!sameSelection) {
        const newSession = createSession(selection);
        setSessions((prev) => [...prev, newSession]);
        setCurrentSessionId(newSession.id);
        currentSelectionRef.current = selection;
      }
    },
    [createSession, getCurrentSession]
  );

  /**
   * Send a message to the LLM and get response
   */
  const sendMessage = useCallback(
    async (content: string, selectedText?: Selection) => {
      if (!content.trim()) {
        return;
      }

      // Update current selection context
      if (selectedText) {
        currentSelectionRef.current = selectedText;
      }

      setIsLoading(true);
      setError(null);

      const currentSession = getCurrentSession();
      let activeSession = currentSession;

      if (!activeSession || (selectedText && currentSession?.selection?.cfi !== selectedText.cfi && currentSession?.messages.length)) {
        activeSession = createSession(selectedText);
        setSessions((prev) => [...prev, activeSession as ChatSession]);
        setCurrentSessionId(activeSession.id);
      } else if (selectedText && activeSession && !activeSession.selection) {
        activeSession = {
          ...activeSession,
          selection: selectedText,
          title: activeSession.title || `Selection: ${selectedText.text.trim().slice(0, 40)}`,
        };
        setSessions((prev) =>
          prev.map((session) => (session.id === activeSession!.id ? activeSession! : session))
        );
      }

      if (!activeSession) {
        setIsLoading(false);
        return;
      }

      // Add user message to history
      const userMessage: ChatMessage = {
        role: 'user',
        content,
        timestamp: Date.now(),
        relatedSelection: selectedText,
      };

      setSessions((prev) =>
        prev.map((session) =>
          session.id === activeSession!.id
            ? {
                ...session,
                messages: [...session.messages, userMessage],
                updatedAt: Date.now(),
                title: session.title === 'New chat' ? content.slice(0, 40) : session.title,
              }
            : session
        )
      );

      try {
        const llmService = getLLMService();

        const recentHistory = activeSession.messages.slice(-6);

        const response = await llmService.chat(content, {
          bookTitle,
          selectedText: currentSelectionRef.current?.text,
          conversationHistory: recentHistory,
          temperature: 0.7,
          maxTokens: 2000,
        });

        // Add assistant response to history
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response,
          timestamp: Date.now(),
        };

        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSession!.id
              ? {
                  ...session,
                  messages: [...session.messages, assistantMessage],
                  updatedAt: Date.now(),
                }
              : session
          )
        );
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        setError(error);
        onError?.(error);

        // Remove the user message if the request failed
        setSessions((prev) =>
          prev.map((session) =>
            session.id === activeSession!.id
              ? {
                  ...session,
                  messages: session.messages.slice(0, -1),
                  updatedAt: Date.now(),
                }
              : session
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [bookTitle, createSession, getCurrentSession, onError]
  );

  /**
   * Summarize the current conversation
   */
  const summarizeConversation = useCallback(async (): Promise<string> => {
    const currentSession = getCurrentSession();
    if (!currentSession || currentSession.messages.length === 0) {
      throw new Error('No conversation to summarize');
    }

    setIsLoading(true);
    setError(null);

    try {
      const llmService = getLLMService();
      const summary = await llmService.summarizeConversation({
        conversationHistory: currentSession.messages,
        format: 'bullet-points',
      });

      return summary;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to summarize conversation');
      setError(error);
      onError?.(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentSession, onError]);

  /**
   * Organize reading notes using LLM
   */
  const organizeNotes = useCallback(
    async (noteContent: string): Promise<string> => {
      if (!noteContent.trim()) {
        throw new Error('No notes to organize');
      }

      setIsLoading(true);
      setError(null);

      try {
        const llmService = getLLMService();
        const organizedNotes = await llmService.organizeNotes({
          bookTitle,
          noteContent,
        });

        return organizedNotes;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to organize notes');
        setError(error);
        onError?.(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [bookTitle, onError]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    const currentSession = getCurrentSession();
    if (!currentSession) {
      return;
    }
    setSessions((prev) =>
      prev.map((session) =>
        session.id === currentSession.id
          ? { ...session, messages: [], updatedAt: Date.now() }
          : session
      )
    );
    currentSelectionRef.current = undefined;
  }, [getCurrentSession]);

  const clearSelectionContext = useCallback(() => {
    currentSelectionRef.current = undefined;
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    sessions,
    currentSessionId,
    messages: getCurrentSession()?.messages || [],
    isLoading,
    error,
    currentSelection: currentSelectionRef.current,
    prepareSessionForSelection,
    setCurrentSessionId: selectSession,
    startNewSession: () => {
      const newSession = createSession();
      setSessions((prev) => [...prev, newSession]);
      setCurrentSessionId(newSession.id);
      currentSelectionRef.current = undefined;
    },
    clearSelectionContext,
    sendMessage,
    summarizeConversation,
    organizeNotes,
    clearMessages,
    clearError,
  };
}

/**
 * Hook for managing a conversation context with selected text
 */
export function useLLMWithSelection(
  bookTitle: string,
  selection: Selection | null,
  onError?: (error: Error) => void
) {
  const llm = useLLM({ bookTitle, onError });

  /**
   * Send message with the current selection automatically included
   */
  const sendMessageWithSelection = useCallback(
    async (content: string) => {
      await llm.sendMessage(content, selection || undefined);
    },
    [llm, selection]
  );

  return {
    ...llm,
    sendMessageWithSelection,
  };
}
