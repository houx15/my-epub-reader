import { useState, useRef, useEffect, useCallback } from 'react';
import type { Highlight } from '../../types';
import { COLOR_EMOJI_MAP } from '../../services/notesGenerator';
import './Notebook.css';

interface NotebookEntryProps {
  highlight: Highlight;
  onClickHighlight: (highlight: Highlight) => void;
  onEditAnnotation: (id: string, annotation: string) => void;
  onDelete: (id: string) => void;
}

const COLOR_HEX_MAP: Record<string, string> = {
  yellow: '#FFEB3B',
  green: '#4CAF50',
  blue: '#2196F3',
  pink: '#E91E63',
  orange: '#FF9800',
};

export function NotebookEntry({
  highlight,
  onClickHighlight,
  onEditAnnotation,
  onDelete,
}: NotebookEntryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [annotation, setAnnotation] = useState(highlight.annotation);
  const [isHovered, setIsHovered] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setAnnotation(highlight.annotation);
  }, [highlight.annotation]);

  const handleBlur = useCallback(() => {
    if (annotation !== highlight.annotation) {
      onEditAnnotation(highlight.id, annotation);
    }
  }, [annotation, highlight.annotation, highlight.id, onEditAnnotation]);

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const maxTextLength = 150;
  const shouldTruncate = highlight.text.length > maxTextLength;
  const displayText =
    shouldTruncate && !isExpanded
      ? highlight.text.slice(0, maxTextLength) + '...'
      : highlight.text;

  const colorHex = COLOR_HEX_MAP[highlight.color] || '#FFEB3B';
  const colorEmoji = COLOR_EMOJI_MAP[highlight.color] || '📝';

  return (
    <div
      className="notebook-entry"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ borderLeftColor: colorHex }}
    >
      <div className="notebook-entry-header">
        <span className="notebook-entry-chapter">{highlight.chapterTitle}</span>
        <div className="notebook-entry-header-right">
          <span className="notebook-entry-meta">
            {colorEmoji} {formatDate(highlight.createdAt)}
          </span>
          {isHovered && (
            <button
              className="notebook-entry-delete"
              onClick={() => onDelete(highlight.id)}
              title="删除高亮"
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      <div
        className="notebook-entry-quote"
        onClick={() => onClickHighlight(highlight)}
        title="点击跳转到书中位置"
      >
        "{displayText}"
        {shouldTruncate && (
          <button
            className="notebook-entry-expand"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
          >
            {isExpanded ? '收起' : '展开'}
          </button>
        )}
      </div>

      <textarea
        ref={textareaRef}
        className="notebook-entry-annotation"
        placeholder="添加笔记..."
        value={annotation}
        onChange={(e) => setAnnotation(e.target.value)}
        onBlur={handleBlur}
        rows={2}
      />
    </div>
  );
}
