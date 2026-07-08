// sleepColor.js
export function getSleepColor(p, t, theme, alpha = 255) {
    const { min, max } = theme.sleepGradient;
    const base = p.lerpColor(
      p.color(...min),
      p.color(...max),
      t
    );
    return p.color(
      p.red(base),
      p.green(base),
      p.blue(base),
      alpha
    );
  }
  