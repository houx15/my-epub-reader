// StatusBar component
import type { Chapter } from '../../types';
import './StatusBar.css';

interface StatusBarProps {
  currentChapter: Chapter | null;
  totalChapters: number;
  currentChapterIndex: number;
  wordCount: number;
}

export function StatusBar({
  currentChapter,
  totalChapters,
  currentChapterIndex,
  wordCount,
}: StatusBarProps) {
  /**
   * Calculate reading progress percentage
   */
  const getProgress = (): number => {
    if (totalChapters === 0) return 0;
    return Math.round(((currentChapterIndex + 1) / totalChapters) * 100);
  };

  return (
    <div className="status-bar">
      {/* Left: Current chapter */}
      <div className="status-section status-left">
        {currentChapter ? (
          <span className="chapter-name" title={currentChapter.title}>
            📖 {currentChapter.title}
          </span>
        ) : (
          <span className="status-placeholder">No chapter</span>
        )}
      </div>

      {/* Center: Progress */}
      <div className="status-section status-center">
        {totalChapters > 0 ? (
          <span className="progress-info">
            {getProgress()}% · Chapter {currentChapterIndex + 1}/{totalChapters}
          </span>
        ) : (
          <span className="status-placeholder">—</span>
        )}
      </div>

      {/* Right: Word count */}
      <div className="status-section status-right">
        <span className="word-count-info">
          📝 Notes: {wordCount.toLocaleString()} words
        </span>
      </div>
    </div>
  );
}
