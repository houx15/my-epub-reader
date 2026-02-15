import { useEffect, useRef, useState } from 'react';
import { formatSelectionAsQuote } from '../../services/noteUtils';
import { ColorPicker } from '../Highlights/ColorPicker';
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
  const [showColorPicker, setShowColorPicker] = useState(false);

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
  }, [position, showColorPicker]);

  const handleQuoteToNotes = () => {
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

  const handleHighlightClick = () => {
    setShowColorPicker(!showColorPicker);
  };

  const handleColorSelect = (color: HighlightColor) => {
    onHighlight(color);
    onClose();
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
          onClick={handleHighlightClick}
          title="Highlight selected text"
        >
          🖍 Highlight
        </button>
        <button
          className="popover-button"
          onClick={handleQuoteToNotes}
          title="Add quote to notes"
        >
          📝 Quote
        </button>
        <button
          className="popover-button"
          onClick={handleDiscussWithAI}
          title="Discuss this selection with AI"
        >
          💬 AI
        </button>
        <button
          className="popover-button"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          📋 Copy
        </button>
      </div>
      {showColorPicker && (
        <div className="popover-color-picker">
          <ColorPicker onColorSelect={handleColorSelect} size="medium" />
        </div>
      )}
    </div>
  );
}
