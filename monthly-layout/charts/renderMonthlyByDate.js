// renderMonthlyByDate.js
export function renderMonthlyByDate({
  dates,
  data,
  person,
  drawDay,
}) {
  dates.forEach((date, index) => {
    if (!date) {
      drawDay({ date: null, index, dayData: null });
      return;
    }

    const dayData = data[date]?.[person] ?? null;
    drawDay({ date, index, dayData });
  });
}
