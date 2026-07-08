/**
 * barChart.js
 * 月単位 最大連続睡眠時間のバー画像を生成して imgURL を返す
 */

async function createMonthlyMaxSleepBarImage({
    dates,
    statsPerDay,
    person,
    width = 160,
    barHeight = 4,
    gap = 8,
    maxHours = 7,
    bgColor = '#090040',
    totalBarColor = [255,255,0,100],
    maxBarColor = [255,255,0,255],
  }) {

    const height = dates.length * (barHeight * 2 + gap);
  
    const sketch = (p) => {
      let canvas;
  
      p.setup = () => {
        canvas = p.createCanvas(width, height);
        p.noLoop();
      };
  
      p.draw = () => {
        p.background(bgColor);
  
        const maxMs = maxHours * 60 * 60 * 1000;
        const scaleX = width / maxMs;
  
        dates.forEach((date, i) => {
          const y = i * (barHeight * 2 + gap);
  
          const p_total = statsPerDay[date]?.[person]?.totalSleepMs ?? 0;
          const p_max = statsPerDay[date]?.[person]?.maxSleepMs ?? 0;
  
          p.noStroke();
  
          p.fill(totalBarColor);
          p.rect(0, y, p_total * scaleX, barHeight);
          p.fill(maxBarColor);
          p.rect(0, y, p_max * scaleX, barHeight);
  
        });
      };
  
      p.getImageURL = () => canvas.elt.toDataURL('image/png');
    };
  
    // p5 instance を DOM 外で生成
    const pInstance = new p5(sketch, document.createElement('div'));
  
    return new Promise((resolve) => {
      // draw 完了を待つ（p5 の都合）
      setTimeout(() => {
        const url = pInstance.getImageURL();
        pInstance.remove();
        resolve(url);
      }, 0);
    });
  }
  