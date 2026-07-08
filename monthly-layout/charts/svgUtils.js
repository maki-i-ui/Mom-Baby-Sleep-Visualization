export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toCssColor(color, fallback = '#c5c0ec') {
  if (!color) return fallback;
  if (typeof color === 'string') return color;

  const levels = color.levels;
  if (!levels) return fallback;

  const [r, g, b, a = 255] = levels;
  return a < 255 ? `rgba(${r}, ${g}, ${b}, ${a / 255})` : `rgb(${r}, ${g}, ${b})`;
}

export function rgbaFromTuple([r, g, b, a = 255]) {
  return `rgba(${r}, ${g}, ${b}, ${a / 255})`;
}

export function rgbFromObject({ r, g, b, a }, alpha = null) {
  const opacity = alpha ?? (a !== undefined ? a / 255 : 1);
  return opacity < 1 ? `rgba(${r}, ${g}, ${b}, ${opacity})` : `rgb(${r}, ${g}, ${b})`;
}

export function lerpRgb(min, max, t) {
  return min.map((value, index) => Math.round(value + (max[index] - value) * t));
}

/** RGBA タプル（長さ3の場合は alpha=255 として扱う）を補間 */
export function lerpRgba(min, max, t) {
  const minRgba = min.length >= 4 ? min : [...min, 255];
  const maxRgba = max.length >= 4 ? max : [...max, 255];
  return lerpRgb(minRgba, maxRgba, t);
}

export function buildSvgDocument({ width, height, content }) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">`,
    content,
    '</svg>',
  ].join('');
}

export function toSvgDataUrl(svg) {
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
