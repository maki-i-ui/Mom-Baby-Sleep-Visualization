// barRenderer.js
import { chartTypography, chartFontFamily } from './chartTypography.js';
import { formatBarTickLabel } from './barScale.js';
import { BAR_HEIGHT, computeBarRowLayout } from './barChartMetrics.js';
import {
  buildSvgDocument,
  escapeXml,
  rgbaFromTuple,
  rgbFromObject,
  toCssColor,
} from './svgUtils.js';

function mutedAxisStroke(config) {
  const color = config?.TEXT_COLOR;
  if (!color?.levels) return 'rgba(197, 192, 236, 0.4)';
  const [r, g, b] = color.levels;
  return `rgba(${r}, ${g}, ${b}, 0.4)`;
}

export function barRenderer({
  width,
  height,
  dates,
  data,
  person,
  theme,
  barHeight = BAR_HEIGHT,
  maxHours = 12,
  axisTicks = [0, 7, 12],
  fixedDayCount = 30,
  align = 'left',
  config,
  fontScale = 1,
}) {
  const { rowCenterY, axisHeight } = computeBarRowLayout({
    height,
    fixedDayCount,
    barHeight,
  });
  const maxMs = maxHours * 60 * 60 * 1000;
  const scaleX = width / maxMs;
  const outlineStroke = mutedAxisStroke(config);
  const parts = [];

  if (theme?.bgColor && theme.bgColor !== 'transparent') {
    parts.push(`<rect width="100%" height="100%" fill="${escapeXml(theme.bgColor)}"/>`);
  }

  for (let i = 0; i < fixedDayCount; i++) {
    const y = rowCenterY(i) - barHeight / 2;
    const date = dates[i];
    const emptyColor = theme?.emptyBar ?? [255, 255, 255, 30];

    if (!date) {
      parts.push(
        `<rect x="0" y="${y}" width="${width}" height="${barHeight}" fill="${rgbaFromTuple(emptyColor)}"/>`
      );
      continue;
    }

    const dayData = data[date]?.[person] ?? null;
    const stats = dayData?.stats;
    const totalSleepMs = stats?.totalSleepMs ?? 0;
    const maxSleepMs = stats?.maxSleepMs ?? 0;
    const color = stats?.sleepColor;

    const totalW = totalSleepMs * scaleX;
    const maxW = maxSleepMs * scaleX;
    const xTotal = align === 'right' ? width - totalW : 0;
    const xMax = align === 'right' ? width - maxW : 0;

    if (color) {
      if (totalW > 0) {
        parts.push(
          `<rect x="${xTotal}" y="${y}" width="${totalW}" height="${barHeight}" fill="none" stroke="${outlineStroke}" stroke-width="1"/>`
        );
      }
      if (maxW > 0) {
        parts.push(
          `<rect x="${xMax}" y="${y}" width="${maxW}" height="${barHeight}" fill="${rgbFromObject(color)}"/>`
        );
      }
    } else {
      parts.push(
        `<rect x="0" y="${y}" width="${width}" height="${barHeight}" fill="${rgbaFromTuple(emptyColor)}"/>`
      );
    }
  }

  parts.push(drawBarAxis(width, height, axisHeight, align, config, fontScale, maxHours, axisTicks));

  return buildSvgDocument({ width, height, content: parts.join('') });
}

function hourToX(hour, width, maxHours, align) {
  const ratio = hour / maxHours;
  return align === 'right' ? width * (1 - ratio) : width * ratio;
}

function drawBarAxis(width, height, axisHeight, align, config, fontScale, maxHours, axisTicks) {
  const axisY = height - axisHeight;
  const labelY = height - axisHeight / 2 + 2;
  const stroke = toCssColor(config?.TEXT_COLOR);
  const fontSize = chartTypography.barAxis * fontScale;

  const tickMarks = axisTicks.map((hour) => {
    const x = hourToX(hour, width, maxHours, align);
    return `<line x1="${x.toFixed(2)}" y1="${axisY}" x2="${x.toFixed(2)}" y2="${axisY + 4}" stroke="${stroke}" stroke-width="0.5"/>`;
  }).join('');

  const labels = axisTicks.map((hour) => {
    const x = hourToX(hour, width, maxHours, align);
    const isMin = hour === axisTicks[0];
    const isMax = hour === axisTicks[axisTicks.length - 1];
    let anchor = 'middle';

    if (align === 'right') {
      if (isMin) anchor = 'end';
      if (isMax) anchor = 'start';
    } else {
      if (isMin) anchor = 'start';
      if (isMax) anchor = 'end';
    }

    const textX =
      align === 'right'
        ? isMin
          ? width - 2
          : isMax
            ? 2
            : x
        : isMin
          ? 2
          : isMax
            ? width - 2
            : x;

    return `<text x="${textX.toFixed(2)}" y="${labelY}" fill="${stroke}" font-size="${fontSize}" font-family="${chartFontFamily}" text-anchor="${anchor}" dominant-baseline="middle">${formatBarTickLabel(hour)}</text>`;
  }).join('');

  return [
    `<line x1="0" y1="${axisY}" x2="${width}" y2="${axisY}" stroke="${stroke}" stroke-width="0.5"/>`,
    tickMarks,
    labels,
  ].join('');
}
