import { useRef, useEffect, useCallback, useState } from 'react';
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

export function BookLayout({
  onRenderReady,
  onNextPage,
  onPrevPage,
  progress,
}: BookLayoutProps) {
  const bookSpreadRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationDirection, setAnimationDirection] = useState<'forward' | 'backward' | null>(null);

  const triggerPageTurnAnimation = useCallback((direction: 'forward' | 'backward') => {
    if (isAnimating || !bookSpreadRef.current) return;

    setAnimationDirection(direction);
    setIsAnimating(true);

    const handleAnimationEnd = () => {
      setAnimationDirection(null);
      setIsAnimating(false);
    };

    bookSpreadRef.current.addEventListener('animationend', handleAnimationEnd, { once: true });

    setTimeout(() => {
      if (isAnimating) {
        handleAnimationEnd();
      }
    }, 450);
  }, [isAnimating]);

  const handleSpreadClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!bookSpreadRef.current || isAnimating) return;

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
  }, [isAnimating, onPrevPage, onNextPage, triggerPageTurnAnimation]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isAnimating) return;

    if (event.key === 'ArrowRight') {
      triggerPageTurnAnimation('forward');
      onNextPage();
    } else if (event.key === 'ArrowLeft') {
      triggerPageTurnAnimation('backward');
      onPrevPage();
    }
  }, [isAnimating, onNextPage, onPrevPage, triggerPageTurnAnimation]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!bookSpreadRef.current) return;

    const spreadElement = bookSpreadRef.current;
    const width = spreadElement.clientWidth;
    const height = spreadElement.clientHeight;

    if (width > 0 && height > 0) {
      onRenderReady(spreadElement, width, height);
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
          style={{ width: `calc(3px + ${progress} * 12px)` }}
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
          style={{ width: `calc(3px + ${(1 - progress)} * 12px)` }}
        />
      </div>
      <PageStack progress={progress} />
    </div>
  );
}
