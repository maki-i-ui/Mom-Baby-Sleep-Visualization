import { chartTypography } from './chartTypography.js';

export const BAR_HEIGHT = 4;
export const BAR_TOP_PADDING = 6;

export const PREGNANCY_DAY_TICKS = [1, 7, 14, 21, 28];
export const POSTPARTUM_DAY_TICKS = [1, 10, 20, 30];

export function getDayTicksForPhase(phase) {
  return phase === 'pregnancy' ? PREGNANCY_DAY_TICKS : POSTPARTUM_DAY_TICKS;
}

export function computeBarRowLayout({
  height,
  fixedDayCount,
  barHeight = BAR_HEIGHT,
  topPadding = BAR_TOP_PADDING,
  axisHeight = chartTypography.axisHeight,
}) {
  const chartHeight = height - axisHeight - topPadding;
  const totalBarHeight = barHeight * fixedDayCount;
  const gap =
    fixedDayCount > 1
      ? (chartHeight - totalBarHeight) / (fixedDayCount - 1)
      : 0;

  function rowCenterY(index) {
    return topPadding + index * (barHeight + gap) + barHeight / 2;
  }

  return { chartHeight, gap, rowCenterY, axisHeight, topPadding, barHeight };
}
