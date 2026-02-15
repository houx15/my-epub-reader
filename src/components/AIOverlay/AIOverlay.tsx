import React, { useState, useRef, useEffect, useCallback } from 'react';
import { marked } from 'marked';
import { useLLM } from '../../hooks/useLLM';
import type { Selection } from '../../types';
import './AIOverlay.css';

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

export function AIOverlay({
  isOpen,
  onClose,
  bookTitle,
  bookId,
  initialContext,
  onInsertToNotes,
}: AIOverlayProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    error,
    currentSelection,
    prepareSessionForSelection,
    setCurrentSessionId,
    startNewSession,
    clearSelectionContext,
    sendMessage,
    summarizeConversation,
    clearMessages,
    clearError,
  } = useLLM({
    bookTitle,
    bookId,
    onError: (err) => {
      console.error('LLM Error:', err);
    },
  });

  const selectionForDisplay = currentSelection;

  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && initialContext) {
      const contextAsSelection: Selection = {
        text: initialContext.text,
        chapterId: '',
        chapterTitle: initialContext.chapterTitle,
        cfi: initialContext.cfi,
        timestamp: Date.now(),
      };
      prepareSessionForSelection(contextAsSelection);
    }
  }, [isOpen, initialContext, prepareSessionForSelection]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) {
      return;
    }

    const message = inputValue;
    setInputValue('');

    const selectionToSend = selectionForDisplay || undefined;
    await sendMessage(message, selectionToSend);
  }, [inputValue, isLoading, selectionForDisplay, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSummarizeToNotes = async () => {
    if (messages.length === 0 || !onInsertToNotes) {
      return;
    }

    try {
      const summary = await summarizeConversation();
      const selectionHeader = selectionForDisplay
        ? `#### Context\n> ${selectionForDisplay.text.replace(/\n/g, '\n> ')}\n\n`
        : '';
      const formattedSummary = `### AI Chat Summary\n\n${selectionHeader}#### Q&A Summary\n${summary}\n\n---\n`;
      onInsertToNotes(formattedSummary);
      clearMessages();
    } catch (err) {
      console.error('Failed to summarize:', err);
    }
  };

  const handleNewSession = () => {
    clearSelectionContext();
    startNewSession();
    setIsSessionsOpen(false);
  };

  const handleSelectSession = (sessionId: string) => {
    clearSelectionContext();
    setCurrentSessionId(sessionId);
    setIsSessionsOpen(false);
  };

  const renderMessageContent = (content: string, isAssistant: boolean) => {
    if (!isAssistant) {
      return <div className="ai-message-text">{content}</div>;
    }

    return (
      <div
        className="ai-message-text ai-message-text-markdown"
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
      />
    );
  };

  return (
    <>
      {isOpen && <div className="ai-overlay-backdrop" onClick={onClose} />}
      <div className={`ai-overlay ${isOpen ? 'open' : ''}`}>
        <div className="ai-overlay-header">
          <h3>AI Assistant</h3>
          <div className="ai-header-actions">
            <button
              onClick={() => setIsSessionsOpen((prev) => !prev)}
              className="ai-history-button"
              title="Chat history"
            >
              🕘
            </button>
            {messages.length > 0 && (
              <button
                onClick={clearMessages}
                className="ai-clear-button"
                disabled={isLoading}
                title="Clear conversation"
              >
                🗑️
              </button>
            )}
            <button onClick={onClose} className="ai-close-button" aria-label="Close AI Overlay">
              ✕
            </button>
          </div>
        </div>

        {initialContext && (
          <div className="ai-context">
            <div className="ai-context-label">Discussing:</div>
            <blockquote className="ai-context-quote">{initialContext.text}</blockquote>
            <span className="ai-context-chapter">{initialContext.chapterTitle}</span>
          </div>
        )}

        {!initialContext && selectionForDisplay && (
          <div className="ai-context">
            <div className="ai-context-label">Discussing:</div>
            <blockquote className="ai-context-quote">{selectionForDisplay.text}</blockquote>
            <span className="ai-context-chapter">{selectionForDisplay.chapterTitle}</span>
          </div>
        )}

        {isSessionsOpen && (
          <div className="ai-sessions">
            <div className="ai-sessions-header">
              <span>Chats</span>
              <button
                className="ai-new-chat-button"
                onClick={handleNewSession}
                disabled={isLoading}
                title="Start a new chat"
              >
                ＋
              </button>
            </div>
            <div className="ai-sessions-list">
              {sessions.length === 0 && (
                <div className="ai-session-empty">No chats yet</div>
              )}
              {sessions.map((session) => (
                <button
                  key={session.id}
                  className={`ai-session-item ${
                    session.id === currentSessionId ? 'active' : ''
                  }`}
                  onClick={() => handleSelectSession(session.id)}
                >
                  <div className="ai-session-title">{session.title}</div>
                  <div className="ai-session-meta">
                    {session.messages.length === 0
                      ? 'Unsaved'
                      : `${session.messages.length} messages`}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="ai-messages">
          {messages.length === 0 && (
            <div className="ai-empty-state">
              <p>💬 Start a conversation about your reading</p>
              <p className="ai-hint">
                {selectionForDisplay || initialContext
                  ? 'Ask questions about the selected text'
                  : 'Select text in the book to discuss, or ask general questions'}
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div key={index} className={`ai-message ai-message-${message.role}`}>
              <div className="ai-message-avatar">{message.role === 'user' ? '👤' : '🤖'}</div>
              <div className="ai-message-content">
                {renderMessageContent(message.content, message.role === 'assistant')}
                <div className="ai-message-timestamp">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="ai-message ai-message-assistant">
              <div className="ai-message-avatar">🤖</div>
              <div className="ai-message-content">
                <div className="ai-typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="ai-error-message">
              <span>⚠️ {error.message}</span>
              <button onClick={clearError} className="ai-dismiss-error">
                ✕
              </button>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {messages.length > 0 && onInsertToNotes && (
          <div className="ai-actions">
            <button
              onClick={handleSummarizeToNotes}
              disabled={isLoading}
              className="ai-summarize-button"
              title="Summarize this conversation and add to notes"
            >
              📝 Summarize to Notes
            </button>
          </div>
        )}

        <div className="ai-input">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              selectionForDisplay || initialContext
                ? 'Ask about the selected text...'
                : 'Ask a question about the book...'
            }
            disabled={isLoading}
            rows={3}
            className="ai-input-textarea"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="ai-send-button"
            aria-label="Send message"
          >
            {isLoading ? '⏳' : '📤'}
          </button>
        </div>
      </div>
    </>
  );
}
