export const MIN_BAR_MAX_HOURS = 7;
export const BAR_AXIS_MIDDLE_HOURS = 7;

export function computePeriodMaxTotalSleepMs(dates, data, person) {
  let maxMs = 0;

  for (const date of dates) {
    if (!date) continue;
    const totalMs = data[date]?.[person]?.stats?.totalSleepMs ?? 0;
    maxMs = Math.max(maxMs, totalMs);
  }

  return maxMs;
}

export function computeBarMaxHours(maxTotalMs, minHours = MIN_BAR_MAX_HOURS) {
  if (maxTotalMs <= 0) return minHours;

  const hours = maxTotalMs / (1000 * 60 * 60);
  const padded = hours * 1.02;
  const rounded = Math.ceil(padded * 2) / 2;

  return Math.max(minHours, rounded);
}

export function formatBarTickLabel(hours) {
  const rounded = Math.round(hours * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function buildBarAxisTicks(maxHours) {
  if (maxHours <= BAR_AXIS_MIDDLE_HOURS) {
    return [0, maxHours];
  }

  return [0, BAR_AXIS_MIDDLE_HOURS, maxHours];
}

export function computeGlobalMaxTotalSleepMs(data) {
  let maxMs = 0;

  for (const date of Object.keys(data)) {
    for (const person of ['person1', 'person2']) {
      const totalMs = data[date]?.[person]?.stats?.totalSleepMs ?? 0;
      maxMs = Math.max(maxMs, totalMs);
    }
  }

  return maxMs;
}

export function buildGlobalBarChartScale(data) {
  const maxTotalMs = computeGlobalMaxTotalSleepMs(data);
  const maxHours = computeBarMaxHours(maxTotalMs);

  return {
    maxHours,
    axisTicks: buildBarAxisTicks(maxHours),
  };
}

export function getWidestTickLabel(axisTicks) {
  return axisTicks
    .map(formatBarTickLabel)
    .reduce((widest, label) => (label.length > widest.length ? label : widest), '0');
}
