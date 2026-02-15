import type { Highlight, HighlightColor } from '../types';

const COLOR_EMOJI_MAP: Record<HighlightColor, string> = {
  yellow: '🟡',
  green: '🟢',
  blue: '🔵',
  pink: '🩷',
  orange: '🟠',
};

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}

export function generateNotesFromHighlights(
  highlights: Highlight[],
  bookTitle: string,
  author: string
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let markdown = `# 阅读笔记: ${bookTitle}\n\n`;
  markdown += `**作者:** ${author}\n`;
  markdown += `**生成时间:** ${dateStr}\n\n`;
  markdown += `---\n\n`;

  const sortedHighlights = [...highlights].sort((a, b) => {
    if (a.chapterId !== b.chapterId) {
      return a.chapterId.localeCompare(b.chapterId);
    }
    return a.createdAt - b.createdAt;
  });

  const groupedByChapter = new Map<string, Highlight[]>();
  for (const highlight of sortedHighlights) {
    const chapterTitle = highlight.chapterTitle || '未知章节';
    if (!groupedByChapter.has(chapterTitle)) {
      groupedByChapter.set(chapterTitle, []);
    }
    groupedByChapter.get(chapterTitle)!.push(highlight);
  }

  for (const [chapterTitle, chapterHighlights] of groupedByChapter) {
    markdown += `## ${chapterTitle}\n\n`;

    for (const highlight of chapterHighlights) {
      const lines = highlight.text.split('\n');
      const quotedText = lines.map((line) => `> ${line}`).join('\n');
      markdown += quotedText + '\n\n';

      if (highlight.annotation && highlight.annotation.trim()) {
        markdown += `*${escapeMarkdown(highlight.annotation)}*\n\n`;
      }

      const emoji = COLOR_EMOJI_MAP[highlight.color] || '📝';
      markdown += `${emoji} — ${formatDate(highlight.createdAt)}\n\n`;
      markdown += `<!-- loc:${highlight.chapterId}:${highlight.cfi} -->\n\n`;
      markdown += `---\n\n`;
    }
  }

  return markdown.trim() + '\n';
}

export { COLOR_EMOJI_MAP };
