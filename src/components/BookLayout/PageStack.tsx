import './PageStack.css';

export interface PageStackProps {
  progress: number;
}

export function PageStack({ progress }: PageStackProps) {
  const percentage = Math.round(progress * 100);

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
