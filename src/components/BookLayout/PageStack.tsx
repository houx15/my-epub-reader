import React from 'react';
import './PageStack.css';

export interface PageStackProps {
  progress: number; // 0-1
}

export const PageStack: React.FC<PageStackProps> = ({ progress }) => {
  // Clamp progress to valid range
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  // Format percentage
  const percentage = Math.round(clampedProgress * 100);
  
  // Estimate total pages (this is approximate)
  // const estimatedTotalPages = Math.max(1, Math.round(300)); // Default estimate
  // const currentPage = Math.max(1, Math.round(clampedProgress * estimatedTotalPages));

  return (
    <div className="page-stack-indicator">
      <div className="page-stack-visual">
        <div 
          className="page-stack-bar page-stack-read"
          style={{ width: `${clampedProgress * 100}%` }}
        />
        <div 
          className="page-stack-bar page-stack-unread"
          style={{ width: `${(1 - clampedProgress) * 100}%` }}
        />
      </div>
      <span className="page-stack-percentage">{percentage}%</span>
    </div>
  );
};
