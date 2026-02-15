import type { Chapter } from '../../types';
import './StatusBar.css';

interface StatusBarProps {
  currentChapter: Chapter | null;
  totalChapters: number;
  currentChapterIndex: number;
  progress: number;
}

export function StatusBar({
  currentChapter,
  totalChapters,
  currentChapterIndex,
  progress,
}: StatusBarProps) {
  const progressPercentage = Math.round(progress * 100);

  return (
    <div className="status-bar">
      <div className="status-section status-left">
        {currentChapter ? (
          <span className="chapter-name" title={currentChapter.title}>
            📖 {currentChapter.title}
          </span>
        ) : (
          <span className="status-placeholder">No chapter</span>
        )}
      </div>

      <div className="status-section status-center">
        {totalChapters > 0 ? (
          <span className="progress-info">
            {progressPercentage}% · Chapter {currentChapterIndex + 1}/{totalChapters}
          </span>
        ) : (
          <span className="status-placeholder">—</span>
        )}
      </div>

      <div className="status-section status-right">
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}
