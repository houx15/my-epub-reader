import type { HighlightColor } from '../../types';
import './ColorPicker.css';

interface ColorPickerProps {
  selectedColor?: HighlightColor;
  onColorSelect: (color: HighlightColor) => void;
  size?: 'small' | 'medium';
}

const HIGHLIGHT_COLORS: HighlightColor[] = ['yellow', 'green', 'blue', 'pink', 'orange'];

const COLOR_HEX: Record<HighlightColor, string> = {
  yellow: '#ffeb3b',
  green: '#4caf50',
  blue: '#2196f3',
  pink: '#e91e63',
  orange: '#ff9800',
};

export function ColorPicker({ selectedColor, onColorSelect, size = 'medium' }: ColorPickerProps) {
  return (
    <div className={`color-picker color-picker--${size}`}>
      {HIGHLIGHT_COLORS.map((color) => (
        <button
          key={color}
          className={`color-picker-dot ${selectedColor === color ? 'color-picker-dot--selected' : ''}`}
          style={{ backgroundColor: COLOR_HEX[color] }}
          onClick={() => onColorSelect(color)}
          title={color.charAt(0).toUpperCase() + color.slice(1)}
          aria-label={`Select ${color} highlight color`}
        />
      ))}
    </div>
  );
}
