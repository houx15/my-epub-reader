import './PageStack.css';

export interface PageStackProps {
  progress: number;
}

export function PageStack({ progress }: PageStackProps) {
  // Clamp progress to valid range [0, 1] to prevent invalid CSS values
  const clampedProgress = Math.max(0, Math.min(1, progress));
  const percentage = Math.round(clampedProgress * 100);

  return (
    <div className="page-stack-indicator">
      <div className="page-stack-bar">
        <div
          className="page-stack-bar-read"
          style={{ width: `${percentage}%` }}
        />
        <div
          className="page-stack-bar-remaining"
          style={{ width: `${100 - percentage}%` }}
        />
      </div>
      <span className="page-stack-label">{percentage}%</span>
    </div>
  );
}
