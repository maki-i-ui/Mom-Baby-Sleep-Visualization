const PREGNANCY_KEYFRAMES = [
  { zenith: [91, 75, 138], mid: [130, 95, 125], horizon: [255, 140, 105] },
  { zenith: [61, 45, 92], mid: [95, 58, 98], horizon: [196, 91, 91] },
  { zenith: [26, 16, 64], mid: [45, 27, 78], horizon: [45, 27, 78] },
];

const POSTPARTUM_DEEP_NIGHT = {
  zenith: [10, 14, 24],
  mid: [14, 20, 36],
  horizon: [18, 24, 42],
};

const POSTPARTUM_MOONLIGHT = {
  zenith: [15, 20, 40],
  mid: [30, 38, 62],
  horizon: [42, 53, 80],
};

const POSTPARTUM_PRE_DAWN = {
  zenith: [27, 35, 64],
  mid: [50, 62, 92],
  horizon: [90, 102, 125],
};

const POSTPARTUM_DAWN = {
  zenith: [40, 50, 75],
  mid: [85, 100, 125],
  horizon: [184, 144, 122],
};

const BIRTH_TRANSITION = {
  zenith: [8, 10, 20],
  mid: [12, 16, 28],
  horizon: [15, 20, 35],
};

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function lerpChannel(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function lerpRgb(a, b, t) {
  return [
    lerpChannel(a[0], b[0], t),
    lerpChannel(a[1], b[1], t),
    lerpChannel(a[2], b[2], t),
  ];
}

function lerpSky(a, b, t) {
  const ratio = clamp01(t);
  return {
    zenith: lerpRgb(a.zenith, b.zenith, ratio),
    mid: lerpRgb(a.mid, b.mid, ratio),
    horizon: lerpRgb(a.horizon, b.horizon, ratio),
  };
}

function rgbToHex([r, g, b]) {
  return `#${[r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;
}

export function getPregnancySky(progress) {
  const t = clamp01(progress);

  if (t <= 0.5) {
    return lerpSky(PREGNANCY_KEYFRAMES[0], PREGNANCY_KEYFRAMES[1], t / 0.5);
  }

  return lerpSky(PREGNANCY_KEYFRAMES[1], PREGNANCY_KEYFRAMES[2], (t - 0.5) / 0.5);
}

export function getPostpartumSky(avgHours) {
  if (avgHours <= 0 || avgHours <= 4) {
    return { ...POSTPARTUM_DEEP_NIGHT };
  }

  if (avgHours <= 5) {
    return lerpSky(POSTPARTUM_DEEP_NIGHT, POSTPARTUM_MOONLIGHT, avgHours - 4);
  }

  if (avgHours <= 6) {
    return lerpSky(POSTPARTUM_MOONLIGHT, POSTPARTUM_PRE_DAWN, avgHours - 5);
  }

  return lerpSky(POSTPARTUM_PRE_DAWN, POSTPARTUM_DAWN, clamp01((avgHours - 6) / 4));
}

export function getBirthTransitionSky() {
  return { ...BIRTH_TRANSITION };
}

function srgbChannelToLinear(channel) {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance([r, g, b]) {
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
}

/** チャート付近に見える空の明るさ（0=深夜, 1=夜明け付近） */
export function getSkyRelativeLuminance(sky) {
  const sample = lerpRgb(sky.mid, sky.horizon, 0.85);
  return getRelativeLuminance(sample);
}

const BACKDROP_BRIGHTNESS = 0.82;
/** 産後6ヶ月以降（夜明け寄りの空）向けの下敷き明度 */
const BACKDROP_BRIGHTNESS_LATE_POSTPARTUM = 0.68;
/** 読み方ガイド（妊娠初期の明るい空向け） */
const GUIDE_BACKDROP_BRIGHTNESS = 0.68;
const GUIDE_BACKDROP_TINT = 'rgba(9, 0, 64, 0.18)';
const LATE_POSTPARTUM_MONTH_INDEX = 6;
const LUMINANCE_MIN = 0.03;
const LUMINANCE_MAX = 0.28;

/** 下敷きスタイル（明度は一定、暗い空では輪郭線のみ強調） */
export function getChartBackdropStyle(sky, { postpartumMonthIndex = null } = {}) {
  const luminance = getSkyRelativeLuminance(sky);
  const t = clamp01((luminance - LUMINANCE_MIN) / (LUMINANCE_MAX - LUMINANCE_MIN));
  const outlineAlpha = t < 0.5 ? ((0.5 - t) / 0.5) * 0.2 + 0.06 : 0;

  const isLatePostpartum =
    postpartumMonthIndex !== null && postpartumMonthIndex >= LATE_POSTPARTUM_MONTH_INDEX;
  const brightness = isLatePostpartum
    ? BACKDROP_BRIGHTNESS_LATE_POSTPARTUM
    : BACKDROP_BRIGHTNESS;

  return {
    brightness,
    outline: `rgba(197, 192, 236, ${outlineAlpha.toFixed(3)})`,
  };
}

/** 読み方セクション専用 */
export function getGuideBackdropStyle(sky) {
  const { outline } = getChartBackdropStyle(sky);

  return {
    brightness: GUIDE_BACKDROP_BRIGHTNESS,
    tint: GUIDE_BACKDROP_TINT,
    outline,
  };
}

const EMPTY_TONE_DARK_SKY = [255, 255, 255, 30];
const EMPTY_TONE_BRIGHT_SKY = [26, 16, 64, 110];

export function getAdaptiveEmptyTone(sky) {
  const luminance = getSkyRelativeLuminance(sky);
  const t = clamp01((luminance - LUMINANCE_MIN) / (LUMINANCE_MAX - LUMINANCE_MIN));

  return [
    lerpChannel(EMPTY_TONE_DARK_SKY[0], EMPTY_TONE_BRIGHT_SKY[0], t),
    lerpChannel(EMPTY_TONE_DARK_SKY[1], EMPTY_TONE_BRIGHT_SKY[1], t),
    lerpChannel(EMPTY_TONE_DARK_SKY[2], EMPTY_TONE_BRIGHT_SKY[2], t),
    lerpChannel(EMPTY_TONE_DARK_SKY[3], EMPTY_TONE_BRIGHT_SKY[3], t),
  ];
}

export function buildChartThemeForSky(baseTheme, sky) {
  const emptyTone = getAdaptiveEmptyTone(sky);

  return {
    ...baseTheme,
    emptyRing: [...emptyTone],
    emptyBar: [...emptyTone],
  };
}

export function skyToLayerGradient(sky) {
  return `linear-gradient(to bottom, ${rgbToHex(sky.zenith)} 0%, ${rgbToHex(sky.mid)} 50%, ${rgbToHex(sky.horizon)} 100%)`;
}

export function buildPageSkyGradient(skies) {
  if (!skies.length) {
    return `linear-gradient(to bottom, ${rgbToHex(PREGNANCY_KEYFRAMES[0].zenith)}, ${rgbToHex(PREGNANCY_KEYFRAMES[0].horizon)})`;
  }

  const parts = [];

  skies.forEach((sky, index) => {
    const start = (index / skies.length) * 100;
    const end = ((index + 1) / skies.length) * 100;
    const mid = (start + end) / 2;

    parts.push(`${rgbToHex(sky.zenith)} ${start.toFixed(2)}%`);
    parts.push(`${rgbToHex(sky.mid)} ${mid.toFixed(2)}%`);
    parts.push(`${rgbToHex(sky.horizon)} ${end.toFixed(2)}%`);
  });

  return `linear-gradient(to bottom, ${parts.join(', ')})`;
}
