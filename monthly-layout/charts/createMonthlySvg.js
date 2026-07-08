// createMonthlySvg.js
import { toSvgDataUrl } from './svgUtils.js';

export function createMonthlySvg({
  renderer,
  dates,
  data,
  person,
  width,
  height,
  displayWidth,
  displayHeight,
  theme,
  config,
  ...rendererOptions
}) {
  const svg = renderer({
    width,
    height,
    dates,
    data,
    person,
    theme,
    config,
    ...rendererOptions,
  });

  return {
    src: toSvgDataUrl(svg),
    width: displayWidth ?? width,
    height: displayHeight ?? height,
  };
}
