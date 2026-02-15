import { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import type { Chapter } from '../../types';
import { PageStack } from './PageStack';
import './BookLayout.css';

export interface BookLayoutProps {
  onRenderReady: (element: HTMLElement, width: number, height: number) => void;
  chapters: Chapter[];
  currentChapter: Chapter | null;
  onChapterSelect: (href: string) => void;
  onNextPage: () => void;
  onPrevPage: () => void;
  progress: number;
}

export interface BookLayoutRef {
  triggerAnimation: (direction: 'forward' | 'backward') => void;
}

export const BookLayout = forwardRef<BookLayoutRef, BookLayoutProps>(function BookLayout(
  {
    onRenderReady,
    onNextPage,
    onPrevPage,
    progress,
  },
  ref
) {
  const bookSpreadRef = useRef<HTMLDivElement>(null);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward' | null>(null);
  const isAnimatingRef = useRef(false);
  const isRenderReadyCalledRef = useRef(false);

  // Clamp progress to valid range [0, 1]
  const clampedProgress = Math.max(0, Math.min(1, progress));

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
    }, 450);
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

    if (relativeX < 0.3) {
      triggerPageTurnAnimation('backward');
      onPrevPage();
    } else if (relativeX > 0.7) {
      triggerPageTurnAnimation('forward');
      onNextPage();
    }
  }, [onPrevPage, onNextPage, triggerPageTurnAnimation]);

  // Use ResizeObserver to handle initial render and size changes
  // Guarded with isRenderReadyCalledRef to prevent re-initialization on callback identity changes
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
  }, [onRenderReady]);

  const getSpreadClassName = () => {
    const classes = ['book-spread'];
    if (animationDirection === 'forward') {
      classes.push('turning-forward');
    } else if (animationDirection === 'backward') {
      classes.push('turning-backward');
    }
    return classes.join(' ');
  };

  return (
    <div className="book-layout">
      <div className="book-container">
        <div
          className="page-stack page-stack-left"
          style={{ width: `calc(3px + ${clampedProgress} * 12px)` }}
        />
        <div className="book-spread-wrapper">
          <div className="book-page book-page-left" />
          <div
            ref={bookSpreadRef}
            className={getSpreadClassName()}
            onClick={handleSpreadClick}
          />
          <div className="book-spine" />
          <div className="book-page book-page-right" />
        </div>
        <div
          className="page-stack page-stack-right"
          style={{ width: `calc(3px + ${(1 - clampedProgress)} * 12px)` }}
        />
      </div>
      <PageStack progress={clampedProgress} />
    </div>
  );
});
