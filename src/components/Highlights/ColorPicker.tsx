import type { HighlightColor } from '../../types';
import './ColorPicker.css';

interface ColorPickerProps {
  selectedColor?: HighlightColor;
  onColorSelect: (color: HighlightColor) => void;
  size?: 'small' | 'medium';
}

const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'orange'];
const PEN_COLORS: HighlightColor[] = ['pencil', 'red-pen', 'blue-pen'];

const COLOR_HEX: Record<HighlightColor, string> = {
  yellow: '#ffeb3b',
  green: '#4caf50',
  blue: '#2196f3',
  pink: '#e91e63',
  orange: '#ff9800',
  'pencil': '#666666',
  'red-pen': '#dc3545',
  'blue-pen': '#0d6efd',
};

const COLOR_LABEL: Record<HighlightColor, string> = {
  yellow: 'Yellow',
  green: 'Green',
  blue: 'Blue',
  pink: 'Pink',
  orange: 'Orange',
  'pencil': 'Pencil',
  'red-pen': 'Red Pen',
  'blue-pen': 'Blue Pen',
};

export function ColorPicker({ selectedColor, onColorSelect, size = 'medium' }: ColorPickerProps) {
  return (
    <div className={`color-picker color-picker--${size}`}>
      {/* Regular highlight colors */}
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          className={`color-picker-dot ${selectedColor === color ? 'color-picker-dot--selected' : ''}`}
          style={{ backgroundColor: COLOR_HEX[color] }}
          onClick={() => onColorSelect(color)}
          title={COLOR_LABEL[color]}
          aria-label={`Select ${COLOR_LABEL[color]} highlight`}
        />
      ))}
      
      {/* Separator */}
      <div className="color-picker-separator" />
      
      {/* Pen colors (underline styles) */}
      {PEN_COLORS.map((color) => (
        <button
          key={color}
          className={`color-picker-dot color-picker-dot--pen ${selectedColor === color ? 'color-picker-dot--selected' : ''}`}
          onClick={() => onColorSelect(color)}
          title={COLOR_LABEL[color]}
          aria-label={`Select ${COLOR_LABEL[color]}`}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke={COLOR_HEX[color]} strokeWidth="2.5">
            <line x1="4" y1="20" x2="20" y2="20" strokeLinecap="round" />
          </svg>
        </button>
      ))}
    </div>
  );
}
