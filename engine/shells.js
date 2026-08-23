/* Scene shells.

   A scene is not a page: it is the inside of the thing you just clicked. The
   laptop gets a bezel and a desktop you navigate with icons, the paper tray
   gets a desk surface, the pinboard gets cork. The documents and interactions
   inside are unchanged — this only decides how they are framed. */

import { el, append, clear, announce } from './dom.js';

function frame(main, scene, kind) {
  const body = el('div', { class: 'shell__body stack' });
  const node = el('div', { class: `shell shell--${kind}` }, [
    el('div', { class: 'shell__screen' }, body),
  ]);
  append(main, node);
  return { node, body };
}

/* The laptop while it is still locked: the bezel, but no icon bar — there is
   nothing to browse yet, only the pad. */
function lockedLaptopShell(main, scene, ctx) {
  const stage = el('div', { class: 'os__stage os__stage--locked' });
  const chrome = el('div', { class: 'os os--locked' }, [
    el('div', { class: 'os__title' }, [
      el('span', { class: 'os__dot', 'aria-hidden': 'true' }),
      el('span', { text: scene.shellTitle || 'Sam’s laptop' }),
    ]),
    stage,
  ]);
  const shell = el('div', { class: 'shell shell--laptop' }, [
    el('div', { class: 'shell__screen' }, chrome),
    el('div', { class: 'shell__base', 'aria-hidden': 'true' }),
  ]);
  append(main, shell);
  return { add(id, label, node) { append(stage, node); }, show() {} };
}

/* The laptop: an icon bar and one window at a time. */
function laptopShell(main, scene, ctx) {
  const bar = el('div', { class: 'os__bar', role: 'tablist', 'aria-label': scene.shellLabel || 'Open on the laptop' });
  const stage = el('div', { class: 'os__stage' });
  /* The lock stays on screen under whatever window is open: you should be able
     to read the count and type the figure without switching away from it. */
  const pinned = el('div', { class: 'os__pinned' });
  const chrome = el('div', { class: 'os' }, [
    el('div', { class: 'os__title' }, [
      el('span', { class: 'os__dot', 'aria-hidden': 'true' }),
      el('span', { text: scene.shellTitle || 'Sam’s laptop' }),
    ]),
    bar,
    stage,
    pinned,
  ]);
  const shell = el('div', { class: 'shell shell--laptop' }, [
    el('div', { class: 'shell__screen' }, chrome),
    el('div', { class: 'shell__base', 'aria-hidden': 'true' }),
  ]);
  append(main, shell);

  const panels = [];

  function show(id) {
    panels.forEach((panel) => {
      const on = panel.id === id;
      panel.node.hidden = !on;
      panel.tab.setAttribute('aria-selected', on ? 'true' : 'false');
      panel.tab.tabIndex = on ? 0 : -1;
      if (on) {
        announce(`${panel.label} open.`);
        /* Anything that measures itself — a canvas, a chart — was zero-width
           while it was hidden and needs telling that it is on screen now. */
        ctx.bus.emit('panel-shown', { id });
      }
    });
  }

  function add(id, label, node, options) {
    const config = options || {};
    if (config.pin) {
      append(pinned, node);
      return;
    }
    const panel = el('div', {
      class: 'os__panel', id: `os-panel-${id}`, role: 'tabpanel',
      'aria-labelledby': `os-icon-${id}`, hidden: true,
    }, node);
    const tab = el('button', {
      type: 'button', class: 'os__icon', role: 'tab', id: `os-icon-${id}`,
      'aria-controls': `os-panel-${id}`, 'aria-selected': 'false', tabIndex: -1,
      'data-kind': config.kind || 'file',
    }, [
      el('span', { class: 'os__glyph', 'aria-hidden': 'true' }),
      el('span', { class: 'os__name', text: label }),
    ]);
    if (config.route) {
      tab.setAttribute('role', 'link');
      tab.removeAttribute('aria-controls');
      tab.tabIndex = 0;
      tab.addEventListener('click', () => ctx.router.go(config.route));
      append(bar, tab);
      return;
    }
    tab.addEventListener('click', () => show(id));
    append(bar, tab);
    append(stage, panel);
    panels.push({ id, label, node: panel, tab });
    if (config.open || panels.length === 1) show(id);
  }

  bar.addEventListener('keydown', (event) => {
    const tabs = Array.from(bar.querySelectorAll('[role="tab"], [role="link"]'));
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (next === null) return;
    event.preventDefault();
    tabs[next].focus();
  });

  return { add, show };
}

export function createShell(main, scene, ctx, opts) {
  const locked = Boolean(opts && opts.locked);
  if (scene.shell === 'laptop') return locked ? lockedLaptopShell(main, scene, ctx) : laptopShell(main, scene, ctx);
  if (!scene.shell) return null;
  const { body } = frame(main, scene, scene.shell);
  return {
    add(id, label, node) { append(body, node); },
    show() {},
  };
}
