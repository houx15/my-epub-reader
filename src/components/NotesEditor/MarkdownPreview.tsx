import { useEffect, useRef } from 'react';
import { marked } from 'marked';
import type { Chapter } from '../../types';

interface MarkdownPreviewProps {
  content: string;
  onJumpToLocation: (cfi: string) => void;
  chapters: Chapter[];
}

/**
 * MarkdownPreview - Renders Markdown with clickable location anchors
 */
export function MarkdownPreview({
  content,
  onJumpToLocation,
  chapters,
}: MarkdownPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  /**
   * Configure marked with custom renderer
   */
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  /**
   * Process anchor comments and render Markdown
   */
  const renderMarkdown = (): string => {
    // First, process location anchors: <!-- loc:chapter-id:cfi-string -->
    const processedContent = content.replace(
      /<!-- loc:([^:]+):([^>]+) -->/g,
      (_match, chapterId, cfi) => {
        // Find chapter by ID
        const chapter = chapters.find(c => c.id === chapterId);
        const chapterTitle = chapter ? chapter.title : 'Unknown Chapter';

        // Create clickable badge
        return `<span class="location-anchor" data-cfi="${cfi}" data-chapter-id="${chapterId}">📍 ${chapterTitle}</span>`;
      }
    );

    // Render Markdown to HTML
    const html = marked.parse(processedContent) as string;

    return html;
  };

  /**
   * Attach click handlers to location anchors
   */
  useEffect(() => {
    if (!previewRef.current) return;

    const anchors = previewRef.current.querySelectorAll('.location-anchor');

    const handleAnchorClick = (e: Event) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;
      const cfi = target.getAttribute('data-cfi');

      if (cfi) {
        onJumpToLocation(cfi);
      }
    };

    anchors.forEach(anchor => {
      anchor.addEventListener('click', handleAnchorClick);
    });

    return () => {
      anchors.forEach(anchor => {
        anchor.removeEventListener('click', handleAnchorClick);
      });
    };
  }, [content, onJumpToLocation]);

  return (
    <div
      ref={previewRef}
      className="markdown-preview"
      dangerouslySetInnerHTML={{ __html: renderMarkdown() }}
    />
  );
}
