import React, { useState, useCallback, useRef, useEffect } from 'react';
import './ThreeColumnLayout.css';

interface ThreeColumnLayoutProps {
  left: React.ReactNode;
  center: React.ReactNode;
  right: React.ReactNode;
  isRightCollapsed: boolean;
}

export function ThreeColumnLayout({
  left,
  center,
  right,
  isRightCollapsed,
}: ThreeColumnLayoutProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = useState(50); // percentage
  const [rightWidth, setRightWidth] = useState(380); // pixels
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const handleLeftDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingLeft(true);
  }, []);

  const handleRightDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingRight(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;

      if (isDraggingLeft) {
        const newLeftWidth = ((e.clientX - containerRect.left) / containerWidth) * 100;
        // Clamp between 20% and 60%
        setLeftWidth(Math.min(60, Math.max(20, newLeftWidth)));
      }

      if (isDraggingRight && !isRightCollapsed) {
        const newRightWidth = containerRect.right - e.clientX;
        // Clamp between 280px and 500px
        setRightWidth(Math.min(500, Math.max(280, newRightWidth)));
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
    };

    if (isDraggingLeft || isDraggingRight) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDraggingLeft, isDraggingRight, isRightCollapsed]);

  const actualRightWidth = isRightCollapsed ? 48 : rightWidth;

  return (
    <div ref={containerRef} className="three-column-layout">
      <div
        className="column column-left"
        style={{ width: `${leftWidth}%`, flexGrow: 0, flexShrink: 0 }}
      >
        {left}
      </div>

      {/* Left resize handle */}
      <div
        className={`resize-handle ${isDraggingLeft ? 'active' : ''}`}
        onMouseDown={handleLeftDragStart}
      />

      <div
        className="column column-center"
        style={{ flexGrow: 1, flexShrink: 1 }}
      >
        {center}
      </div>

      {/* Right resize handle */}
      {!isRightCollapsed && (
        <div
          className={`resize-handle ${isDraggingRight ? 'active' : ''}`}
          onMouseDown={handleRightDragStart}
        />
      )}

      <div
        className={`column column-right ${isRightCollapsed ? 'collapsed' : ''}`}
        style={{ width: actualRightWidth, flexGrow: 0, flexShrink: 0 }}
      >
        {right}
      </div>
    </div>
  );
}
