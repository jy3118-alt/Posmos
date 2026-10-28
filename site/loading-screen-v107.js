// Shared by the early loading screen and the world entry. Transform animation
// runs on the compositor, including while the main thread prepares 3D assets.
const root = document.querySelector('#loading');
const fill = document.querySelector('#loading-fill');
const progress = document.querySelector('#loading-progress');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motion, fade, phase = -1, closed = false, completion;

function currentValue() {
  const transform = getComputedStyle(fill).transform;
  return transform === 'none' ? 0 : Math.max(0, Math.min(1, new DOMMatrixReadOnly(transform).a));
}

function freeze() {
  const value = currentValue();
  fill.style.transform = `scaleX(${value})`;
  motion?.cancel();
  return value;
}

function advance(value) {
  if (closed || !root || value <= phase || value >= 1) return;
  phase = value;
  const from = freeze();
  // Preparation stages, not a byte percentage. Slow estimated travel stays
  // below the next completed stage; only finish() can reach 100%.
  const ceiling = value < .03 ? .025 : value < .60 ? .58 : value < .86 ? .84 : .97;
  const duration = value < .03 ? 8000 : value < .60 ? 24000 : value < .86 ? 18000 : 12000;
  const reached = Math.max(from, value);
  progress.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  if (reducedMotion.matches) {
    fill.style.transform = `scaleX(${reached})`;
    return;
  }
  motion = fill.animate([
    {transform: `scaleX(${from})`, offset: 0, easing: 'ease-out'},
    {transform: `scaleX(${reached})`, offset: .045, easing: 'cubic-bezier(.15,.5,.4,1)'},
    {transform: `scaleX(${Math.max(reached, ceiling)})`, offset: 1},
  ], {duration, fill: 'forwards'});
}

async function finish() {
  if (closed || !root) return;
  closed = true;
  const from = freeze();
  progress.setAttribute('aria-valuenow', '100');
  try {
    if (!reducedMotion.matches) {
      motion = fill.animate([{transform: `scaleX(${from})`}, {transform: 'scaleX(1)'}],
        {duration: 240, easing: 'ease-out', fill: 'forwards'});
      await motion.finished;
    }
    fill.style.transform = 'scaleX(1)';
    root.setAttribute('aria-busy', 'false');
    if (!reducedMotion.matches) {
      fade = root.animate([{opacity: 1}, {opacity: 0}], {duration: 160, fill: 'forwards'});
      await fade.finished;
    }
    root.remove();
  } catch { /* A load failure keeps the screen and the existing retry notice. */ }
  finally { motion?.cancel(); fade?.cancel(); }
}

function fail() {
  closed = true;
  if (root?.isConnected) { freeze(); fade?.cancel(); root.setAttribute('aria-busy', 'false'); }
}

export const loadingScreen = {
  advance,
  finish: () => completion ||= finish(),
  fail,
};
advance(0);
