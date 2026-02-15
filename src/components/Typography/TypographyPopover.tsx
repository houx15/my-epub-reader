import React, { useEffect, useRef, useCallback } from 'react';
import type { TypographySettings } from '../../types';
import './TypographyPopover.css';

interface TypographyPopoverProps {
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  onClose: () => void;
  settings: TypographySettings;
  onSettingsChange: (updates: Partial<TypographySettings>) => void;
}

const FONT_FAMILIES = [
  { value: 'Georgia', label: 'Georgia' },
  { value: "'Palatino Linotype', Palatino", label: 'Palatino' },
  { value: "'Merriweather', serif", label: 'Merriweather' },
  { value: "system-ui, -apple-system, sans-serif", label: 'System' },
  { value: "'Helvetica Neue', Helvetica, Arial, sans-serif", label: 'Helvetica' },
  { value: "'Courier New', monospace", label: 'Courier' },
];

const BACKGROUND_PRESETS = [
  { value: '#ffffff', label: 'White' },
  { value: '#fefcf5', label: 'Cream' },
  { value: '#f5e6c8', label: 'Sepia' },
  { value: '#e8e8e8', label: 'Light Gray' },
  { value: '#1e1e1e', label: 'Dark' },
];

const FONT_SIZE_MIN = 14;
const FONT_SIZE_MAX = 28;
const LINE_HEIGHT_MIN = 1.4;
const LINE_HEIGHT_MAX = 2.2;

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
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleKeyDown, handleClickOutside]);

  if (!isOpen) {
    return null;
  }

  const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onSettingsChange({ fontFamily: e.target.value });
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ fontSize: Number(e.target.value) });
  };

  const handleFontSizeDecrease = () => {
    const newSize = Math.max(FONT_SIZE_MIN, settings.fontSize - 1);
    onSettingsChange({ fontSize: newSize });
  };

  const handleFontSizeIncrease = () => {
    const newSize = Math.min(FONT_SIZE_MAX, settings.fontSize + 1);
    onSettingsChange({ fontSize: newSize });
  };

  const handleLineHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSettingsChange({ lineHeight: Number(e.target.value) });
  };

  const handleLineHeightDecrease = () => {
    const newHeight = Math.max(LINE_HEIGHT_MIN, Number((settings.lineHeight - 0.1).toFixed(1)));
    onSettingsChange({ lineHeight: newHeight });
  };

  const handleLineHeightIncrease = () => {
    const newHeight = Math.min(LINE_HEIGHT_MAX, Number((settings.lineHeight + 0.1).toFixed(1)));
    onSettingsChange({ lineHeight: newHeight });
  };

  const handleBackgroundChange = (color: string) => {
    onSettingsChange({ backgroundColor: color });
  };

  return (
    <div ref={popoverRef} className="typography-popover">
      <div className="typography-header">Typography</div>

      <div className="typography-section">
        <label className="typography-label">Font Family</label>
        <select
          className="typography-select"
          value={settings.fontFamily}
          onChange={handleFontFamilyChange}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.label}
            </option>
          ))}
        </select>
      </div>

      <div className="typography-section">
        <label className="typography-label">Font Size</label>
        <div className="typography-slider-row">
          <button className="typo-button" onClick={handleFontSizeDecrease}>
            A-
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
          <button className="typo-button" onClick={handleFontSizeIncrease}>
            A+
          </button>
        </div>
        <div className="typo-value">{settings.fontSize}px</div>
      </div>

      <div className="typography-section">
        <label className="typography-label">Line Height</label>
        <div className="typography-slider-row">
          <button className="typo-button" onClick={handleLineHeightDecrease}>
            ≡-
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
          <button className="typo-button" onClick={handleLineHeightIncrease}>
            ≡+
          </button>
        </div>
        <div className="typo-value">{settings.lineHeight}x</div>
      </div>

      <div className="typography-section">
        <label className="typography-label">Background</label>
        <div className="bg-swatches">
          {BACKGROUND_PRESETS.map((preset) => (
            <button
              key={preset.value}
              className={`bg-swatch ${settings.backgroundColor === preset.value ? 'selected' : ''}`}
              style={{ backgroundColor: preset.value }}
              onClick={() => handleBackgroundChange(preset.value)}
              title={preset.label}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
