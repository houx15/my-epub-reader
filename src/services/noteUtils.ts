import type { Selection } from '../types';

/**
 * Format a selection as a Markdown quote with location anchor
 */
export function formatSelectionAsQuote(selection: Selection): string {
  const { text, chapterId, cfi, chapterTitle } = selection;

  // Split text into lines and format as blockquote
  const lines = text.split('\n');
  const quotedText = lines.map((line) => `> ${line}`).join('\n');

  // Add location anchor as HTML comment
  const anchor = `<!-- loc:${chapterId}:${cfi} -->`;

  // Optional: Add chapter reference
  const chapterRef = `*来自: ${chapterTitle}*\n\n`;

  return `${chapterRef}${quotedText}\n${anchor}\n\n[在此添加你的笔记]\n\n---\n`;
}

/**
 * Parse location anchor from Markdown note
 */
export function parseLocationAnchor(
  noteText: string
): { chapterId: string; cfi: string } | null {
  const anchorRegex = /<!-- loc:([^:]+):([^>]+) -->/;
  const match = noteText.match(anchorRegex);

  if (!match) {
    return null;
  }

  return {
    chapterId: match[1],
    cfi: match[2],
  };
}

/**
 * Extract all location anchors from notes
 */
export function extractAllLocationAnchors(noteContent: string): Array<{
  chapterId: string;
  cfi: string;
  position: number;
}> {
  const anchorRegex = /<!-- loc:([^:]+):([^>]+) -->/g;
  const anchors: Array<{ chapterId: string; cfi: string; position: number }> = [];

  let match;
  while ((match = anchorRegex.exec(noteContent)) !== null) {
    anchors.push({
      chapterId: match[1],
      cfi: match[2],
      position: match.index,
    });
  }

  return anchors;
}

/**
 * Insert summary at a specific position in notes
 */
export function insertSummaryAfterSelection(
  noteContent: string,
  selectionText: string,
  summary: string
): string {
  // Find the position of the selection quote
  const selectionLines = selectionText.split('\n');
  const quotedSelection = selectionLines.map((line) => `> ${line}`).join('\n');

  const position = noteContent.indexOf(quotedSelection);
  if (position === -1) {
    // If not found, append to end
    return `${noteContent}\n\n## LLM对话总结\n\n${summary}\n\n---\n`;
  }

  // Find the next --- separator after the selection
  const nextSeparator = noteContent.indexOf('---', position);
  if (nextSeparator === -1) {
    // No separator found, append at the end
    return `${noteContent}\n\n### 讨论总结\n\n${summary}\n\n---\n`;
  }

  // Insert before the separator
  const before = noteContent.substring(0, nextSeparator);
  const after = noteContent.substring(nextSeparator);

  return `${before}\n### 讨论总结\n\n${summary}\n\n${after}`;
}

/**
 * Generate note file header
 */
export function generateNoteHeader(bookTitle: string, author?: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  let header = `# 《${bookTitle}》阅读笔记\n\n`;

  if (author) {
    header += `**作者**: ${author}\n`;
  }

  header += `**创建时间**: ${dateStr}\n`;
  header += `**最后修改**: ${dateStr}\n\n`;
  header += `---\n\n`;

  return header;
}

/**
 * Update last modified date in note header
 */
export function updateLastModifiedDate(noteContent: string): string {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  const lastModifiedRegex = /\*\*最后修改\*\*:\s*\d{4}-\d{2}-\d{2}/;
  return noteContent.replace(lastModifiedRegex, `**最后修改**: ${dateStr}`);
}

/**
 * Extract chapter sections from notes
 */
export function extractChapterSections(noteContent: string): Array<{
  title: string;
  content: string;
  startPosition: number;
}> {
  const chapterRegex = /^##\s+(.+)$/gm;
  const sections: Array<{ title: string; content: string; startPosition: number }> = [];

  let match;
  const matches: Array<{ title: string; position: number }> = [];

  while ((match = chapterRegex.exec(noteContent)) !== null) {
    matches.push({
      title: match[1],
      position: match.index,
    });
  }

  // Extract content between chapter headings
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];

    const startPos = current.position;
    const endPos = next ? next.position : noteContent.length;

    sections.push({
      title: current.title,
      content: noteContent.substring(startPos, endPos).trim(),
      startPosition: startPos,
    });
  }

  return sections;
}

/**
 * Count words in note content (excluding anchors and Markdown formatting)
 */
export function countWords(noteContent: string): number {
  // Remove HTML comments
  let text = noteContent.replace(/<!--[\s\S]*?-->/g, '');

  // Remove Markdown formatting
  text = text.replace(/[#*`_\[\]()]/g, '');

  // Remove blockquote markers
  text = text.replace(/^>\s*/gm, '');

  // Split by whitespace and count
  const words = text.trim().split(/\s+/);
  return words.filter((word) => word.length > 0).length;
}

/**
 * Sanitize text for use in Markdown
 */
export function sanitizeForMarkdown(text: string): string {
  // Escape special Markdown characters
  return text.replace(/([\\`*_{}[\]()#+\-.!])/g, '\\$1');
}

/**
 * Create a clickable chapter link for notes
 */
export function createChapterLink(chapterTitle: string, chapterId: string): string {
  return `[📍 ${chapterTitle}](#${chapterId})`;
}

/**
 * Strip location anchors from markdown for clean export
 */
export function stripMarkdownForExport(content: string): string {
  return content.replace(/<!-- loc:[^>]+ -->\n*/g, '');
}
