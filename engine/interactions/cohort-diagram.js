/* Cohort diagram — a neutral instrument.

   It draws the registered population, lets the player select cohorts on any
   dimension, and reports how many people are in the selection. That is all it
   does. There is no invitation overlay, no flag, no hint that one dimension
   matters more than another: every tab returns a real number and nothing on
   screen says which number is the one. The tool quantifies; only the lock
   judges.

   The field is drawn on canvas at roughly one dot per fifty people, so the
   whole population is on screen without fifty thousand DOM nodes. */

import { el, append, announce, formatNumber, reducedMotion } from '../dom.js';

const COLUMNS = 32;
const ROWS = 32;
const DOTS = COLUMNS * ROWS;

/* Largest-remainder allocation so the dots for a dimension add up exactly. */
function allocate(options, total, dots) {
  const exact = options.map((option) => (option.count / total) * dots);
  const base = exact.map(Math.floor);
  let used = base.reduce((sum, value) => sum + value, 0);
  const order = exact
    .map((value, index) => ({ index, rem: value - base[index] }))
    .sort((a, b) => b.rem - a.rem);
  let i = 0;
  while (used < dots) {
    base[order[i % order.length].index] += 1;
    used += 1;
    i += 1;
  }
  const assignment = [];
  options.forEach((option, index) => {
    for (let n = 0; n < base[index]; n += 1) assignment.push(option.id);
  });
  return assignment;
}

/* A fixed shuffle keeps each dimension's cohorts spread across the field
   rather than banded, so no layout implies an ordering. Seeded, so the field
   looks the same on every refresh. */
function shuffled(list, seed) {
  const out = list.slice();
  let state = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = state % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function mount(host, config, ctx) {
  const total = config.population.total;
  const maps = {};
  config.dimensions.forEach((dimension, index) => {
    maps[dimension.id] = shuffled(allocate(dimension.options, total, DOTS), 97 + index * 31);
  });

  let activeId = config.dimensions[0].id;
  let selected = new Set();

  host.classList.add('card', 'cohort');
  append(host, el('h3', { text: config.title }));
  append(host, el('p', { class: 'scene__sub', text: config.instruction }));

  /* ---- tabs ---- */

  const tablist = el('div', { class: 'tabs', role: 'tablist', 'aria-label': config.tabsLabel });
  const panel = el('div', {
    class: 'cohort__panel', role: 'tabpanel', id: 'cohort-panel', tabindex: '0',
  });
  const tabs = config.dimensions.map((dimension) => {
    const tab = el('button', {
      type: 'button',
      class: 'tab',
      role: 'tab',
      id: `tab-${dimension.id}`,
      'aria-selected': dimension.id === activeId ? 'true' : 'false',
      'aria-controls': 'cohort-panel',
      tabindex: dimension.id === activeId ? '0' : '-1',
      text: dimension.label,
    });
    tab.addEventListener('click', () => setDimension(dimension.id));
    append(tablist, tab);
    return tab;
  });
  tablist.addEventListener('keydown', (event) => {
    const index = config.dimensions.findIndex((d) => d.id === activeId);
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % config.dimensions.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + config.dimensions.length) % config.dimensions.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = config.dimensions.length - 1;
    if (next === null) return;
    event.preventDefault();
    setDimension(config.dimensions[next].id);
    tabs[next].focus();
  });
  append(host, tablist);

  /* ---- field and count ---- */

  const canvas = el('canvas', {
    class: 'cohort__canvas',
    role: 'img',
    'aria-label': `${config.population.label}: ${formatNumber(total)} people.`,
  });
  const countValue = el('p', { class: 'cohort__count', text: '0' });
  const countLabel = el('p', { class: 'cohort__count-label', text: config.countLabel });
  const countShare = el('p', { class: 'cohort__share', text: '' });
  const liveCount = el('p', {
    class: 'visually-hidden', role: 'status', 'aria-live': 'polite', 'aria-atomic': 'true',
  });

  const side = el('aside', { class: 'cohort__side' }, [
    countLabel, countValue, countShare,
    el('p', { class: 'cohort__total', text: `${config.population.label}: ${formatNumber(total)}` }),
    liveCount,
  ]);

  append(host, el('div', { class: 'cohort__layout' }, [
    el('div', {}, [el('div', { class: 'cohort__field' }, canvas), panel]),
    side,
  ]));

  /* ---- painting ---- */

  const ctx2d = canvas.getContext('2d');
  let dimmed = new Set();

  function palette() {
    const styles = getComputedStyle(document.documentElement);
    return {
      base: styles.getPropertyValue('--muted').trim() || '#A9AEBA',
      on: styles.getPropertyValue('--uv').trim() || '#8B5CF6',
      out: '#3A3F4B',
    };
  }

  function paint() {
    const ratio = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 600;
    const height = Math.round(width * (ROWS / COLUMNS));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.height = `${height}px`;
    ctx2d.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx2d.clearRect(0, 0, width, height);

    const cell = width / COLUMNS;
    const radius = Math.max(1.4, cell * 0.29);
    const colours = palette();
    const map = maps[activeId];
    const dimMap = maps[config.dimUsing ? config.dimUsing.dimension : activeId];

    for (let i = 0; i < DOTS; i += 1) {
      const col = i % COLUMNS;
      const row = Math.floor(i / COLUMNS);
      const cx = (col + 0.5) * cell;
      const cy = (row + 0.5) * cell;
      const isOut = dimmed.size > 0 && dimmed.has(dimMap[i]);
      const isOn = selected.has(map[i]);
      ctx2d.beginPath();
      ctx2d.arc(cx, cy, radius, 0, Math.PI * 2);
      if (isOut) {
        ctx2d.fillStyle = colours.out;
        ctx2d.globalAlpha = 0.55;
      } else if (isOn) {
        ctx2d.fillStyle = colours.on;
        ctx2d.globalAlpha = 1;
      } else {
        ctx2d.fillStyle = colours.base;
        ctx2d.globalAlpha = 0.42;
      }
      ctx2d.fill();
    }
    ctx2d.globalAlpha = 1;
  }

  /* ---- selection ---- */

  function currentDimension() {
    return config.dimensions.find((d) => d.id === activeId);
  }

  function selectionCount() {
    return currentDimension().options
      .filter((option) => selected.has(option.id))
      .reduce((sum, option) => sum + option.count, 0);
  }

  function updateCount() {
    const count = selectionCount();
    const names = currentDimension().options
      .filter((option) => selected.has(option.id))
      .map((option) => option.label);
    countValue.textContent = formatNumber(count);
    countShare.textContent = count
      ? `${((count / total) * 100).toFixed(1)}% of registered users`
      : config.emptyLabel;
    canvas.setAttribute('aria-label', count
      ? `${formatNumber(count)} of ${formatNumber(total)} registered users selected: ${names.join(', ')}.`
      : `${config.population.label}: ${formatNumber(total)} people. Nothing selected.`);
    liveCount.textContent = count
      ? `${formatNumber(count)} people selected. ${names.join(', ')}.`
      : 'Selection cleared.';
    ctx.store.set('cohort', { dimension: activeId, options: Array.from(selected) });
  }

  function renderOptions() {
    panel.textContent = '';
    const dimension = currentDimension();
    panel.setAttribute('aria-labelledby', `tab-${dimension.id}`);
    const group = el('div', { class: 'cohort__options', role: 'group', 'aria-label': `${dimension.label} cohorts` });
    dimension.options.forEach((option) => {
      const id = `opt-${dimension.id}-${option.id}`;
      const box = el('input', { type: 'checkbox', id, checked: selected.has(option.id) });
      box.addEventListener('change', () => {
        if (box.checked) selected.add(option.id); else selected.delete(option.id);
        ctx.progress();
        updateCount();
        paint();
      });
      append(group, el('div', { class: 'cohort__option' }, [
        box,
        el('label', { for: id }, [
          el('span', { class: 'cohort__option-label', text: option.label }),
          el('span', { class: 'cohort__option-count', text: formatNumber(option.count) }),
        ]),
      ]));
    });
    append(panel, group);
    append(panel, el('button', {
      type: 'button',
      class: 'btn btn--quiet',
      text: config.clearLabel,
      onClick: () => { selected.clear(); renderOptions(); updateCount(); paint(); },
    }));
  }

  function setDimension(id) {
    activeId = id;
    selected = new Set();
    tabs.forEach((tab, index) => {
      const on = config.dimensions[index].id === id;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    renderOptions();
    updateCount();
    paint();
    ctx.progress();
  }

  /* The payoff: once the lock accepts the figure, the cohort the invitation
     could never reach goes dark across the whole field. Not before. */
  function applyDimming() {
    if (!config.dimUsing) return;
    dimmed = new Set(config.dimUsing.options);
    paint();
  }

  if (ctx.store.get('progress', {})[config.track] === true) {
    applyDimming();
  }
  ctx.bus.on('solved', (event) => {
    if (event.track !== config.track) return;
    applyDimming();
    announce(config.dimUsing && config.dimUsing.announce ? config.dimUsing.announce : '');
  });

  renderOptions();
  updateCount();
  window.requestAnimationFrame(paint);
  const onResize = () => paint();
  window.addEventListener('resize', onResize);
  ctx.bus.on('panel-shown', () => window.requestAnimationFrame(paint));
  /* Belt and braces: the canvas may be measured at zero width inside a closed
     window, so repaint whenever it actually gets a size. */
  let observer = null;
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(() => paint());
    observer.observe(canvas);
  }

  if (reducedMotion()) canvas.classList.add('cohort__canvas--still');

  return {
    unmount() {
      window.removeEventListener('resize', onResize);
      if (observer) observer.disconnect();
    },
  };
}
