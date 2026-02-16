import { useEffect, useRef, useState } from 'react';
import { Highlighter, Underline, MessageSquare, Copy } from '../Icons';
import { formatSelectionAsQuote } from '../../services/noteUtils';
import type { Selection, HighlightColor } from '../../types';
import './SelectionPopover.css';

interface SelectionPopoverProps {
  selection: Selection;
  position: { x: number; y: number };
  onQuoteToNotes: (formattedQuote: string) => void;
  onDiscussWithAI: () => void;
  onHighlight: (color: HighlightColor) => void;
  onClose: () => void;
  onDismiss: () => void;
}

export function SelectionPopover({
  selection,
  position,
  onQuoteToNotes,
  onDiscussWithAI,
  onHighlight,
  onClose,
  onDismiss,
}: SelectionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!popoverRef.current) return;

    const popover = popoverRef.current;
    const rect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    let { x, y } = position;

    if (x + rect.width / 2 > viewportWidth - 10) {
      x = viewportWidth - rect.width / 2 - 10;
    }
    if (x - rect.width / 2 < 10) {
      x = rect.width / 2 + 10;
    }

    if (y - rect.height < 10) {
      y = y + 30;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  const handleHighlight = () => {
    // Use yellow as default color
    onHighlight('yellow');
    onClose();
  };

  const handleUnderlineToNotes = () => {
    // Apply blue-pen underline highlight first
    onHighlight('blue-pen');
    // Then add to notes
    const formattedQuote = formatSelectionAsQuote(selection);
    onQuoteToNotes(formattedQuote);
    onClose();
  };

  const handleDiscussWithAI = () => {
    onDiscussWithAI();
    onDismiss();
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      onClose();
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <div
      ref={popoverRef}
      className="selection-popover"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <div className="popover-arrow"></div>
      <div className="popover-buttons">
        <button
          className="popover-button popover-button--highlight"
          onClick={handleHighlight}
          title="Highlight with yellow"
        >
          <Highlighter size={16} />
          <span>Highlight</span>
        </button>
        <button
          className="popover-button popover-button--underline"
          onClick={handleUnderlineToNotes}
          title="Underline and add to notes"
        >
          <Underline size={16} />
          <span>Underline</span>
        </button>
        <button
          className="popover-button"
          onClick={handleDiscussWithAI}
          title="Discuss this selection with AI"
        >
          <MessageSquare size={16} />
          <span>AI</span>
        </button>
        <button
          className="popover-button"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          <Copy size={16} />
          <span>Copy</span>
        </button>
      </div>
    </div>
  );
}
