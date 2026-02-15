import { useEffect } from 'react';

interface ShortcutHandlers {
  onOpenFile?: () => void;
  onSaveNotes?: () => void;
  onToggleAI?: () => void;
  onToggleNotebook?: () => void;
  onEscape?: () => void;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  onOpenSettings?: () => void;
}

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMod = event.metaKey || event.ctrlKey;

      if (event.key === 'Escape') {
        handlers.onEscape?.();
        return;
      }

      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.contentEditable === 'true'
      ) {
        if (isMod && event.key === 's') {
          event.preventDefault();
          handlers.onSaveNotes?.();
        }
        return;
      }

      if (isMod) {
        switch (event.key.toLowerCase()) {
          case 'o':
            event.preventDefault();
            handlers.onOpenFile?.();
            break;
          case 's':
            event.preventDefault();
            handlers.onSaveNotes?.();
            break;
          case '/':
            event.preventDefault();
            handlers.onToggleAI?.();
            break;
          case 'b':
            event.preventDefault();
            handlers.onToggleNotebook?.();
            break;
          case ',':
            event.preventDefault();
            handlers.onOpenSettings?.();
            break;
        }
      }

      if (!isMod) {
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
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
}
