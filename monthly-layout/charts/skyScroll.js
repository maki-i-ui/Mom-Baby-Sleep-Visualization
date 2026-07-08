import { getPregnancySky, skyToLayerGradient } from './skyPalette.js';

const FOCUS_RATIO = 0.42;

function ensureSkyLayer() {
  let layer = document.getElementById('sky-layer');

  if (!layer) {
    layer = document.createElement('div');
    layer.id = 'sky-layer';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = `
      <div id="sky-layer-current" class="sky-layer-pane"></div>
      <div id="sky-layer-next" class="sky-layer-pane"></div>
    `;
    document.body.prepend(layer);
  }

  return {
    current: document.getElementById('sky-layer-current'),
    next: document.getElementById('sky-layer-next'),
  };
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function getElementCenterY(element) {
  const rect = element.getBoundingClientRect();
  return rect.top + rect.height / 2;
}

function findScrollBlend(anchors) {
  if (!anchors.length) {
    const sky = getPregnancySky(0);
    return { current: sky, next: sky, t: 0 };
  }

  const focusY = window.innerHeight * FOCUS_RATIO;
  let bestIndex = 0;
  let bestDistance = Infinity;

  anchors.forEach((anchor, index) => {
    const distance = Math.abs(getElementCenterY(anchor.el) - focusY);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  const currentAnchor = anchors[bestIndex];
  const nextIndex = Math.min(bestIndex + 1, anchors.length - 1);
  const nextAnchor = anchors[nextIndex];

  if (nextIndex === bestIndex) {
    return { current: currentAnchor.sky, next: nextAnchor.sky, t: 0 };
  }

  const currentCenter = getElementCenterY(currentAnchor.el);
  const nextCenter = getElementCenterY(nextAnchor.el);
  const t = clamp01((focusY - currentCenter) / Math.max(nextCenter - currentCenter, 1));

  return {
    current: currentAnchor.sky,
    next: nextAnchor.sky,
    t,
  };
}

let cleanupScrollSky = null;

export function initScrollSky(anchors) {
  if (cleanupScrollSky) {
    cleanupScrollSky();
    cleanupScrollSky = null;
  }

  const layers = ensureSkyLayer();
  const visibleAnchors = anchors.filter((anchor) => anchor.el);

  const update = () => {
    const { current, next, t } = findScrollBlend(visibleAnchors);
    layers.current.style.background = skyToLayerGradient(current);
    layers.next.style.background = skyToLayerGradient(next);
    layers.next.style.opacity = String(t);
  };

  let rafId = null;
  const scheduleUpdate = () => {
    if (rafId !== null) return;
    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      update();
    });
  };

  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  update();

  cleanupScrollSky = () => {
    window.removeEventListener('scroll', scheduleUpdate);
    window.removeEventListener('resize', scheduleUpdate);
    if (rafId !== null) {
      window.cancelAnimationFrame(rafId);
    }
  };
}
