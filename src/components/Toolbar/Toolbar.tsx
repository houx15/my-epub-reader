import { useRef, useState } from 'react';
import { BookOpen, Type, NotebookPen, MessageSquare, Settings } from '../Icons';
import { TypographyPopover } from '../Typography/TypographyPopover';
import type { TypographySettings, PanelMode } from '../../types';
import './Toolbar.css';

interface ToolbarProps {
  bookTitle: string | null;
  onOpenFile: () => void;
  onOpenSettings: () => void;
  hasBook: boolean;
  onToggleNotebook: () => void;
  onToggleAI: () => void;
  panelMode: PanelMode;
  typography: TypographySettings;
  onTypographyChange: (updates: Partial<TypographySettings>) => void;
}

export function Toolbar({
  bookTitle,
  onOpenFile,
  onOpenSettings,
  hasBook,
  onToggleNotebook,
  onToggleAI,
  panelMode,
  typography,
  onTypographyChange,
}: ToolbarProps) {
  const typographyAnchorRef = useRef<HTMLButtonElement>(null);
  const [isTypographyOpen, setIsTypographyOpen] = useState(false);

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn-primary toolbar-btn" onClick={onOpenFile} title="Open EPUB file">
          <BookOpen size={18} />
          <span>Open</span>
        </button>
        {bookTitle && <h2 className="book-title truncate">{bookTitle}</h2>}
      </div>

      <div className="toolbar-right">
        <button
          ref={typographyAnchorRef}
          className={`btn-secondary btn-icon ${isTypographyOpen ? 'active' : ''}`}
          onClick={() => setIsTypographyOpen(!isTypographyOpen)}
          disabled={!hasBook}
          title="Typography settings"
        >
          <Type size={18} />
        </button>
        <TypographyPopover
          isOpen={isTypographyOpen}
          anchorRef={typographyAnchorRef}
          onClose={() => setIsTypographyOpen(false)}
          settings={typography}
          onSettingsChange={onTypographyChange}
        />

        <button
          className={`btn-secondary btn-icon ${panelMode === 'notebook' ? 'active' : ''}`}
          onClick={onToggleNotebook}
          disabled={!hasBook}
          title="Toggle notebook (Cmd+B)"
        >
          <NotebookPen size={18} />
        </button>

        <button
          className={`btn-secondary btn-icon ${panelMode === 'ai' ? 'active' : ''}`}
          onClick={onToggleAI}
          disabled={!hasBook}
          title="Toggle AI assistant (Cmd+/)"
        >
          <MessageSquare size={18} />
        </button>

        <button
          className="btn-secondary btn-icon"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}
