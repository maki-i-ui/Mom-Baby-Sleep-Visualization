/**
sketch.js
 ├─ preload()        // データロード
 ├─ prepareSleepCyclesForDrawing()  // ★データ前処理
 ├─ renderAllMonths()                // ★DOM生成
 ├─ setup() / updateVisualization()
 */
 import { createMonthlySvg } from './charts/createMonthlySvg.js';
 import { spiralRenderer } from './charts/spiralRenderer.js';
 import { barRenderer } from './charts/barRenderer.js';
 import { defaultTheme } from './charts/types.js';
 import { computeChartLayout, computeBarChartLayout, computeChartRowWidthFromLayout } from './charts/chartDimensions.js';
 import { buildGlobalBarChartScale, getWidestTickLabel } from './charts/barScale.js';
 import {
   getBirthTransitionSky,
  getChartBackdropStyle,
  getGuideBackdropStyle,
  getPostpartumSky,
   getPregnancySky,
 } from './charts/skyPalette.js';
 import { initScrollSky } from './charts/skyScroll.js';
 import { renderIntro, createGuideSection, createPrologueMilestone, createMonthSection, createBirthMilestone, syncMobileLayout } from './components.js?v=20260728';
 import { createUI } from './ui.js';

let ui;
let sleepData1; // 一人目のデータ
let sleepData2; // 二人目のデータ
let eventData; // 日記・マイルストーン
const isDevMode = new URLSearchParams(window.location.search).get('dev') === '1';
if (isDevMode) {
  document.documentElement.classList.add('dev-mode');
}
let allDatesInPeriod = []; // 期間内のすべての日付を格納する新しい変数
let minDateFromData = null;
let maxDateFromData = null;

// --- 時間軸に関する定数 ---
// 各行の表示範囲を午前7時から翌日の午前7時とする
const DISPLAY_START_HOUR = 7;//7;
const DISPLAY_END_HOUR = 7+24;//7 + 24; // 翌日の7時

const DISPLAY_START_MINUTE_ABSOLUTE = DISPLAY_START_HOUR * 60; // 7時の絶対分数 (0:00基準)
const DISPLAY_END_MINUTE_ABSOLUTE = DISPLAY_END_HOUR * 60; // 翌7時の絶対分数 (0:00基準)

// 事前計算された描画データを格納するグローバル変数
let dailySleepData = {};

// The date of pregnancy day 0 (in YYYY-MM-DD format)
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const pregnancyStartDate = parseLocalDate('2022-04-24');
const birthDate = parseLocalDate('2023-01-01');
/** 鑑賞者向け表示（睡眠データの内部日付とは別） */
const birthDateDisplay = '2025-01-01';
/**
 * 事前ロード関数: JSONデータを読み込む
 * loadJSONは非同期なので、読み込み完了後にコールバック関数が呼ばれるようにする
 */

new p5((p) => {
  p.preload=()=> {
    console.log("preload")
      // sleepData1の読み込み
      p.loadJSON('../data/sleep_wake_data.json', (data) => {
        sleepData1 = data;
        // sleepData2も読み込まれているかチェックしてから日付計算を呼び出す
        if (sleepData2) { // sleepData2が先に読み込まれている場合
          calculateMinMaxDatesFromData();
        }
      });
    
      // sleepData2の読み込み
      p.loadJSON('../data/sleep_wake_data_2.json', (data) => {
        sleepData2 = data;
        // sleepData1も読み込まれているかチェックしてから日付計算を呼び出す
        if (sleepData1) { // sleepData1が先に読み込まれている場合
          calculateMinMaxDatesFromData();
        }
      });

      p.loadJSON('../data/event.json', (data) => {
        eventData = data;
      });

    }

  /**
   * sleepData1 と sleepData2 から最も古い日付と新しい日付を計算する関数
   * この関数は、両方のJSONデータがロードされた後にのみ実行されるべき
   */
  function calculateMinMaxDatesFromData() {
      // データがまだロードされていない場合は、何もしない (二重呼び出し対策)
      if (!sleepData1 || !sleepData2 || minDateFromData !== null) {
          return; 
      }

      let allKeys = new Set();

      for (const dateKey in sleepData1) {
          allKeys.add(dateKey);
      }
      for (const dateKey in sleepData2) {
          allKeys.add(dateKey);
      }

      if (allKeys.size === 0) {
          console.warn("データファイルから日付が見つかりませんでした。データが空か、正しいJSON形式ではありません。");
          return;
      }

      const sortedDates = Array.from(allKeys).sort((a, b) => {
          return new Date(a).getTime() - new Date(b).getTime();
      });

      minDateFromData = sortedDates[0];
      maxDateFromData = sortedDates[sortedDates.length - 1];

      const displayEnd = getDisplayEndDate();
      if (maxDateFromData > displayEnd) {
        maxDateFromData = displayEnd;
      }

      console.log(`データ範囲: ${minDateFromData} から ${maxDateFromData}`);
  }

  /**
   * 特定の人のデータにその日付のエントリが存在するかどうかをチェックします。
   * @param {object} data - チェックする睡眠データ (sleepData1 または sleepData2)
   * @param {string} date - チェックする日付文字列
   * @returns {boolean} データエントリが存在すれば true、そうでなければ false
   */
  function hasDataEntryForPerson(data, date) {
      return data[date] !== undefined && data[date] !== null && data[date].length > 0;
  }
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const PREGNANCY_PERIOD_DAYS = 28;
  const POSTPARTUM_PERIOD_DAYS = 30;

  function toDateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + days);
    return d;
  }

  /** 表示上限：産後10ヶ月の最終日 */
  function getDisplayEndDate() {
    const endDays = 10 * POSTPARTUM_PERIOD_DAYS + POSTPARTUM_PERIOD_DAYS - 1;
    return toDateString(addDays(birthDate, endDays));
  }

  function getPregnancyWeekLabel(periodIndex) {
    const startWeek = periodIndex * 4;
    const endWeek = startWeek + 3;
    return `妊娠${startWeek}週〜${endWeek}週`;
  }

  function getPeriodDateRange(phase, index) {
    if (phase === 'pregnancy') {
      const startDays = index * PREGNANCY_PERIOD_DAYS;
      const endDays = startDays + PREGNANCY_PERIOD_DAYS - 1;
      const lastPregnancyDay = Math.floor(
        (birthDate.getTime() - pregnancyStartDate.getTime()) / MS_PER_DAY
      ) - 1;
      return {
        startDate: toDateString(addDays(pregnancyStartDate, startDays)),
        endDate: toDateString(addDays(pregnancyStartDate, Math.min(endDays, lastPregnancyDay))),
      };
    }

    const startDays = index * POSTPARTUM_PERIOD_DAYS;
    const endDays = startDays + POSTPARTUM_PERIOD_DAYS - 1;
    return {
      startDate: toDateString(addDays(birthDate, startDays)),
      endDate: toDateString(addDays(birthDate, endDays)),
    };
  }

  function getPregnancyOrPostpartumMonth(dateStr) {
    const d = new Date(dateStr);
    d.setHours(0,0,0,0);

    const pregStartMs = pregnancyStartDate.getTime();
    const birthMs = birthDate.getTime();
    const t = d.getTime();

    if (t < pregStartMs) return null;

    // 妊娠中（4週＝28日区切り）
    if (t < birthMs) {
      const days = Math.floor((t - pregStartMs) / MS_PER_DAY);
      const periodIndex = Math.floor(days / PREGNANCY_PERIOD_DAYS);
      return {
        phase: 'pregnancy',
        index: periodIndex,
        label: getPregnancyWeekLabel(periodIndex),
      };
    }

    // 産後（30日区切り）
    const days = Math.floor((t - birthMs) / MS_PER_DAY);
    const periodIndex = Math.floor(days / POSTPARTUM_PERIOD_DAYS);
    return {
      phase: 'postpartum',
      index: periodIndex,
      label: `産後${periodIndex}ヶ月`,
    };
  }


  /**
   * 各日の睡眠・起床サイクルを描画するデータを事前に準備する関数
   * この関数は、allDatesInPeriod内の各日付に対して、その1周に描画されるべき睡眠サイクルを計算し、cyclesToDrawPerDayに格納します。
   */

  function buildDailySleepData(theme = defaultTheme) {
    const dailySleepData = {};
  
    // 初期化
    for (const dateStr of allDatesInPeriod) {
      dailySleepData[dateStr] = {
        person1: { cycles: [], stats: { totalSleepMs: 0, maxSleepMs: 0 ,sleepColor: null,} },
        person2: { cycles: [], stats: { totalSleepMs: 0, maxSleepMs: 0 ,sleepColor: null,} }
      };
    }
  
    const allSleepCycles = [];
  
    function appendCyclesFromData(sleepData, personId) {
      const childBirthDateMs = birthDate.getTime();
      for (const dateKey in sleepData) {
        if (!hasDataEntryForPerson(sleepData, dateKey)) continue;
  
        const baseMs = new Date(dateKey).setHours(0,0,0,0);
  
        for (const cycle of sleepData[dateKey]) {
          if (!cycle.sleep || !cycle.wake) continue;
  
          const sH = +cycle.sleep.slice(0,2);
          const sM = +cycle.sleep.slice(3,5);
          let sleepStartMs = baseMs + (sH * 60 + sM) * 60 * 1000;
  
          let wakeBaseMs = baseMs;
          if (cycle.wake_date) {
            wakeBaseMs = new Date(cycle.wake_date).setHours(0,0,0,0);
          }
  
          const wH = +cycle.wake.slice(0,2);
          const wM = +cycle.wake.slice(3,5);
          let wakeEndMs = wakeBaseMs + (wH * 60 + wM) * 60 * 1000;
          
          // 24:00 → 翌日 00:00 の扱い
          if (cycle.wake === "24:00") {
            wakeEndMs = baseMs + 24 * 60 * 60 * 1000;
          }

          // 日またぎ処理
          if (wakeEndMs <= sleepStartMs) {
            wakeEndMs += 24 * 60 * 60 * 1000;
          }
  
          // 出生日前の person2 除外
          if (personId === 2 && childBirthDateMs > 0 && sleepStartMs < childBirthDateMs) {
            continue;
          }
  
          allSleepCycles.push({
            person: personId,
            sleep: cycle.sleep,
            wake: cycle.wake,
            sleepStartMs,
            wakeEndMs
          });
        }
      }
    }
  
    appendCyclesFromData(sleepData1, 1);
    appendCyclesFromData(sleepData2, 2);
  
    // ---- 1日のリング（7時から翌7時で1周）に対し、睡眠の開始時間が重なっている cycle を割り当てる ----
    for (const dateStr of allDatesInPeriod) {
      const dayStartMs = new Date(dateStr).setHours(0,0,0,0);
      const rowStartMs = dayStartMs + DISPLAY_START_MINUTE_ABSOLUTE * 60 * 1000;
      const rowEndMs   = dayStartMs + DISPLAY_END_MINUTE_ABSOLUTE   * 60 * 1000;
  
      for (const cycle of allSleepCycles) {
        if (!(rowStartMs <= cycle.sleepStartMs && cycle.sleepStartMs < rowEndMs)) {
          continue;
        }
  
        const durationMs = cycle.wakeEndMs - cycle.sleepStartMs;
        const personKey = cycle.person === 1 ? 'person1' : 'person2';
  
        const day = dailySleepData[dateStr][personKey];
  
        day.cycles.push(cycle);
        day.stats.totalSleepMs += durationMs;
        day.stats.maxSleepMs = Math.max(day.stats.maxSleepMs, durationMs);
      }
      // ===== ★ 色計算をここで行う =====
      for (const personKey of ["person1", "person2"]) {
        const stats = dailySleepData[dateStr][personKey].stats;
  
        if (stats.maxSleepMs <= 0) {
          stats.sleepColor = null;
          continue;
        }
  
        const { min, max, maxHours } = theme.sleepGradient;

        const t = Math.min(
          stats.maxSleepMs / (1000 * 60 * 60) / maxHours,
          1
        );

        const lerp = (a, b, t) => Math.round(a + (b - a) * t);
        const minRgba = min.length >= 4 ? min : [...min, 255];
        const maxRgba = max.length >= 4 ? max : [...max, 255];

        stats.sleepColor = {
          r: lerp(minRgba[0], maxRgba[0], t),
          g: lerp(minRgba[1], maxRgba[1], t),
          b: lerp(minRgba[2], maxRgba[2], t),
          a: lerp(minRgba[3], maxRgba[3], t),
        };
      }
    }
  
    return dailySleepData;
  }
  


  /**
   * 指定された開始日から終了日までの全ての日付を生成し、allDatesInPeriodを更新する関数
   */
  function generateAllDatesInPeriod() {
      const { startDate: startDateStr, endDate: endDateStr } = ui.readUIState(p);

      if (!startDateStr || !endDateStr) {
          console.warn("開始日と終了日を指定してください。");
          allDatesInPeriod = [];
          updateVisualization(); // 空の状態で可視化を更新
          return;
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const displayEnd = new Date(getDisplayEndDate());

      if (startDate > endDate) {
          console.warn("開始日は終了日より前である必要があります。");
          allDatesInPeriod = [];
          updateVisualization(); // 空の状態で可視化を更新
          return;
      }

      const effectiveEndDate = endDate > displayEnd ? displayEnd : endDate;

      allDatesInPeriod = [];
      let currentDate = new Date(startDate);
      while (currentDate <= effectiveEndDate) {
          // ISO形式 (YYYY-MM-DD) で日付文字列を追加
          allDatesInPeriod.push(currentDate.toISOString().split('T')[0]);
          currentDate.setDate(currentDate.getDate() + 1);
      }

      if (allDatesInPeriod.length === 0) {
          console.warn("指定された期間内に日付が見つかりませんでした。");
          createCanvas(windowWidth - select('#controls').width, windowHeight).parent(select('body'));
          background(255);
          textSize(20);
          textAlign(CENTER, CENTER);
          fill(0);
          text("指定された期間内に日付が見つかりませんでした。", width / 2, height / 2);
          noLoop();
          return;
      }

      // 日付が生成された後、描画データを準備する関数を呼び出す
      const theme = ui.readThemeFromUI();
      dailySleepData = buildDailySleepData(theme);
      // その後で可視化を更新（これにより redraw() が呼ばれる）
      updateVisualization();

     
  }

  function dayOffsetFromStart(startDateStr, dateStr) {
    const start = new Date(startDateStr);
    const d = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - start.getTime()) / MS_PER_DAY);
  }

  function getPeriodDayCount(phase) {
    return phase === 'pregnancy' ? PREGNANCY_PERIOD_DAYS : POSTPARTUM_PERIOD_DAYS;
  }

  function buildPeriodSlots(dateGroup) {
    const count = getPeriodDayCount(dateGroup.phase);
    const slots = Array(count).fill(null);

    for (const dateStr of dateGroup.dates) {
      const offset = dayOffsetFromStart(dateGroup.startDate, dateStr);
      if (offset >= 0 && offset < count) {
        slots[offset] = dateStr;
      }
    }

    return slots;
  }

  function groupDatesByPregnancyPhase(dateList) {
      const map = {};
    
      dateList.forEach(dateStr => {
        const info = getPregnancyOrPostpartumMonth(dateStr);
        if (!info) return;
    
        const key = `${info.phase}-${info.index}`;
    
        if (!map[key]) {
          const { startDate, endDate } = getPeriodDateRange(info.phase, info.index);
          map[key] = {
            label: info.label,
            phase: info.phase,
            index: info.index,
            startDate,
            endDate,
            periodDayCount: getPeriodDayCount(info.phase),
            dates: []
          };
        }
    
        map[key].dates.push(dateStr);
      });
    
      // index順に並び替え
      return Object.values(map).sort((a, b) => {
        if (a.phase !== b.phase) {
          return a.phase === 'pregnancy' ? -1 : 1;
        }
        return a.index - b.index;
      });
  }
    
  function formatDuration(ms) {
    const totalMinutes = Math.round(ms / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes}分`;
    if (minutes === 0) return `${hours}時間`;
    return `${hours}時間${minutes}分`;
  }

  function formatAvgHoursLabel(ms) {
    if (ms <= 0) return '—';
    const hours = ms / (1000 * 60 * 60);
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded}時間`;
  }

  function computePeriodHasSleepData(periodSlots, personKey) {
    for (const dateStr of periodSlots) {
      if (!dateStr) continue;
      const maxMs = dailySleepData[dateStr]?.[personKey]?.stats?.maxSleepMs ?? 0;
      if (maxMs > 0) return true;
    }
    return false;
  }

  function computePeriodAvgMaxSleep(periodSlots, personKey) {
    let sum = 0;
    let count = 0;

    for (const dateStr of periodSlots) {
      if (!dateStr) continue;
      const maxMs = dailySleepData[dateStr]?.[personKey]?.stats?.maxSleepMs ?? 0;
      if (maxMs > 0) {
        sum += maxMs;
        count++;
      }
    }

    return count > 0 ? sum / count : 0;
  }

  function computeMonthSleepStats(dates) {
    const stats = {
      person1: { totalMs: 0, maxMs: 0, daysWithData: 0, daysNoRecord: 0 },
      person2: { totalMs: 0, maxMs: 0, daysWithData: 0, daysNoRecord: 0 },
    };

    for (const dateStr of dates) {
      for (const personKey of ['person1', 'person2']) {
        const day = dailySleepData[dateStr]?.[personKey];
        if (!day) continue;

        if (day.stats.maxSleepMs > 0) {
          stats[personKey].totalMs += day.stats.totalSleepMs;
          stats[personKey].maxMs = Math.max(stats[personKey].maxMs, day.stats.maxSleepMs);
          stats[personKey].daysWithData++;
        } else {
          stats[personKey].daysNoRecord++;
        }
      }
    }

    return stats;
  }

  function getMilestonesInRange(milestones, startDate, endDate) {
    if (!milestones) return [];

    return Object.entries(milestones)
      .filter(([date]) => date >= startDate && date <= endDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, text]) => ({ date, text }));
  }

  function describePersonStats(label, personStats) {
    const parts = [];

    if (personStats.daysWithData > 0) {
      const avgMs = personStats.totalMs / personStats.daysWithData;
      parts.push(
        `${label}の1日あたり平均睡眠は${formatDuration(avgMs)}、最長の連続睡眠は${formatDuration(personStats.maxMs)}`
      );
    }
    if (personStats.daysNoRecord > 0) {
      parts.push(`${label}の記録がない日は${personStats.daysNoRecord}日`);
    }

    return parts.join('。');
  }

  function generatePlaceholderDiary(dateGroup) {
    const stats = computeMonthSleepStats(dateGroup.dates);
    const milestones = eventData?.milestones || {};
    const monthEvents = getMilestonesInRange(
      milestones,
      dateGroup.dates[0],
      dateGroup.dates[dateGroup.dates.length - 1]
    );

    const parts = [];

    const momText = describePersonStats('母', stats.person1);
    if (momText) parts.push(momText);

    if (dateGroup.phase === 'postpartum' || stats.person2.daysWithData > 0) {
      const childText = describePersonStats('子', stats.person2);
      if (childText) parts.push(childText);
    } else if (dateGroup.phase === 'pregnancy') {
      parts.push('この時期は、まだ子の睡眠記録はありません');
    }

    if (monthEvents.length > 0) {
      parts.push(
        monthEvents.map(e => `${e.date.slice(5).replace('-', '/')}：${e.text}`).join('、')
      );
    }

    const body = parts.filter(Boolean).join('。') + '。';
    return `${dateGroup.label}。${body}`;
  }

  function getDiaryText(dateGroup) {
    const diary = eventData?.diary || [];
    const item = diary.find(
      d => d.phase === dateGroup.phase && d.index === dateGroup.index
    );

    if (item?.text) {
      return item.text;
    }

    return generatePlaceholderDiary(dateGroup);
  }

  function getTotalPregnancyPeriods() {
    const lastPregnancyDay = Math.floor(
      (birthDate.getTime() - pregnancyStartDate.getTime()) / MS_PER_DAY
    ) - 1;

    return Math.floor(lastPregnancyDay / PREGNANCY_PERIOD_DAYS) + 1;
  }

  function getPregnancyProgress(periodIndex) {
    const total = getTotalPregnancyPeriods();
    if (total <= 1) return 0;
    return periodIndex / (total - 1);
  }

  function getSkyForDateGroup(dateGroup) {
    if (dateGroup.phase === 'pregnancy') {
      return getPregnancySky(getPregnancyProgress(dateGroup.index));
    }

    const periodSlots = buildPeriodSlots(dateGroup);
    const childAvgMaxMs = computePeriodAvgMaxSleep(periodSlots, 'person2');
    const avgHours = childAvgMaxMs / (1000 * 60 * 60);
    return getPostpartumSky(avgHours);
  }

  function renderAllMonths(config) {
    const container = document.getElementById('monthly-spirals');
    container.innerHTML = '';

    const dateGroups = groupDatesByPregnancyPhase(allDatesInPeriod);
    const globalBarScale = buildGlobalBarChartScale(dailySleepData);
    const widestTickLabel = getWidestTickLabel(globalBarScale.axisTicks);
    const introSky = getPregnancySky(0);
    const skyAnchors = [];

    const introEl = document.getElementById('intro');
    if (introEl) skyAnchors.push({ el: introEl, sky: introSky });

    const guideLayout = computeChartLayout({ config, dayCount: 30 });
    const guideBarLayout = computeBarChartLayout({
      spiralDisplay: guideLayout.spiral.display,
      widestTickLabel,
    });
    const guideRowWidth = computeChartRowWidthFromLayout({
      spiralDisplay: guideLayout.spiral.display,
      barDisplayWidth: guideBarLayout.display.width,
    });
    const guideSection = createGuideSection(
      guideRowWidth,
      { chartBackdrop: getGuideBackdropStyle(introSky) }
    );
    container.appendChild(guideSection);
    skyAnchors.push({ el: guideSection, sky: introSky });

    const prologueMilestone = createPrologueMilestone();
    container.appendChild(prologueMilestone);
    skyAnchors.push({ el: prologueMilestone, sky: introSky });

    for (let i = 0; i < dateGroups.length; i++) {
      const dateGroup = dateGroups[i];

      if (
        i > 0 &&
        dateGroups[i - 1].phase === 'pregnancy' &&
        dateGroup.phase === 'postpartum'
      ) {
        const milestone = createBirthMilestone(birthDateDisplay);
        container.appendChild(milestone);
        skyAnchors.push({ el: milestone, sky: getBirthTransitionSky() });
      }

      const periodSlots = buildPeriodSlots(dateGroup);
      const momAvgMaxMs = computePeriodAvgMaxSleep(periodSlots, 'person1');
      const childAvgMaxMs = computePeriodAvgMaxSleep(periodSlots, 'person2');

      const childHasData = computePeriodHasSleepData(periodSlots, 'person2');
      const sectionSky = getSkyForDateGroup(dateGroup);
      const sectionTheme = config.theme ?? defaultTheme;
      const chartBackdrop = getChartBackdropStyle(sectionSky, {
        postpartumMonthIndex: dateGroup.phase === 'postpartum' ? dateGroup.index : null,
      });

      const chartLayout = computeChartLayout({
        config,
        dayCount: periodSlots.length,
      });

      const barLayout = computeBarChartLayout({
        spiralDisplay: chartLayout.spiral.display,
        widestTickLabel,
      });

      const [spiralURL1,spiralURL2, barURL1,barURL2] = [
        createMonthlySvg({
          renderer: spiralRenderer,
          dates: periodSlots,
          data: dailySleepData,
          person: 'person1',
          width: chartLayout.spiral.intrinsic,
          height: chartLayout.spiral.intrinsic,
          displayWidth: chartLayout.spiral.display,
          displayHeight: chartLayout.spiral.display,
          theme: sectionTheme,
          config,
          fontScale: chartLayout.fontScale,
          periodStats: { avgMaxSleepLabel: formatAvgHoursLabel(momAvgMaxMs) },
        }),
        createMonthlySvg({
          renderer: spiralRenderer,
          dates: periodSlots,
          data: dailySleepData,
          person: 'person2',
          width: chartLayout.spiral.intrinsic,
          height: chartLayout.spiral.intrinsic,
          displayWidth: chartLayout.spiral.display,
          displayHeight: chartLayout.spiral.display,
          theme: sectionTheme,
          config,
          fontScale: chartLayout.fontScale,
          periodStats: {
            avgMaxSleepLabel: formatAvgHoursLabel(childAvgMaxMs),
            showNoData: !childHasData,
          },
        }),
        createMonthlySvg({
          renderer: barRenderer,
          dates: periodSlots,
          data: dailySleepData,
          person: 'person1',
          width: barLayout.intrinsic.width,
          height: barLayout.intrinsic.height,
          displayWidth: barLayout.display.width,
          displayHeight: barLayout.display.height,
          theme: sectionTheme,
          config,
          fontScale: chartLayout.fontScale,
          align: 'right',
          fixedDayCount: dateGroup.periodDayCount,
          maxHours: globalBarScale.maxHours,
          axisTicks: globalBarScale.axisTicks,
        }),
        createMonthlySvg({
          renderer: barRenderer,
          dates: periodSlots,
          data: dailySleepData,
          person: 'person2',
          width: barLayout.intrinsic.width,
          height: barLayout.intrinsic.height,
          displayWidth: barLayout.display.width,
          displayHeight: barLayout.display.height,
          theme: sectionTheme,
          config,
          fontScale: chartLayout.fontScale,
          align: 'left',
          fixedDayCount: dateGroup.periodDayCount,
          maxHours: globalBarScale.maxHours,
          axisTicks: globalBarScale.axisTicks,
        }),
      ];

      const description = getDiaryText(dateGroup);
      const section = createMonthSection(
        dateGroup,
        spiralURL1,
        spiralURL2,
        barURL1,
        barURL2,
        description,
        { chartBackdrop }
      );
      container.appendChild(section);
      skyAnchors.push({ el: section, sky: getSkyForDateGroup(dateGroup) });
    }

    initScrollSky(skyAnchors);
    syncMobileLayout();
  }

  let mobileLayoutRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(mobileLayoutRaf);
    mobileLayoutRaf = requestAnimationFrame(syncMobileLayout);
  });




  /**
   * セットアップ関数: キャンバスの作成、UI要素の初期化、イベントリスナーの設定
   */

  p.setup=()=> {  
    console.log("setup")

    if (isDevMode) {
      const toggleButton = document.getElementById('toggle-button');
      const controlsPanel = document.getElementById('controls');
      if (toggleButton) toggleButton.hidden = false;
      if (controlsPanel) controlsPanel.hidden = false;
    }

    ui = createUI({
      minDateFromData,
      maxDateFromData,
      pregnancyStartDate: toDateString(pregnancyStartDate),
      birthDate: toDateString(birthDate),
      onUpdateVisualization: updateVisualization,
      onGenerateAllDates: generateAllDatesInPeriod,
      devMode: isDevMode
    });

    renderIntro('intro');
    generateAllDatesInPeriod();
    p.noCanvas(); // DOMだけ使うなら
    p.noLoop(); // ← p5.js の draw を止める
    }
    

  /**
   * 可視化の更新関数: UIコントロールの値に基づいて描画設定を更新し、再描画する
   */
  function updateVisualization() {
    const uiState = ui.readUIState(p);
    dailySleepData = buildDailySleepData(uiState.theme);
    renderAllMonths(uiState);
  }

  /**
   * メイン描画ループ: redraw()が呼び出された時のみ実行される
   */
  function draw() {
  }
});
