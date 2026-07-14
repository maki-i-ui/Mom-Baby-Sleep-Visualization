import {
  computeBarRowLayout,
  getDayTicksForPhase,
} from './charts/barChartMetrics.js';
import { computeChartRowWidthFromLayout } from './charts/chartDimensions.js';

/** month-panel の左右 padding（テキスト・チャートの内側幅を揃える） */
export const SECTION_PANEL_PADDING_X = 16;

function sectionContentWidth(chartRowWidth) {
  return chartRowWidth + SECTION_PANEL_PADDING_X * 2;
}

function applySectionPanelBackdrop(panel, chartBackdrop) {
  panel.style.setProperty('--chart-backdrop-brightness', String(chartBackdrop.brightness));
  panel.style.setProperty('--chart-backdrop-outline', chartBackdrop.outline);
  if (chartBackdrop.tint) {
    panel.style.setProperty('--chart-backdrop-tint', chartBackdrop.tint);
  }
}

/* =========================
   Site Header + Intro
========================= */
export function renderIntro(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = `
    <header class="site-header">
      <h1 class="site-title">母と子の睡眠記録</h1>
      <p class="site-framing">
        妊娠中から産後まで、母親と子どもそれぞれの睡眠を月ごとに記録した作品です。<br>
        眠りの断片と時間の流れを体験してください。
      </p>
    </header>
  `;
}

/* =========================
   Reading Guide (Legend)
========================= */
export function createGuideSection(
  chartRowWidth,
  { chartBackdrop = { brightness: 0.82, outline: 'transparent' } } = {}
) {
  const section = document.createElement('section');
  section.className = 'month-section guide-section';
  section.setAttribute('aria-label', '読み方ガイド');

  const content = document.createElement('div');
  content.className = 'month-content';
  content.style.width = `${sectionContentWidth(chartRowWidth)}px`;

  const panel = document.createElement('div');
  panel.className = 'month-panel';
  applySectionPanelBackdrop(panel, chartBackdrop);

  panel.innerHTML = `
    <div class="month-header">
      <div class="month-title">
        <h2 class="month-label">読み方</h2>
      </div>
      <p class="month-description">
        左が<span class="guide-em">母親</span>、右が<span class="guide-em">子ども</span>の睡眠記録です。<br>
        各日の睡眠時間は<span class="guide-em">朝7:00を起点</span>に24時間で計算しています（午前7時から翌朝7時までを1日とみなします）。
      </p>
    </div>

    <figure class="guide-diagram">
      <img
        src="assets/guide-section-diagram.svg?v=20260712"
        alt="1つの月のチャート模式図。①色の凡例。②母親・子どものスパイラル（円弧が睡眠を示す）、③棒グラフ（塗り=最長連続睡眠、線=合計睡眠）"
        loading="lazy"
        decoding="async"
      />
      <figcaption class="guide-diagram-caption">1つの月のチャート構成（模式図）</figcaption>
    </figure>

    <div class="guide-notes" aria-label="図の補足説明">

      <section class="guide-note">
        <h3 class="guide-note-heading"><span class="guide-note-num">①</span> 色：1日の最長連続睡眠時間</h3>
        <p class="guide-text">
          1日の最長連続睡眠時間が長いほど青く、短いほど赤くなります。
        </p>
      </section>
      <section class="guide-note">
        <h3 class="guide-note-heading"><span class="guide-note-num">②</span> スパイラル：睡眠リズム</h3>
        <p class="guide-text">
          24時間で一周し、内側から外側に向かって新しい日付を表す螺旋構造です。線は入眠から起床までを示します。
          中央はその月の最長連続睡眠の平均です。
        </p>
      </section>

      <section class="guide-note">
        <h3 class="guide-note-heading"><span class="guide-note-num">③</span> 棒グラフ：睡眠量</h3>
        <p class="guide-text">
          1行が1日の睡眠量を表します。<span class="guide-em">枠線</span>は合計睡眠時間、
          <span class="guide-em">塗り</span>は最長連続睡眠時間です。
          母は右端が0、子は左端が0です。
          1日の区切りは<span class="guide-em">朝7:00</span>です。
        </p>
      </section>


    </div>

    <details class="guide-details">
      <summary class="guide-details-summary">くわしい説明</summary>
      <div class="guide-details-body">
        <section class="guide-detail-item">
          <h3 class="guide-heading">左右の配置（鏡像）</h3>
          <p class="guide-text">
            母は左から<span class="guide-em">スパイラル・棒</span>、
            子は左から<span class="guide-em">棒・スパイラル</span>。
            同じ日の睡眠が、左右で向かい合う形に揃っています。
          </p>
        </section>

        <section class="guide-detail-item">
          <h3 class="guide-heading">記録なし</h3>
          <p class="guide-text">
            薄い輪や半透明の棒だけが描かれている日は、睡眠記録がありません。
            眠れなかった日とは限りません。
          </p>
        </section>

        <section class="guide-detail-item">
          <h3 class="guide-heading">期間の区分</h3>
          <p class="guide-text">
            妊娠中は<span class="guide-em">4週（28日）ごと</span>、
            産後は出生日から<span class="guide-em">30日ごと</span>に区切っています
            （暦の月ではありません）。子の記録は出生日以降から始まります。
          </p>
        </section>

        <section class="guide-detail-item">
          <h3 class="guide-heading">1日の区切り（7:00起点）</h3>
          <p class="guide-text">
            各日ごとの睡眠時間は、暦の日付（0:00〜24:00）ではなく、
            <span class="guide-em">朝7:00を起点</span>に24時間で計算しています。
            午前7時から翌朝7時までを1日とみなし、スパイラル・棒グラフの1輪・1行に対応します。
            深夜の授乳や早朝の起床など、生活リズムに沿った区切りにするための意図です。
          </p>
        </section>
      </div>
    </details>
  `;

  content.appendChild(panel);
  section.appendChild(content);

  return section;
}

export function createPrologueMilestone() {
  const milestone = document.createElement('div');
  milestone.className = 'birth-milestone';
  milestone.setAttribute('aria-label', 'はじめに');

  milestone.innerHTML = `
    <p class="birth-milestone-body">
      子どもが生まれた夜から、眠りは数分単位の断片になった。<br>
      深夜に独りで泣く子を抱えながら、一体いつまでこんな生活が続くのかと恐ろしくなった。<br>
      私は母になることを選んだ——けれど、こんな孤独を味わうなんて思いもしなかった。
    </p>
  `;

  return milestone;
}

export function createBirthMilestone(birthDateStr) {
  const milestone = document.createElement('div');
  milestone.className = 'birth-milestone';
  milestone.setAttribute('aria-label', '子どもの誕生');

  const formatted = formatBirthDateJa(birthDateStr);

  milestone.innerHTML = `
    <p class="birth-milestone-label">子どもの誕生</p>
    ${formatted ? `<p class="birth-milestone-date">${formatted}</p>` : ''}
  `;

  return milestone;
}

function formatBirthDateJa(dateStr) {
  if (!dateStr) return '';
  const [y, m] = dateStr.split('-').map(Number);
  if (!y || !m) return dateStr;
  return `${y}年${m}月`;
}

/* =========================
   Month Section Component
========================= */
const BAR_CLUSTER_GAP = 8;
const BAR_CENTER_AXIS_WIDTH = 40;

function computeChartRowWidth(spiralImage1, spiralImage2, barImage1, barImage2) {
  return computeChartRowWidthFromLayout({
    spiralDisplay: spiralImage1.width,
    barDisplayWidth: barImage1.width,
  });
}

export function createMonthSection(
  dateGroup,
  spiralImage1,
  spiralImage2,
  barImage1,
  barImage2,
  description,
  { chartBackdrop = { brightness: 0.82, outline: 'transparent' } } = {}
) {
  const section = document.createElement('section');
  section.className = 'month-section';
  section.setAttribute('aria-label', dateGroup.label);

  const content = document.createElement('div');
  content.className = 'month-content';

  const header = createMonthHeader(dateGroup, description);
  const body = createMonthBody(dateGroup, spiralImage1, spiralImage2, barImage1, barImage2);
  const panel = createMonthPanel(header, body, chartBackdrop);
  const rowWidth = computeChartRowWidth(spiralImage1, spiralImage2, barImage1, barImage2);

  content.style.width = `${sectionContentWidth(rowWidth)}px`;

  content.appendChild(panel);

  section.appendChild(content);

  return section;
}

function createMonthPanel(header, body, backdrop) {
  const panel = document.createElement('div');
  panel.className = 'month-panel';
  applySectionPanelBackdrop(panel, backdrop);

  const bodyWrap = document.createElement('div');
  bodyWrap.className = 'month-body-wrap';
  bodyWrap.appendChild(body);

  panel.appendChild(header);
  panel.appendChild(bodyWrap);
  return panel;
}

/** モバイルでチャート行が画面幅に収まるようスケール調整 */
export function syncMobileLayout() {
  const MOBILE_BREAKPOINT = 768;
  const container = document.getElementById('monthly-spirals');
  const padding = container
    ? parseFloat(getComputedStyle(container).paddingLeft) +
      parseFloat(getComputedStyle(container).paddingRight)
    : 32;
  const available = window.innerWidth - padding;

  document.querySelectorAll('.month-bars-wrap').forEach((wrap) => {
    const block = wrap.querySelector('.month-bars-block');
    if (!block) return;

    block.style.transform = '';
    block.style.transformOrigin = '';
    wrap.style.height = '';

    if (window.innerWidth > MOBILE_BREAKPOINT) return;

    const blockWidth = block.scrollWidth;
    if (!blockWidth) return;

    const scale = Math.min(1, available / blockWidth);
    if (scale >= 0.999) return;

    block.style.transform = `scale(${scale})`;
    block.style.transformOrigin = 'top center';
    wrap.style.height = `${block.offsetHeight * scale}px`;
  });

  document.querySelectorAll('.month-body-wrap').forEach((wrap) => {
    wrap.style.height = '';
  });

  document.querySelectorAll('.month-content').forEach((content) => {
    if (window.innerWidth > MOBILE_BREAKPOINT) {
      content.style.maxWidth = '';
      return;
    }
    content.style.maxWidth = `${available}px`;
  });
}

function formatDiaryDescription(text) {
  if (!text) return '';

  const brPlaceholder = '\uE000BR\uE000';
  const withPlaceholder = String(text).replace(/<br\s*\/?>/gi, brPlaceholder);
  const escaped = withPlaceholder
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return escaped.split(brPlaceholder).join('<br>');
}

/* ---------- Header ---------- */
function createMonthHeader(dateGroup, description) {
  const header = document.createElement('div');
  header.className = 'month-header';

  header.innerHTML = `
    <div class="month-title">
      <span class="month-label">${dateGroup.label}</span>
    </div>
    <p class="month-description">${formatDiaryDescription(description)}</p>
  `;

  return header;
}

/* ---------- Body ---------- */
function createPersonLabel(text, extraClass = '') {
  const label = document.createElement('p');
  label.className = ['person-label', extraClass].filter(Boolean).join(' ');
  label.textContent = text;
  return label;
}

function createMobileBarLabelsRow(barImage1, barImage2) {
  const row = document.createElement('div');
  row.className = 'month-bar-labels-row';
  row.setAttribute('aria-hidden', 'true');

  const momSlot = document.createElement('div');
  momSlot.className = 'month-bar-label-slot month-bar-label-slot-mom';
  momSlot.style.width = `${barImage1.width}px`;
  momSlot.appendChild(createPersonLabel('母親', 'person-label-bar'));

  const axisSlot = document.createElement('div');
  axisSlot.className = 'month-bar-label-axis';
  axisSlot.style.width = `${BAR_CENTER_AXIS_WIDTH}px`;

  const childSlot = document.createElement('div');
  childSlot.className = 'month-bar-label-slot month-bar-label-slot-child';
  childSlot.style.width = `${barImage2.width}px`;
  childSlot.appendChild(createPersonLabel('子ども', 'person-label-bar'));

  row.appendChild(momSlot);
  row.appendChild(axisSlot);
  row.appendChild(childSlot);

  return row;
}

function createMonthBody(dateGroup, spiralImage1, spiralImage2, barImage1, barImage2) {
  const body = document.createElement('div');
  body.className = 'month-body';

  const momLabel = createPersonLabel('母親', 'person-label-mom');
  const momSpiral = createSpiralOnly('month-visuals-left spiral-mom', spiralImage1);

  const childLabel = createPersonLabel('子ども', 'person-label-child');
  const childSpiral = createSpiralOnly('month-visuals-right spiral-child', spiralImage2);

  const barsWrap = document.createElement('div');
  barsWrap.className = 'month-bars-wrap';

  const barsBlock = document.createElement('div');
  barsBlock.className = 'month-bars-block';
  barsBlock.appendChild(createMobileBarLabelsRow(barImage1, barImage2));
  barsBlock.appendChild(createBarCluster(dateGroup, barImage1, barImage2));

  barsWrap.appendChild(barsBlock);

  body.appendChild(momLabel);
  body.appendChild(momSpiral);
  body.appendChild(childLabel);
  body.appendChild(childSpiral);
  body.appendChild(barsWrap);

  return body;
}

function createSpiralOnly(containerClass, spiralImage) {
  const container = document.createElement('div');
  container.className = containerClass;

  const img = document.createElement('img');
  img.src = spiralImage.src;
  img.className = spiralImage.className;
  img.alt = spiralImage.alt;
  applyImageSize(img, spiralImage.width, spiralImage.height);

  container.appendChild(img);
  return container;
}

function createBarCluster(dateGroup, barImage1, barImage2) {
  const cluster = document.createElement('div');
  cluster.className = 'month-bar-cluster';

  cluster.appendChild(createBarChartColumn(barImage1));
  cluster.appendChild(createBarCenterAxis(
    dateGroup.phase,
    barImage1.height,
    dateGroup.periodDayCount
  ));
  cluster.appendChild(createBarChartColumn(barImage2));

  return cluster;
}

function createBarChartColumn(barImage) {
  const column = document.createElement('div');
  column.className = 'bar-chart-column';

  column.appendChild(createBarImage(barImage));

  const unit = document.createElement('span');
  unit.className = 'bar-axis-unit';
  unit.textContent = '時間';
  unit.setAttribute('aria-hidden', 'true');
  column.appendChild(unit);

  return column;
}

function createBarImage(barImage) {
  const img = document.createElement('img');
  img.src = barImage.src;
  img.className = barImage.className;
  img.alt = barImage.alt;
  applyImageSize(img, barImage.width, barImage.height);
  return img;
}

function createBarCenterAxis(phase, barHeight, fixedDayCount) {
  const axis = document.createElement('div');
  axis.className = 'bar-center-axis';
  axis.style.height = `${barHeight}px`;
  axis.style.width = `${BAR_CENTER_AXIS_WIDTH}px`;

  const { rowCenterY, axisHeight } = computeBarRowLayout({
    height: barHeight,
    fixedDayCount,
  });

  const chartArea = document.createElement('div');
  chartArea.className = 'bar-center-axis-chart';
  chartArea.style.height = `${barHeight - axisHeight}px`;

  for (const day of getDayTicksForPhase(phase)) {
    const label = document.createElement('span');
    label.className = 'bar-day-tick';
    label.textContent = `${day}日`;
    label.style.top = `${rowCenterY(day - 1)}px`;
    chartArea.appendChild(label);
  }

  axis.appendChild(chartArea);

  return axis;
}

function applyImageSize(img, width, height) {
  img.style.width = `${width}px`;
  img.style.height = `${height}px`;
}
