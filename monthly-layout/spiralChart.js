/**
 * spiralChart.js
 * 月単位スパイラル画像を生成して imgURL を返す
 */

async function createMonthlySpiralImage({
    dates,
    width,
    height,
    resolution,
    person,
    color
  }) {
    const g = createGraphics(width * resolution, height * resolution);
    g.pixelDensity(1);
  
    renderSpiralForMonth(
        g,
        dates,
        person,      // 'person1' | 'person2'
        color);
  
    const imgURL = g.canvas.toDataURL('image/png');
  
    g.remove?.();
    return Promise.resolve(imgURL);
  }
  
function renderSpiralForMonth(
    g,
    datesInMonth,
    personKey,      // 'person1' | 'person2'
    sleepColor
  ) {
    g.background(CANVAS_BG_COLOR);
  
    datesInMonth.forEach((dateStr, index) => {
      const dayCycles =
        cyclesToDrawPerDay[dateStr]?.[personKey] || [];
  
      const dayStats =
        sleepStatsToDrawPerDay[dateStr]?.[personKey];
  
      drawSleepWakeCyclesSpiralOnGraphics(
        g,
        dayCycles,
        dayStats,
        sleepColor,
        dateStr,
        index
      );
    });
  }
  
  /**
 * 螺旋状に睡眠サイクルを描画する関数
 */
  function drawSleepWakeCyclesSpiralOnGraphics(
    g,
    cycles,
    stats,
    dateStr,
    dayIndex
  ) {
    if (!cycles || cycles.length === 0 || !stats?.color) return;
  
    g.push();
    g.scale(RESOLUTION);
  
    const d = new Date(dateStr);
    const dayStartMs = new Date(d.setHours(0, 0, 0, 0)).getTime();
  
    const centerX = g.width / 2 / RESOLUTION;
    const centerY = g.height / 2 / RESOLUTION;
  
    const rStart = BASE_RADIUS + dayIndex * RING_SPACING;
    const rEnd   = rStart + RING_SPACING;
  
    const msToAngle = (ms) =>
      ((ms - dayStartMs) / (24 * 60 * 60 * 1000)) * TWO_PI - HALF_PI;
  
    const msToRadius = (ms) =>
      g.lerp(rStart, rEnd, (ms - dayStartMs) / (24 * 60 * 60 * 1000));
  
    g.stroke(stats.color);          // ★ 色は stats から
    g.noFill();
    g.strokeWeight(SLEEP_LINE_WEIGHT);
  
    for (const c of cycles) {
      if (c.wakeEndMs <= c.sleepStartMs) continue;
  
      const steps = 60;
      g.beginShape();
  
      for (let i = 0; i <= steps; i++) {
        const ms = g.lerp(c.sleepStartMs, c.wakeEndMs, i / steps);
        const a  = msToAngle(ms);
        const r  = msToRadius(ms);
  
        g.vertex(
          centerX + r * cos(a),
          centerY + r * sin(a)
        );
      }
  
      g.endShape();
    }
  
    g.pop();
  }
  
  