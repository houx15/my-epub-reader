import { useEffect, useRef, useState } from 'react';
import { ColorPicker } from './ColorPicker';
import type { Highlight, HighlightColor } from '../../types';
import './HighlightPopover.css';

interface HighlightPopoverProps {
  highlight: Highlight;
  position: { x: number; y: number };
  onUpdateAnnotation: (id: string, annotation: string) => void;
  onChangeColor: (id: string, color: HighlightColor) => void;
  onDelete: (id: string) => void;
  onAskAI: (highlight: Highlight) => void;
  onClose: () => void;
}

export function HighlightPopover({
  highlight,
  position,
  onUpdateAnnotation,
  onChangeColor,
  onDelete,
  onAskAI,
  onClose,
}: HighlightPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const [annotation, setAnnotation] = useState(highlight.annotation);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setAnnotation(highlight.annotation);
  }, [highlight.annotation]);

  useEffect(() => {
    if (!popoverRef.current) return;

    const popover = popoverRef.current;
    const rect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let { x, y } = position;

    if (x + rect.width / 2 > viewportWidth - 10) {
      x = viewportWidth - rect.width / 2 - 10;
    }
    if (x - rect.width / 2 < 10) {
      x = rect.width / 2 + 10;
    }

    if (y - rect.height < 10) {
      y = y + 40;
    }

    if (y + rect.height > viewportHeight - 10) {
      y = viewportHeight - rect.height - 10;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const handleIframeClick = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    const iframes = document.querySelectorAll('iframe');
    iframes.forEach((iframe) => {
      try {
        iframe.contentDocument?.addEventListener('mousedown', handleIframeClick);
      } catch {
        // Cross-origin iframe, can't access
      }
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      iframes.forEach((iframe) => {
        try {
          iframe.contentDocument?.removeEventListener('mousedown', handleIframeClick);
        } catch {
          // Cross-origin iframe, can't access
        }
      });
    };
  }, [onClose]);

  const handleAnnotationBlur = () => {
    if (annotation !== highlight.annotation) {
      onUpdateAnnotation(highlight.id, annotation);
    }
  };

  const handleColorChange = (color: HighlightColor) => {
    onChangeColor(highlight.id, color);
  };

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete(highlight.id);
      onClose();
    } else {
      setShowDeleteConfirm(true);
    }
  };

  const handleAskAI = () => {
    onAskAI(highlight);
    onClose();
  };

  const truncatedText = highlight.text.length > 80 
    ? `${highlight.text.substring(0, 80)}...` 
    : highlight.text;

  return (
    <div
      ref={popoverRef}
      className="highlight-popover"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        transform: 'translate(-50%, 10px)',
      }}
    >
      <div className="highlight-popover-header">
        <div className="highlight-popover-text" title={highlight.text}>
          "{truncatedText}"
        </div>
        <button className="highlight-popover-close" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="highlight-popover-section">
        <label className="highlight-popover-label">Color</label>
        <ColorPicker
          selectedColor={highlight.color}
          onColorSelect={handleColorChange}
          size="small"
        />
      </div>

      <div className="highlight-popover-section">
        <label className="highlight-popover-label">Note</label>
        <textarea
          ref={textareaRef}
          className="highlight-popover-textarea"
          value={annotation}
          onChange={(e) => setAnnotation(e.target.value)}
          onBlur={handleAnnotationBlur}
          placeholder="Add a note..."
          rows={3}
        />
      </div>

      <div className="highlight-popover-actions">
        <button className="highlight-popover-btn highlight-popover-btn--ai" onClick={handleAskAI}>
          🤖 Ask AI
        </button>
        <button 
          className={`highlight-popover-btn ${showDeleteConfirm ? 'highlight-popover-btn--danger-confirm' : 'highlight-popover-btn--danger'}`}
          onClick={handleDelete}
        >
          {showDeleteConfirm ? '⚠️ Confirm Delete' : '🗑️ Delete'}
        </button>
      </div>
    </div>
  );
}
