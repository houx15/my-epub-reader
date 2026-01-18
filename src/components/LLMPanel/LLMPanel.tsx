import React, { useState, useRef, useEffect } from 'react';
import { marked } from 'marked';
import { useLLM } from '../../hooks/useLLM';
import { useAppStore } from '../../stores/appStore';
import type { Selection } from '../../types';
import './LLMPanel.css';

interface LLMPanelProps {
  bookTitle: string;
  bookId: string;
  isCollapsed: boolean;
  onToggle: () => void;
  currentSelection: Selection | null;
  onInsertSummaryToNotes: (summary: string) => void;
}

export function LLMPanel({
  bookTitle,
  bookId,
  isCollapsed,
  onToggle,
  currentSelection,
  onInsertSummaryToNotes,
}: LLMPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [isSessionsOpen, setIsSessionsOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { setCurrentSelection } = useAppStore();

  const {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    error,
    currentSelection: llmSelection,
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

  const selectionForDisplay = currentSelection || llmSelection;

  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    prepareSessionForSelection(currentSelection);
  }, [currentSelection, prepareSessionForSelection]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) {
      return;
    }

    const message = inputValue;
    setInputValue('');

    await sendMessage(message, currentSelection || undefined);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSummarizeToNotes = async () => {
    if (messages.length === 0) {
      return;
    }

    try {
      const summary = await summarizeConversation();
      const selectionHeader = selectionForDisplay
        ? `#### Context\n> ${selectionForDisplay.text.replace(/\n/g, '\n> ')}\n\n`
        : '';
      const formattedSummary = `### AI Chat Summary\n\n${selectionHeader}#### Q&A Summary\n${summary}\n\n---\n`;
      onInsertSummaryToNotes(formattedSummary);

      // Optionally clear the conversation after summarizing
      clearMessages();
    } catch (err) {
      console.error('Failed to summarize:', err);
    }
  };

  const renderMessageContent = (content: string, isAssistant: boolean) => {
    if (!isAssistant) {
      return <div className="message-text">{content}</div>;
    }

    return (
      <div
        className="message-text message-text-markdown"
        dangerouslySetInnerHTML={{ __html: marked.parse(content) as string }}
      />
    );
  };

  if (isCollapsed) {
    return (
      <div className="llm-panel-collapsed">
        <button onClick={onToggle} className="expand-button" aria-label="Expand LLM Panel">
          💬
        </button>
      </div>
    );
  }

  return (
    <div className="llm-panel">
      {/* Header */}
      <div className="llm-panel-header">
        <h3>AI Assistant</h3>
        <div className="header-actions">
          <button
            onClick={() => setIsSessionsOpen((prev) => !prev)}
            className="history-button"
            title="Chat history"
          >
            🕘
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="clear-button"
              disabled={isLoading}
              title="Clear conversation"
            >
              🗑️
            </button>
          )}
          <button onClick={onToggle} className="collapse-button" aria-label="Collapse LLM Panel">
            ➡️
          </button>
        </div>
      </div>

      {/* Selection Context */}
      {selectionForDisplay && (
        <div className="selection-context">
          <div className="selection-indicator">
            📌 <strong>Discussing selected text</strong>
            <button
              className="selection-clear"
              onClick={() => {
                setCurrentSelection(null);
                clearSelectionContext();
              }}
              title="Clear selected text"
            >
              ✕
            </button>
          </div>
          <div className="selection-preview">
            {selectionForDisplay.text.substring(0, 100)}
            {selectionForDisplay.text.length > 100 ? '...' : ''}
          </div>
        </div>
      )}

      {/* Chat Sessions */}
      {isSessionsOpen && (
        <div className="chat-sessions">
          <div className="chat-sessions-header">
            <span>Chats</span>
          <button
            className="new-chat-button"
            onClick={() => {
              setCurrentSelection(null);
              clearSelectionContext();
              startNewSession();
            }}
            disabled={isLoading}
            title="Start a new chat"
          >
            ＋
          </button>
          </div>
          <div className="chat-sessions-list">
            {sessions.length === 0 && (
              <div className="chat-session-empty">No chats yet</div>
            )}
            {sessions.map((session) => (
              <button
                key={session.id}
                className={`chat-session-item ${
                  session.id === currentSessionId ? 'active' : ''
                }`}
                onClick={() => {
                  setCurrentSelection(null);
                  clearSelectionContext();
                  setCurrentSessionId(session.id);
                  setIsSessionsOpen(false);
                }}
              >
                <div className="chat-session-title">{session.title}</div>
                <div className="chat-session-meta">
                  {session.messages.length === 0
                    ? 'Unsaved'
                    : `${session.messages.length} messages`}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Messages */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="empty-state">
            <p>💬 Start a conversation about your reading</p>
            <p className="hint">
              {selectionForDisplay
                ? 'Ask questions about the selected text'
                : 'Select text in the book to discuss, or ask general questions'}
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div key={index} className={`message message-${message.role}`}>
            <div className="message-avatar">{message.role === 'user' ? '👤' : '🤖'}</div>
            <div className="message-content">
              {renderMessageContent(message.content, message.role === 'assistant')}
              <div className="message-timestamp">
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="message message-assistant">
            <div className="message-avatar">🤖</div>
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="error-message">
            <span>⚠️ {error.message}</span>
            <button onClick={clearError} className="dismiss-error">
              ✕
            </button>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Actions */}
      {messages.length > 0 && (
        <div className="chat-actions">
          <button
            onClick={handleSummarizeToNotes}
            disabled={isLoading}
            className="summarize-button"
            title="Summarize this conversation and add to notes"
          >
            📝 Summarize to Notes
          </button>
        </div>
      )}

      {/* Input */}
      <div className="chat-input-container">
        <textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            currentSelection
              ? 'Ask about the selected text...'
              : 'Ask a question about the book...'
          }
          disabled={isLoading}
          rows={2}
          className="chat-input"
        />
        <button
          onClick={handleSendMessage}
          disabled={!inputValue.trim() || isLoading}
          className="send-button"
          aria-label="Send message"
        >
          {isLoading ? '⏳' : '📤'}
        </button>
      </div>
    </div>
  );
}
