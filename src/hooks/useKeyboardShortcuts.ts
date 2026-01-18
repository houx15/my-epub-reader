import { useEffect } from 'react';

interface ShortcutHandlers {
  onOpenFile?: () => void;
  onSaveNotes?: () => void;
  onExportNotes?: () => void;
  onToggleLLMPanel?: () => void;
  onNextChapter?: () => void;
  onPrevChapter?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onQuoteToNotes?: () => void;
  onDiscussWithAI?: () => void;
  onToggleTOC?: () => void;
  onOpenSettings?: () => void;
}

/**
 * React hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Detect modifier key (Cmd on Mac, Ctrl on Windows/Linux)
      const isMod = event.metaKey || event.ctrlKey;
      const isShift = event.shiftKey;

      // Ignore shortcuts when typing in input fields
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        // Only allow certain shortcuts in input fields
        if (isMod && event.key === 's') {
          event.preventDefault();
          handlers.onSaveNotes?.();
        }
        return;
      }

      // Handle shortcuts
      if (isMod && !isShift) {
        switch (event.key.toLowerCase()) {
          case 'o':
            event.preventDefault();
            handlers.onOpenFile?.();
            break;
          case 's':
            event.preventDefault();
            handlers.onSaveNotes?.();
            break;
          case 'e':
            event.preventDefault();
            handlers.onExportNotes?.();
            break;
          case '/':
            event.preventDefault();
            handlers.onToggleLLMPanel?.();
            break;
          case ',':
            event.preventDefault();
            handlers.onOpenSettings?.();
            break;
          case 'arrowright':
            event.preventDefault();
            handlers.onNextChapter?.();
            break;
          case 'arrowleft':
            event.preventDefault();
            handlers.onPrevChapter?.();
            break;
          case 't':
            event.preventDefault();
            handlers.onToggleTOC?.();
            break;
        }
      }

      // Cmd/Ctrl + Shift shortcuts
      if (isMod && isShift) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            handlers.onQuoteToNotes?.();
            break;
          case 'l':
            event.preventDefault();
            handlers.onDiscussWithAI?.();
            break;
        }
      }

      // Arrow keys without modifiers (page navigation)
      if (!isMod && !isShift) {
        switch (event.key) {
          case 'ArrowRight':
            event.preventDefault();
            handlers.onNextPage?.();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            handlers.onPrevPage?.();
            break;
        }
      }

      // Help shortcut
      if (isMod && event.key === '?') {
        event.preventDefault();
        // TODO: Show keyboard shortcuts cheatsheet
        console.log('Keyboard shortcuts cheatsheet coming soon!');
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
}
