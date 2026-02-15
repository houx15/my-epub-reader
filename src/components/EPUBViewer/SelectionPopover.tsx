import { useEffect, useRef, useState } from 'react';
import { formatSelectionAsQuote } from '../../services/noteUtils';
import type { Selection } from '../../types';
import './SelectionPopover.css';

interface SelectionPopoverProps {
  selection: Selection;
  position: { x: number; y: number };
  onQuoteToNotes: (formattedQuote: string) => void;
  onDiscussWithAI: () => void;
  onClose: () => void;
  onDismiss: () => void;
}

/**
 * SelectionPopover - Floating menu for text selection actions
 */
export function SelectionPopover({
  selection,
  position,
  onQuoteToNotes,
  onDiscussWithAI,
  onClose,
  onDismiss,
}: SelectionPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  /**
   * Adjust position to keep popover within viewport
   */
  useEffect(() => {
    if (!popoverRef.current) return;

    const popover = popoverRef.current;
    const rect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    // Viewport height is available at window.innerHeight

    let { x, y } = position;

    // Adjust horizontal position
    if (x + rect.width / 2 > viewportWidth - 10) {
      x = viewportWidth - rect.width / 2 - 10;
    }
    if (x - rect.width / 2 < 10) {
      x = rect.width / 2 + 10;
    }

    // Adjust vertical position (appears above selection)
    if (y - rect.height < 10) {
      // If not enough space above, show below
      y = y + 30;
    }

    setAdjustedPosition({ x, y });
  }, [position]);

  /**
   * Handle Quote to Notes
   */
  const handleQuoteToNotes = () => {
    const formattedQuote = formatSelectionAsQuote(selection);
    onQuoteToNotes(formattedQuote);
    onClose();
  };

  /**
   * Handle Discuss with AI
   */
  const handleDiscussWithAI = () => {
    onDiscussWithAI();
    onDismiss();
  };

  /**
   * Handle Copy to Clipboard
   */
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text);
      // Could show a brief "Copied!" message here
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
          className="popover-button"
          onClick={handleQuoteToNotes}
          title="Add quote to notes"
        >
          📝 Quote to Notes
        </button>
        <button
          className="popover-button"
          onClick={handleDiscussWithAI}
          title="Discuss this selection with AI"
        >
          💬 Discuss with AI
        </button>
        <button
          className="popover-button"
          onClick={handleCopy}
          title="Copy to clipboard"
        >
          📋 Copy
        </button>
      </div>
    </div>
  );
}
