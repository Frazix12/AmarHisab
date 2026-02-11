const RGB_COLOR_REGEX =
  /^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\)$/i;
const HEX_COLOR_REGEX = /^[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/;

export const withAlpha = (color: string, alpha: number): string => {
  const normalizedAlpha = Math.max(0, Math.min(1, alpha));
  const trimmedColor = color.trim();

  if (trimmedColor.startsWith("#")) {
    const hex = trimmedColor.slice(1);
    if (!HEX_COLOR_REGEX.test(hex)) {
      return `rgba(0, 0, 0, ${normalizedAlpha})`;
    }

    const r = Number.parseInt(hex.slice(0, 2), 16);
    const g = Number.parseInt(hex.slice(2, 4), 16);
    const b = Number.parseInt(hex.slice(4, 6), 16);

    if (hex.length === 8) {
      const existingAlpha = Number.parseInt(hex.slice(6, 8), 16) / 255;
      return `rgba(${r}, ${g}, ${b}, ${existingAlpha * normalizedAlpha})`;
    }

    return `rgba(${r}, ${g}, ${b}, ${normalizedAlpha})`;
  }

  const rgbMatch = trimmedColor.match(RGB_COLOR_REGEX);
  if (rgbMatch) {
    const [, r, g, b, a] = rgbMatch;
    const existingAlpha = a ? Number.parseFloat(a) : 1;
    return `rgba(${r}, ${g}, ${b}, ${existingAlpha * normalizedAlpha})`;
  }

  return color;
};
