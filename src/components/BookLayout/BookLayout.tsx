import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type { Chapter } from '../../types';
import { PageStack } from './PageStack';
import './BookLayout.css';

export interface BookLayoutProps {
  bookId: string;
  onRenderReady: (element: HTMLElement, width: number, height: number) => void;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onChapterSelect: (href: string) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  progress: number;
  onContentClick?: () => void;
  showEndPage?: boolean;
  endMode?: 'write' | 'chat';
  onEndModeChange?: (mode: 'write' | 'chat') => void;
  endThoughts?: string;
  onEndThoughtsChange?: (value: string) => void;
  onEndExport?: () => void;
  endChatMessages?: Array<{ role: 'user' | 'assistant'; content: string; timestamp: number }>;
  endChatInput?: string;
  onEndChatInputChange?: (value: string) => void;
  onEndChatSend?: () => void;
  onEndChatSummarize?: () => void;
  endChatSummary?: string;
  endChatLoading?: boolean;
  endChatError?: string | null;
}

export interface BookLayoutRef {
  triggerAnimation: (direction: 'forward' | 'backward') => void;
}

export const BookLayout = forwardRef<BookLayoutRef, BookLayoutProps>(function BookLayout(
  {
    bookId,
    onRenderReady,
    onNextPage,
    onPrevPage,
    progress,
    onContentClick,
    showEndPage = false,
    endMode = 'write',
    onEndModeChange,
    endThoughts = '',
    onEndThoughtsChange,
    onEndExport,
    endChatMessages = [],
    endChatInput = '',
    onEndChatInputChange,
    onEndChatSend,
    onEndChatSummarize,
    endChatSummary = '',
    endChatLoading = false,
    endChatError = null,
  },
  ref
) {
  const bookSpreadRef = useRef<HTMLDivElement>(null);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward' | null>(null);
  const [hoverZone, setHoverZone] = useState<'left' | 'right' | null>(null);
  const isAnimatingRef = useRef(false);
  const isRenderReadyCalledRef = useRef(false);
  const lastBookIdRef = useRef<string | undefined>(undefined);

  // Clamp progress to valid range [0, 1]
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Reset render guard when bookId changes
  useEffect(() => {
    if (bookId !== lastBookIdRef.current) {
      isRenderReadyCalledRef.current = false;
      lastBookIdRef.current = bookId;
    }
  }, [bookId]);

  const triggerPageTurnAnimation = useCallback((direction: 'forward' | 'backward') => {
    if (isAnimatingRef.current || !bookSpreadRef.current) return;

    isAnimatingRef.current = true;
    setAnimationDirection(direction);

    const handleAnimationEnd = () => {
      setAnimationDirection(null);
      isAnimatingRef.current = false;
    };

    bookSpreadRef.current.addEventListener('animationend', handleAnimationEnd, { once: true });

    // Fallback: reset animation state after timeout in case animationend doesn't fire
    setTimeout(() => {
      if (isAnimatingRef.current) {
        handleAnimationEnd();
      }
    }, 900);
  }, []);

  // Expose animation trigger to parent for keyboard navigation
  useImperativeHandle(ref, () => ({
    triggerAnimation: triggerPageTurnAnimation,
  }), [triggerPageTurnAnimation]);

  const handleSpreadClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!bookSpreadRef.current || isAnimatingRef.current) return;

    const rect = bookSpreadRef.current.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const spreadWidth = rect.width;
    const relativeX = clickX / spreadWidth;

    // Left 25% area - go to previous page
    if (relativeX < 0.25) {
      triggerPageTurnAnimation('backward');
      onPrevPage();
    }
    // Right 25% area - go to next page
    else if (relativeX > 0.75) {
      triggerPageTurnAnimation('forward');
      onNextPage();
    }
    // Middle 50% - text selection area, trigger content click
    else {
      onContentClick?.();
    }
  }, [onPrevPage, onNextPage, triggerPageTurnAnimation, onContentClick]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!bookSpreadRef.current) return;

    const rect = bookSpreadRef.current.getBoundingClientRect();
    const relativeX = (event.clientX - rect.left) / rect.width;

    if (relativeX < 0.25) {
      setHoverZone('left');
    } else if (relativeX > 0.75) {
      setHoverZone('right');
    } else {
      setHoverZone(null);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoverZone(null);
  }, []);

  // Use ResizeObserver to handle initial render and size changes
  useEffect(() => {
    if (!bookSpreadRef.current || isRenderReadyCalledRef.current) return;

    const spreadElement = bookSpreadRef.current;

    const tryRenderReady = () => {
      const width = spreadElement.clientWidth;
      const height = spreadElement.clientHeight;

      if (width > 0 && height > 0) {
        onRenderReady(spreadElement, width, height);
        isRenderReadyCalledRef.current = true;
        return true;
      }
      return false;
    };

    // Try immediate render
    if (!tryRenderReady()) {
      // If size not ready, set up ResizeObserver to wait for it
      const resizeObserver = new ResizeObserver((entries) => {
        if (isRenderReadyCalledRef.current) return;
        
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            onRenderReady(spreadElement, width, height);
            isRenderReadyCalledRef.current = true;
            resizeObserver.disconnect();
            break;
          }
        }
      });

      resizeObserver.observe(spreadElement);

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [onRenderReady, bookId]);

  const getSpreadClassName = () => {
    const classes = ['book-spread'];
    if (animationDirection === 'forward') {
      classes.push('turning-forward');
    } else if (animationDirection === 'backward') {
      classes.push('turning-backward');
    }
    if (hoverZone === 'left') {
      classes.push('click-prev');
    } else if (hoverZone === 'right') {
      classes.push('click-next');
    }
    return classes.join(' ');
  };

  const getSpreadWrapperClassName = () => {
    const classes = ['book-spread-wrapper'];
    if (animationDirection === 'forward') {
      classes.push('turning-forward');
    } else if (animationDirection === 'backward') {
      classes.push('turning-backward');
    }
    return classes.join(' ');
  };

  const getContainerClassName = () => {
    const classes = ['book-container'];
    if (animationDirection === 'forward') {
      classes.push('turning-forward');
    } else if (animationDirection === 'backward') {
      classes.push('turning-backward');
    }
    return classes.join(' ');
  };

  // Calculate stack widths based on progress
  const stackBasePx = 8;
  const stackExtraPx = 25;
  const leftThickness = stackBasePx + stackExtraPx * Math.sqrt(clampedProgress);
  const rightThickness = stackBasePx + stackExtraPx * Math.sqrt(1 - clampedProgress);
  const leftStackWidth = `${leftThickness.toFixed(2)}px`;
  const rightStackWidth = `${rightThickness.toFixed(2)}px`;

  return (
    <div className="book-layout">
      <div className={getContainerClassName()}>
        <div
          className="page-stack page-stack-left"
          style={{ width: leftStackWidth }}
        />
        <div className="book-page book-page-left" />
        <div className={getSpreadWrapperClassName()}>
          <div
            ref={bookSpreadRef}
            className={getSpreadClassName()}
            onClick={handleSpreadClick}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            {showEndPage && (
              <div className="end-page-overlay" onClick={(e) => e.stopPropagation()}>
                <div className="end-page-modal">
                  <h2 className="end-page-title">End</h2>
                  <p className="end-page-subtitle">Write your final thoughts or chat with AI about this book.</p>
                  <div className="end-mode-switch" role="tablist" aria-label="End mode">
                    <button
                      className={`end-mode-switch-btn ${endMode === 'write' ? 'active' : ''}`}
                      onClick={() => onEndModeChange?.('write')}
                    >
                      Write
                    </button>
                    <button
                      className={`end-mode-switch-btn ${endMode === 'chat' ? 'active' : ''}`}
                      onClick={() => onEndModeChange?.('chat')}
                    >
                      Chat
                    </button>
                    <span className={`end-mode-switch-pill ${endMode === 'chat' ? 'chat' : 'write'}`} />
                  </div>

                  {endMode === 'write' ? (
                    <>
                      <textarea
                        className="end-page-textarea"
                        placeholder="Write what stayed with you..."
                        value={endThoughts}
                        onChange={(e) => onEndThoughtsChange?.(e.target.value)}
                      />
                      <div className="end-page-actions">
                        <button
                          className="end-page-btn end-page-btn-primary"
                          onClick={onEndExport}
                        >
                          Export Notes
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="end-chat-note">
                        Ask questions about this book. Use "Summarize to Notes" to save the chat takeaway.
                      </div>
                      <div className="end-chat-thread">
                        {endChatMessages.length === 0 && (
                          <div className="end-chat-empty">No messages yet.</div>
                        )}
                        {endChatMessages.map((msg, idx) => (
                          <div key={`${msg.timestamp}-${idx}`} className={`end-chat-msg ${msg.role}`}>
                            <div className="end-chat-msg-role">{msg.role === 'user' ? 'You' : 'AI'}</div>
                            <div className="end-chat-msg-content">{msg.content}</div>
                          </div>
                        ))}
                      </div>
                      <div className="end-chat-input-row">
                        <textarea
                          className="end-chat-input"
                          placeholder="Ask about themes, characters, arguments..."
                          value={endChatInput}
                          onChange={(e) => onEndChatInputChange?.(e.target.value)}
                          disabled={endChatLoading}
                        />
                        <button
                          className="end-page-btn end-page-btn-primary"
                          onClick={onEndChatSend}
                          disabled={endChatLoading || !endChatInput.trim()}
                        >
                          Send
                        </button>
                      </div>
                      {endChatSummary && <div className="end-chat-summary-hint">Summary saved to notes.</div>}
                      {endChatError && <div className="end-chat-error">{endChatError}</div>}
                      <div className="end-page-actions">
                        <button
                          className="end-page-btn end-page-btn-secondary"
                          onClick={onEndChatSummarize}
                          disabled={endChatLoading || endChatMessages.length === 0}
                        >
                          Summarize to Notes
                        </button>
                        <button
                          className="end-page-btn end-page-btn-primary"
                          onClick={onEndExport}
                        >
                          Export Notes
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="book-spine" />
        </div>
        <div className="book-page book-page-right" />
        <div
          className="page-stack page-stack-right"
          style={{ width: rightStackWidth }}
        />
      </div>
      <PageStack progress={clampedProgress} />
    </div>
  );
});
