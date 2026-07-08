// spiralRenderer.js
import { renderMonthlyByDate } from './renderMonthlyByDate.js';
import { chartTypography, chartFontFamily } from './chartTypography.js';
import {
  buildSvgDocument,
  escapeXml,
  lerpRgba,
  rgbaFromTuple,
  rgbFromObject,
  toCssColor,
} from './svgUtils.js';

const TIME_LABELS = [
  { text: '0:00', hour: 0 },
  { text: '6:00', hour: 6 },
  { text: '12:00', hour: 12 },
  { text: '18:00', hour: 18 },
];

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

export function spiralRenderer({
  width,
  height,
  dates,
  data,
  person,
  theme,
  config,
  periodStats,
  fontScale = 1,
}) {
  const centerX = width / 2;
  const centerY = height / 2;
  const parts = [];

  if (theme?.bgColor && theme.bgColor !== 'transparent') {
    parts.push(`<rect width="100%" height="100%" fill="${escapeXml(theme.bgColor)}"/>`);
  }

  dates.forEach((_, index) => {
    parts.push(drawGuideRing(centerX, centerY, index, config, theme));
  });

  renderMonthlyByDate({
    dates,
    data,
    person,
    drawDay: ({ date, index, dayData }) => {
      parts.push(
        drawSpiralDay({
          date,
          index,
          cycles: dayData?.cycles ?? [],
          stats: dayData?.stats ?? null,
          theme,
          config,
          centerX,
          centerY,
        })
      );
    },
  });

  parts.push(drawTimeLabels(centerX, centerY, dates, config, fontScale));
  parts.push(drawCenterStats(centerX, centerY, periodStats, config, fontScale));

  return buildSvgDocument({ width, height, content: parts.join('') });
}

function drawGuideRing(centerX, centerY, index, config, theme) {
  const rStart = config.BASE_RADIUS + index * config.RING_SPACING;
  const rEnd = rStart + config.RING_SPACING;
  const rMid = (rStart + rEnd) / 2;
  const ring = theme.emptyRing ?? [255, 255, 255, 30];
  const stroke = rgbaFromTuple([ring[0], ring[1], ring[2], Math.round((ring[3] ?? 30) * 0.6)]);

  return `<circle cx="${centerX}" cy="${centerY}" r="${rMid}" fill="none" stroke="${stroke}" stroke-width="0.5"/>`;
}

function drawTimeLabels(centerX, centerY, dates, config, fontScale) {
  const lastIndex = Math.max(dates.length - 1, 0);
  const outerR =
    config.BASE_RADIUS + lastIndex * config.RING_SPACING + config.RING_SPACING;
  const labelR = outerR + chartTypography.timeLabelOffset;
  const fill = toCssColor(config.TEXT_COLOR);
  const fontSize = chartTypography.timeLabel * fontScale;

  return TIME_LABELS.map(({ text, hour }) => {
    const angle = (hour / 24) * TWO_PI - HALF_PI;
    const x = centerX + labelR * Math.cos(angle);
    const y = centerY + labelR * Math.sin(angle);

    return `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" fill="${fill}" font-size="${fontSize}" font-family="${chartFontFamily}" text-anchor="middle" dominant-baseline="middle">${escapeXml(text)}</text>`;
  }).join('');
}

function drawCenterStats(centerX, centerY, periodStats, config, fontScale) {
  const fill = toCssColor(config.TEXT_COLOR);

  if (periodStats?.showNoData) {
    const fontSize = chartTypography.centerValue * fontScale;
    return `<text x="${centerX}" y="${centerY}" fill="${fill}" font-size="${fontSize}" font-family="${chartFontFamily}" text-anchor="middle" dominant-baseline="middle">データなし</text>`;
  }

  const label = periodStats?.avgMaxSleepLabel;
  if (!label || label === '—') return '';

  const titleSize = chartTypography.centerTitle * fontScale;
  const valueSize = chartTypography.centerValue * fontScale;

  return [
    `<text x="${centerX}" y="${centerY - 10}" fill="${fill}" font-size="${titleSize}" font-family="${chartFontFamily}" text-anchor="middle" dominant-baseline="middle">最長連続睡眠時間</text>`,
    `<text x="${centerX}" y="${centerY + 10}" fill="${fill}" font-size="${valueSize}" font-family="${chartFontFamily}" text-anchor="middle" dominant-baseline="middle">${escapeXml(`平均 ${label}`)}</text>`,
  ].join('');
}

function drawSpiralDay({
  date,
  index,
  cycles,
  stats,
  theme,
  config,
  centerX,
  centerY,
}) {
  let dayStartMs = 0;
  if (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    dayStartMs = d.getTime();
  }

  const rStart = config.BASE_RADIUS + index * config.RING_SPACING;
  const rEnd = rStart + config.RING_SPACING;

  const msToAngle = (ms) =>
    ((ms - dayStartMs) / (24 * 60 * 60 * 1000)) * TWO_PI - HALF_PI;

  const msToRadius = (ms) =>
    rStart + ((ms - dayStartMs) / (24 * 60 * 60 * 1000)) * (rEnd - rStart);

  const hasData = stats && stats.maxSleepMs > 0;

  if (!date || !hasData) {
    const ring = theme.emptyRing ?? [255, 255, 255, 40];
    const stroke = rgbaFromTuple(ring);
    const points = [];

    for (let i = 0; i <= 120; i++) {
      const ms = dayStartMs + (i / 120) * 24 * 60 * 60 * 1000;
      const angle = msToAngle(ms);
      const radius = msToRadius(ms);
      points.push(`${(centerX + radius * Math.cos(angle)).toFixed(2)},${(centerY + radius * Math.sin(angle)).toFixed(2)}`);
    }

    return `<polyline points="${points.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${config.SLEEP_LINE_WEIGHT}"/>`;
  }

  const { min, max, maxHours } = theme.sleepGradient;
  const t = Math.min(stats.maxSleepMs / (1000 * 60 * 60) / maxHours, 1);
  const [r, g, b, a] = lerpRgba(min, max, t);
  const stroke = rgbFromObject({ r, g, b, a });

  return cycles
    .filter((cycle) => cycle.wakeEndMs > cycle.sleepStartMs)
    .map((cycle) => {
      const points = [];

      for (let i = 0; i <= 60; i++) {
        const ms = cycle.sleepStartMs + ((cycle.wakeEndMs - cycle.sleepStartMs) * i) / 60;
        const angle = msToAngle(ms);
        const radius = msToRadius(ms);
        points.push(`${(centerX + radius * Math.cos(angle)).toFixed(2)},${(centerY + radius * Math.sin(angle)).toFixed(2)}`);
      }

      return `<polyline points="${points.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${config.SLEEP_LINE_WEIGHT}"/>`;
    })
    .join('');
}
