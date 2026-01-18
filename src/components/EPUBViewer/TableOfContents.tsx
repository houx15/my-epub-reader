import React from 'react';
import './TableOfContents.css';
import type { Chapter } from '../../types';

interface TableOfContentsProps {
  chapters: Chapter[];
  currentChapter: Chapter | null;
  isOpen: boolean;
  onClose: () => void;
  onChapterSelect: (href: string) => void;
}

export function TableOfContents({
  chapters,
  currentChapter,
  isOpen,
  onClose,
  onChapterSelect,
}: TableOfContentsProps) {
  if (!isOpen) {
    return null;
  }

  const renderChapter = (chapter: Chapter, level: number = 0) => {
    const isActive = currentChapter?.id === chapter.id;
    const indentStyle = { paddingLeft: `${level * 16 + 12}px` };

    return (
      <div key={chapter.id} className="toc-chapter-group">
        <button
          className={`toc-chapter-item ${isActive ? 'active' : ''}`}
          style={indentStyle}
          onClick={() => onChapterSelect(chapter.href)}
          title={chapter.title}
        >
          <span className="toc-chapter-title truncate">{chapter.title}</span>
        </button>
        {chapter.children &&
          chapter.children.map((child) => renderChapter(child, level + 1))}
      </div>
    );
  };

  return (
    <div className="toc-overlay" onClick={onClose}>
      <div className="toc-sidebar" onClick={(e) => e.stopPropagation()}>
        <div className="toc-header">
          <h3>Table of Contents</h3>
          <button className="toc-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        <div className="toc-content">
          {chapters.length === 0 ? (
            <div className="toc-empty">
              <p>No chapters available</p>
            </div>
          ) : (
            chapters.map((chapter) => renderChapter(chapter))
          )}
        </div>
      </div>
    </div>
  );
}
