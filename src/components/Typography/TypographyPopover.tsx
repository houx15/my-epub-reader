import React, { useEffect, useRef, useCallback } from 'react';
import type { TypographySettings } from '../../types';
import { getEPUBService } from '../../services/epub';
import './TypographyPopover.css';

interface TypographyPopoverProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  settings: TypographySettings;
  onSettingsChange: (updates: Partial<TypographySettings>) => void;
}

const FONT_FAMILIES = [
  { value: 'Georgia', label: 'Georgia', category: 'serif' },
  { value: "'Palatino Linotype', 'Book Antiqua', Palatino", label: 'Palatino', category: 'serif' },
  { value: "'Times New Roman', Times", label: 'Times New Roman', category: 'serif' },
  { value: "'Merriweather', 'Georgia'", label: 'Merriweather', category: 'serif' },
  { value: "'Libre Baskerville', Georgia", label: 'Libre Baskerville', category: 'serif' },
  { value: "system-ui, -apple-system, 'Segoe UI', sans-serif", label: 'System UI', category: 'sans' },
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: 'Helvetica', category: 'sans' },
  { value: "'Inter', system-ui, sans-serif", label: 'Inter', category: 'sans' },
  { value: "'Courier New', Courier, monospace", label: 'Courier', category: 'mono' },
];

const CJK_FONT_FAMILIES = [
  { value: '"Noto Serif CJK SC", "Source Han Serif SC", "SimSun", serif', label: 'Noto Serif CJK (Song)' },
  { value: '"Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif', label: 'Noto Sans CJK (Hei)' },
  { value: '"LXGW WenKai", "Kaiti", "STKaiti", serif', label: 'LXGW WenKai (Kai)' },
  { value: '"ZCOOL XiaoWei", serif', label: 'ZCOOL XiaoWei' },
];

const BACKGROUND_PRESETS = [
  { value: '#ffffff', label: 'White', textColor: '#333' },
  { value: '#fefcf5', label: 'Cream', textColor: '#333' },
  { value: '#f5e6c8', label: 'Sepia', textColor: '#3d3220' },
  { value: '#e8e4d9', label: 'Parchment', textColor: '#333' },
  { value: '#f0f4f0', label: 'Mint', textColor: '#333' },
  { value: '#e8e8e8', label: 'Light Gray', textColor: '#333' },
  { value: '#2d2d2d', label: 'Dark Gray', textColor: '#e0e0e0' },
  { value: '#1e1e1e', label: 'Black', textColor: '#e0e0e0' },
];

const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 28;
const LINE_HEIGHT_MIN = 1.4;
const LINE_HEIGHT_MAX = 2.2;
const PARAGRAPH_SPACING_MIN = 0.5;
const PARAGRAPH_SPACING_MAX = 2.0;
const CJK_SPACING_MIN = 0;
const CJK_SPACING_MAX = 0.3;

export const TypographyPopover: React.FC<TypographyPopoverProps> = ({
  isOpen,
  anchorRef,
  onClose,
  settings,
  onSettingsChange,
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  const handleClickOutside = useCallback((event: MouseEvent) => {
    const target = event.target as Node;
    if (
      popoverRef.current &&
      !popoverRef.current.contains(target) &&
      anchorRef.current &&
      !anchorRef.current.contains(target)
    ) {
      onClose();
    }
  }, [onClose, anchorRef]);

  useEffect(() => {
    if (!isOpen) return;

    const attachedIframeDocs = new WeakSet<Document>();
    const iframeListeners: Array<{ doc: Document; handler: (event: MouseEvent) => void }> = [];

    const attachIframeClickOutside = () => {
      const rendition = getEPUBService().getRendition();
      if (!rendition) return;

      const contents = rendition.getContents();
      const contentsArray = Array.isArray(contents) ? contents : contents ? [contents] : [];

      contentsArray.forEach((content: any) => {
        const doc = content?.document as Document | undefined;
        if (!doc || attachedIframeDocs.has(doc)) return;

        const handler = () => {
          onClose();
        };

        doc.addEventListener('mousedown', handler);
        attachedIframeDocs.add(doc);
        iframeListeners.push({ doc, handler });
      });
    };

    attachIframeClickOutside();

    const rendition = getEPUBService().getRendition();
    const renderedHandler = () => attachIframeClickOutside();
    if (rendition && (rendition as any).on) {
      (rendition as any).on('rendered', renderedHandler);
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      iframeListeners.forEach(({ doc, handler }) => {
        doc.removeEventListener('mousedown', handler);
      });
      if (rendition && (rendition as any).off) {
        (rendition as any).off('rendered', renderedHandler);
      }
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleKeyDown, handleClickOutside, onClose]);

  if (!isOpen) {
    return null;
  }

  // Helper to safely update settings
  const update = (updates: Partial<TypographySettings>) => {
    onSettingsChange(updates);
  };

  // Font size handlers
  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    update({ fontSize: Number(e.target.value) });
  };
  const decreaseFontSize = () => {
    update({ fontSize: Math.max(FONT_SIZE_MIN, settings.fontSize - 1) });
  };
  const increaseFontSize = () => {
    update({ fontSize: Math.min(FONT_SIZE_MAX, settings.fontSize + 1) });
  };

  // Line height handlers
  const handleLineHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    update({ lineHeight: Number(e.target.value) });
  };
  const decreaseLineHeight = () => {
    update({ lineHeight: Math.max(LINE_HEIGHT_MIN, Number((settings.lineHeight - 0.1).toFixed(1))) });
  };
  const increaseLineHeight = () => {
    update({ lineHeight: Math.min(LINE_HEIGHT_MAX, Number((settings.lineHeight + 0.1).toFixed(1))) });
  };

  // Paragraph spacing handlers
  const handleParagraphSpacingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    update({ paragraphSpacing: Number(e.target.value) });
  };
  const decreaseParagraphSpacing = () => {
    const newValue = Math.max(PARAGRAPH_SPACING_MIN, Number((settings.paragraphSpacing - 0.1).toFixed(1)));
    update({ paragraphSpacing: newValue });
  };
  const increaseParagraphSpacing = () => {
    const newValue = Math.min(PARAGRAPH_SPACING_MAX, Number((settings.paragraphSpacing + 0.1).toFixed(1)));
    update({ paragraphSpacing: newValue });
  };

  // CJK spacing handlers
  const handleCJKSpacingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    update({ cjkLetterSpacing: Number(e.target.value) });
  };
  const decreaseCJKSpacing = () => {
    const current = settings.cjkLetterSpacing ?? 0.05;
    update({ cjkLetterSpacing: Math.max(CJK_SPACING_MIN, Number((current - 0.02).toFixed(2))) });
  };
  const increaseCJKSpacing = () => {
    const current = settings.cjkLetterSpacing ?? 0.05;
    update({ cjkLetterSpacing: Math.min(CJK_SPACING_MAX, Number((current + 0.02).toFixed(2))) });
  };

  return (
    <div ref={popoverRef} className="typography-popover">
      <div className="typography-header">
        <span>Typography</span>
        <button className="typography-close" onClick={onClose}>×</button>
      </div>

      {/* Latin Font Family */}
      <div className="typography-section">
        <label className="typography-label">Latin Font</label>
        <select
          className="typography-select"
          value={settings.fontFamily}
          onChange={(e) => update({ fontFamily: e.target.value })}
        >
          <optgroup label="Serif">
            {FONT_FAMILIES.filter(f => f.category === 'serif').map((font) => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </optgroup>
          <optgroup label="Sans-serif">
            {FONT_FAMILIES.filter(f => f.category === 'sans').map((font) => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </optgroup>
          <optgroup label="Monospace">
            {FONT_FAMILIES.filter(f => f.category === 'mono').map((font) => (
              <option key={font.value} value={font.value}>{font.label}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* CJK Font Family */}
      <div className="typography-section">
        <label className="typography-label">CJK Font</label>
        <select
          className="typography-select"
          value={settings.cjkFontFamily}
          onChange={(e) => update({ cjkFontFamily: e.target.value })}
        >
          {CJK_FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>{font.label}</option>
          ))}
        </select>
      </div>

      {/* Font Size */}
      <div className="typography-section">
        <label className="typography-label">Font Size</label>
        <div className="typography-slider-row">
          <button className="typo-button" onClick={decreaseFontSize}>
            <span className="typo-icon-small">A</span>
          </button>
          <input
            type="range"
            className="typo-range"
            min={FONT_SIZE_MIN}
            max={FONT_SIZE_MAX}
            step={1}
            value={settings.fontSize}
            onChange={handleFontSizeChange}
          />
          <button className="typo-button" onClick={increaseFontSize}>
            <span className="typo-icon-large">A</span>
          </button>
        </div>
        <div className="typo-value">{settings.fontSize}px</div>
      </div>

      {/* Line Height */}
      <div className="typography-section">
        <label className="typography-label">Line Height</label>
        <div className="typography-slider-row">
          <button className="typo-button" onClick={decreaseLineHeight}>
            <span className="typo-icon-compact">≡</span>
          </button>
          <input
            type="range"
            className="typo-range"
            min={LINE_HEIGHT_MIN}
            max={LINE_HEIGHT_MAX}
            step={0.1}
            value={settings.lineHeight}
            onChange={handleLineHeightChange}
          />
          <button className="typo-button" onClick={increaseLineHeight}>
            <span className="typo-icon-loose">≡</span>
          </button>
        </div>
        <div className="typo-value">{settings.lineHeight.toFixed(1)}</div>
      </div>

      {/* Paragraph Spacing */}
      <div className="typography-section">
        <label className="typography-label">Paragraph Spacing</label>
        <div className="typography-slider-row">
          <button className="typo-button" onClick={decreaseParagraphSpacing}>
            <span className="typo-icon-para-tight">¶</span>
          </button>
          <input
            type="range"
            className="typo-range"
            min={PARAGRAPH_SPACING_MIN}
            max={PARAGRAPH_SPACING_MAX}
            step={0.1}
            value={settings.paragraphSpacing}
            onChange={handleParagraphSpacingChange}
          />
          <button className="typo-button" onClick={increaseParagraphSpacing}>
            <span className="typo-icon-para-loose">¶</span>
          </button>
        </div>
        <div className="typo-value">{settings.paragraphSpacing.toFixed(1)}em</div>
      </div>

      {/* CJK Letter Spacing */}
      <div className="typography-section">
        <label className="typography-label">CJK Spacing</label>
        <div className="typography-slider-row">
          <button className="typo-button" onClick={decreaseCJKSpacing}>
            <span>字</span>
          </button>
          <input
            type="range"
            className="typo-range"
            min={CJK_SPACING_MIN}
            max={CJK_SPACING_MAX}
            step={0.01}
            value={settings.cjkLetterSpacing ?? 0.05}
            onChange={handleCJKSpacingChange}
          />
          <button className="typo-button" onClick={increaseCJKSpacing}>
            <span className="typo-wide">字</span>
          </button>
        </div>
        <div className="typo-value">{(settings.cjkLetterSpacing ?? 0.05).toFixed(2)}em</div>
      </div>

      {/* Text Alignment */}
      <div className="typography-section">
        <label className="typography-label">Text Alignment</label>
        <div className="typo-alignment-options">
          <button
            className={`typo-align-btn ${settings.textAlign === 'left' ? 'active' : ''}`}
            onClick={() => update({ textAlign: 'left' })}
            title="Left aligned"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <line x1="3" y1="6" x2="18" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="16" x2="16" y2="16" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="21" x2="20" y2="21" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          <button
            className={`typo-align-btn ${settings.textAlign === 'justify' ? 'active' : ''}`}
            onClick={() => update({ textAlign: 'justify' })}
            title="Justified"
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="11" x2="21" y2="11" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="2"/>
              <line x1="3" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* CJK Auto-space Toggle */}
      <div className="typography-section">
        <label className="typography-label typo-checkbox-label">
          <input
            type="checkbox"
            checked={settings.cjkAutoSpace}
            onChange={(e) => update({ cjkAutoSpace: e.target.checked })}
          />
          <span>Auto-space between CJK and Latin</span>
        </label>
      </div>

      {/* Background Color */}
      <div className="typography-section">
        <label className="typography-label">Background</label>
        <div className="bg-swatches">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.value}
              className={`bg-swatch ${settings.backgroundColor === preset.value ? 'selected' : ''}`}
              style={{ backgroundColor: preset.value }}
              onClick={() => update({ backgroundColor: preset.value })}
              title={preset.label}
            >
              {settings.backgroundColor === preset.value && (
                <span className="bg-swatch-check" style={{ color: preset.textColor }}>✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
