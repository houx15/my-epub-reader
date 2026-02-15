import './Toolbar.css';

interface ToolbarProps {
  bookTitle: string | null;
  onOpenFile: () => void;
  onExportNotes: () => void;
  onOpenSettings: () => void;
  hasBook: boolean;
}

export function Toolbar({
  bookTitle,
  onOpenFile,
  onExportNotes,
  onOpenSettings,
  hasBook,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button className="btn-primary" onClick={onOpenFile} title="Open EPUB file">
          📖 Open EPUB
        </button>
        {bookTitle && <h2 className="book-title truncate">{bookTitle}</h2>}
      </div>

      <div className="toolbar-right">
        <button
          className="btn-secondary"
          onClick={onExportNotes}
          disabled={!hasBook}
          title="Export notes as Markdown"
        >
          📤 Export Notes
        </button>
        <button
          className="btn-secondary"
          onClick={onOpenSettings}
          title="Settings"
        >
          ⚙️ Settings
        </button>
      </div>
    </div>
  );
}
