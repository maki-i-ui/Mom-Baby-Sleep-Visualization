import { chartTypography } from './chartTypography.js';

/** 画面上の表示倍率（SVG内部座標に対する） */
export const CHART_DISPLAY_SCALE = 1.0;

/** 旧レイアウト（スパイラル 340px 時）の棒グラフ幅比率 */
const BAR_WIDTH_RATIO = 80 / 340;

const MONTH_BODY_GAP = 16;
const BAR_CLUSTER_GAP = 8;
const BAR_CENTER_AXIS_WIDTH = 40;

/** スパイラル＋棒グラフクラスタの横並び幅（表示 px） */
export function computeChartRowWidthFromLayout({ spiralDisplay, barDisplayWidth }) {
  const barClusterWidth =
    barDisplayWidth +
    BAR_CLUSTER_GAP +
    BAR_CENTER_AXIS_WIDTH +
    BAR_CLUSTER_GAP +
    barDisplayWidth;

  return (
    spiralDisplay +
    MONTH_BODY_GAP +
    barClusterWidth +
    MONTH_BODY_GAP +
    spiralDisplay
  );
}

export function computeSpiralIntrinsicSize({ config, dayCount, typography = chartTypography }) {
  const lastIndex = Math.max(dayCount - 1, 0);
  const outerR =
    config.BASE_RADIUS + lastIndex * config.RING_SPACING + config.RING_SPACING;
  const labelR = outerR + typography.timeLabelOffset;
  const longestTimeLabel = '18:00';
  const charWidth = typography.timeLabel * 0.62;
  const textMargin = Math.ceil(longestTimeLabel.length * charWidth / 2) + 6;

  return Math.ceil((labelR + textMargin) * 2);
}

export function computeBarDisplaySize(
  spiralDisplaySize,
  widestTickLabel = '12',
  typography = chartTypography
) {
  const textMargin = Math.ceil(typography.barAxis / 2) + 4;
  const charWidth = typography.barAxis * 0.65;
  const minWidthForLabel = Math.ceil(widestTickLabel.length * charWidth) + textMargin * 2;
  const widthFromRatio = Math.round(spiralDisplaySize * BAR_WIDTH_RATIO);

  return {
    width: Math.max(widthFromRatio, minWidthForLabel),
    height: spiralDisplaySize,
  };
}

export function toDisplaySize(intrinsicSize) {
  return Math.round(intrinsicSize * CHART_DISPLAY_SCALE);
}

export function toIntrinsicSize(displaySize) {
  return Math.round(displaySize / CHART_DISPLAY_SCALE);
}

export function getFontScale() {
  return 1 / CHART_DISPLAY_SCALE;
}

export function computeBarChartLayout({ spiralDisplay, widestTickLabel }) {
  const barDisplay = computeBarDisplaySize(spiralDisplay, widestTickLabel);

  return {
    intrinsic: {
      width: toIntrinsicSize(barDisplay.width),
      height: toIntrinsicSize(barDisplay.height),
    },
    display: barDisplay,
  };
}

export function computeChartLayout({ config, dayCount }) {
  const spiralIntrinsic = computeSpiralIntrinsicSize({ config, dayCount });
  const spiralDisplay = toDisplaySize(spiralIntrinsic);
  const barDisplay = computeBarDisplaySize(spiralDisplay);
  const barIntrinsic = {
    width: toIntrinsicSize(barDisplay.width),
    height: toIntrinsicSize(barDisplay.height),
  };

  return {
    spiral: {
      intrinsic: spiralIntrinsic,
      display: spiralDisplay,
    },
    bar: {
      intrinsic: barIntrinsic,
      display: barDisplay,
    },
    fontScale: getFontScale(),
  };
}
