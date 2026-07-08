// ui.js
// UI専用モジュール（状態は持たない）

function hexToRgb(hex) {
  const value = hex.startsWith('#') ? hex.slice(1) : hex;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function readP5Color(p5, hex) {
  const [r, g, b] = hexToRgb(hex);
  return p5.color(r, g, b);
}

export function createUI({
  minDateFromData,
  maxDateFromData,
  pregnancyStartDate,
  birthDate,
  onUpdateVisualization,
  onGenerateAllDates,
  devMode = false
}) {
  const toggleButton = document.querySelector('#toggle-button');
  const controlsPanel = document.querySelector('#controls');

  const startDatePicker = document.querySelector('#startDatePicker');
  const endDatePicker = document.querySelector('#endDatePicker');
  const applyDateRangeButton = document.querySelector('#applyDateRangeButton');
  const pregnancyStartDatePicker = document.querySelector('#pregnancyStartDatePicker');
  const childBirthDatePicker = document.querySelector('#childBirthDatePicker');

  const baseRadiusSlider = document.querySelector('#baseRadiusSlider');
  const baseRadiusValue = document.querySelector('#baseRadiusValue');

  const ringSpacingSlider = document.querySelector('#ringSpacingSlider');
  const ringSpacingValue = document.querySelector('#ringSpacingValue');

  const sleepLineWeightSlider = document.querySelector('#sleepLineWeightSlider');
  const sleepLineWeightValue = document.querySelector('#sleepLineWeightValue');

  const sleepGradientMinPicker = document.querySelector('#sleepGradientMinPicker');
  const sleepGradientMinAlphaSlider = document.querySelector('#sleepGradientMinAlphaSlider');
  const sleepGradientMinAlphaValue = document.querySelector('#sleepGradientMinAlphaValue');
  const sleepGradientMaxPicker = document.querySelector('#sleepGradientMaxPicker');
  const sleepGradientMaxAlphaSlider = document.querySelector('#sleepGradientMaxAlphaSlider');
  const sleepGradientMaxAlphaValue = document.querySelector('#sleepGradientMaxAlphaValue');
  const sleepGradientMaxHoursSlider = document.querySelector('#sleepGradientMaxHoursSlider');
  const sleepGradientMaxHoursValue = document.querySelector('#sleepGradientMaxHoursValue');

  const textColorPicker = document.querySelector('#textColorPicker');

  const emptyRecordColorPicker = document.querySelector('#emptyRecordColorPicker');
  const emptyRecordAlphaSlider = document.querySelector('#emptyRecordAlphaSlider');
  const emptyRecordAlphaValue = document.querySelector('#emptyRecordAlphaValue');

  if (minDateFromData && maxDateFromData) {
    startDatePicker.value = minDateFromData;
    endDatePicker.value = maxDateFromData;
  }

  if (devMode) {
    if (pregnancyStartDate) {
      pregnancyStartDatePicker.value = pregnancyStartDate;
    }
    if (birthDate) {
      childBirthDatePicker.value = birthDate;
    }
  }

  const visualizationInputs = [
    baseRadiusSlider,
    ringSpacingSlider,
    sleepLineWeightSlider,
    sleepGradientMinPicker,
    sleepGradientMinAlphaSlider,
    sleepGradientMaxPicker,
    sleepGradientMaxAlphaSlider,
    sleepGradientMaxHoursSlider,
    textColorPicker,
    emptyRecordColorPicker,
    emptyRecordAlphaSlider,
  ];

  if (devMode && toggleButton && controlsPanel) {
    toggleButton.addEventListener('click', () => {
      controlsPanel.classList.toggle('open');
      toggleButton.textContent =
        controlsPanel.classList.contains('open')
          ? '設定パネルを閉じる'
          : '設定パネルを開く';
    });

    applyDateRangeButton.addEventListener('click', onGenerateAllDates);
    childBirthDatePicker.addEventListener('input', onGenerateAllDates);

    [
      startDatePicker,
      endDatePicker,
      ...visualizationInputs,
    ].forEach(el => el.addEventListener('input', onUpdateVisualization));
  }

  function readThemeFromUI() {
    const emptyRgb = hexToRgb(emptyRecordColorPicker.value);
    const emptyAlpha = parseInt(emptyRecordAlphaSlider.value, 10);

    return {
      bgColor: 'transparent',
      sleepGradient: {
        min: [
          ...hexToRgb(sleepGradientMinPicker.value),
          parseInt(sleepGradientMinAlphaSlider.value, 10),
        ],
        max: [
          ...hexToRgb(sleepGradientMaxPicker.value),
          parseInt(sleepGradientMaxAlphaSlider.value, 10),
        ],
        maxHours: parseFloat(sleepGradientMaxHoursSlider.value) || 7,
      },
      emptyRing: [...emptyRgb, emptyAlpha],
      emptyBar: [...emptyRgb, emptyAlpha],
    };
  }

  function readUIState(p5) {
    const BASE_RADIUS = parseInt(baseRadiusSlider.value, 10);
    const RING_SPACING = parseInt(ringSpacingSlider.value, 10);
    const SLEEP_LINE_WEIGHT = parseInt(sleepLineWeightSlider.value, 10);

    const TEXT_COLOR = readP5Color(p5, textColorPicker.value);

    baseRadiusValue.textContent = BASE_RADIUS;
    ringSpacingValue.textContent = RING_SPACING;
    sleepLineWeightValue.textContent = SLEEP_LINE_WEIGHT;
    sleepGradientMaxHoursValue.textContent = sleepGradientMaxHoursSlider.value;
    sleepGradientMinAlphaValue.textContent = sleepGradientMinAlphaSlider.value;
    sleepGradientMaxAlphaValue.textContent = sleepGradientMaxAlphaSlider.value;
    emptyRecordAlphaValue.textContent = emptyRecordAlphaSlider.value;

    return {
      BASE_RADIUS,
      RING_SPACING,
      SLEEP_LINE_WEIGHT,
      TEXT_COLOR,
      theme: readThemeFromUI(),
      startDate: startDatePicker.value,
      endDate: endDatePicker.value,
      childBirthDate: childBirthDatePicker.value,
    };
  }

  return {
    readUIState,
    readThemeFromUI,
  };
}
