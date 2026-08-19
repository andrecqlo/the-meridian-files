/* Scene loader and renderer. Everything here is driven by content JSON: the
   engine knows about documents, annotations and interaction slots, and nothing
   about Case 01 in particular. */

import { el, append, clear, icon, announce, focusFirst, formatNumber } from './dom.js';
import { load as loadInteraction } from './registry.js';

/* ---------- documents ---------- */

function renderBlock(block) {
  if (block.p && block.highlight) {
    /* The one pre-marked passage in the game: Sam's highlighter, already on
       the page. It marks where to start digging, never the answer. */
    const node = el('p');
    const at = block.p.indexOf(block.highlight);
    if (at < 0) return el('p', { text: block.p });
    append(node, block.p.slice(0, at));
    append(node, el('mark', { class: 'hl', text: block.highlight }));
    append(node, block.p.slice(at + block.highlight.length));
    return node;
  }
  if (block.p) return el('p', { text: block.p });
  if (block.signature) return el('p', { class: 'doc__signature', text: block.signature });
  if (block.table) {
    const table = el('table', { class: 'doc__table' });
    if (block.table.head) {
      append(table, el('thead', {}, el('tr', {}, block.table.head.map((cell) => el('th', { scope: 'col', text: cell })))));
    }
    append(table, el('tbody', {}, block.table.rows.map((cells) => el('tr', {},
      cells.map((cell, index) => el(index === 0 ? 'th' : 'td', index === 0 ? { scope: 'row', text: cell } : { text: cell }))))));
    return table;
  }
  if (block.small) return el('p', { class: 'doc__small', text: block.small });
  if (block.mono) return el('p', { class: 'doc__meta', text: block.mono });
  if (block.quote) return el('blockquote', { class: 'tally-item__quote', text: block.quote });
  if (block.list) {
    return el('ul', {}, block.list.map((item) => el('li', { text: item })));
  }
  if (block.stats) {
    return el('div', { class: 'stats' }, block.stats.map((stat) => el('div', { class: 'stat' }, [
      el('span', { class: 'stat__value', text: stat.value }),
      el('span', { class: 'stat__label', text: stat.label }),
    ])));
  }
  return el('p', { text: String(block) });
}

export function renderDocument(doc, ctx) {
  const node = el('article', {
    class: `doc doc--${doc.kind || 'paper'}`,
    'data-doc-id': doc.id,
  });

  if (doc.stamp) {
    node.dataset.stamped = '1';
    append(node, el('span', { class: 'doc__stamp', text: doc.stamp }));
  }
  append(node, el('h3', { class: 'doc__title', text: doc.title }));
  if (doc.meta) append(node, el('p', { class: 'doc__meta', text: doc.meta }));

  const body = el('div', { class: 'doc__body' });
  const annotations = doc.annotations || [];
  (doc.blocks || []).forEach((block, index) => {
    append(body, renderBlock(block));
    annotations
      .filter((note) => Number(note.after) === index)
      .forEach((note) => append(body, renderAnnotation(note)));
  });
  annotations
    .filter((note) => note.after === undefined || Number(note.after) >= (doc.blocks || []).length)
    .forEach((note) => append(body, renderAnnotation(note)));

  append(node, body);

  if (annotations.length) {
    node.classList.add('doc--has-notes');
    append(node, el('span', { class: 'uv-flicker' }));
    if (ctx.torch.held) append(node, inspectButton(node, ctx));
  }

  if (doc.collapsed) {
    const details = el('details', {}, [
      el('summary', { text: doc.openLabel || doc.title }),
    ]);
    details.addEventListener('toggle', () => {
      if (details.open) ctx.progress();
      ctx.torch.refresh();
    });
    append(details, node);
    return el('div', { class: 'doc', 'data-wrapper': doc.id }, details);
  }

  return node;
}

function renderAnnotation(note) {
  return el('span', {
    class: 'uv-note',
    'data-note-id': note.id,
    'data-lit': '0',
    'data-inspect': '0',
    'data-reveals': note.reveals || '',
    text: note.text,
  });
}

function inspectButton(docNode, ctx) {
  const button = el('button', {
    type: 'button',
    class: 'doc__inspect',
    'aria-pressed': 'false',
    text: ctx.content.torch.inspectOn,
  });
  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-pressed') !== 'true';
    button.setAttribute('aria-pressed', next ? 'true' : 'false');
    button.textContent = next ? ctx.content.torch.inspectOff : ctx.content.torch.inspectOn;
    ctx.torch.inspect(docNode, next);
    if (next) ctx.progress();
  });
  return button;
}

/* ---------- scene chrome ---------- */

function sceneHead(eyebrow, title, subtitle) {
  return el('header', { class: 'scene__head' }, [
    eyebrow ? el('p', { class: 'scene__eyebrow', text: eyebrow }) : null,
    el('h1', { text: title, 'data-autofocus': true, tabindex: '-1' }),
    subtitle ? el('p', { class: 'scene__sub', text: subtitle }) : null,
  ]);
}

/* ---------- landing ---------- */

export function renderLanding(main, ctx) {
  const started = ctx.timer.isStarted();
  const wrap = el('div', { class: 'landing' });

  append(wrap, el('p', { class: 'landing__brand', text: 'The Meridian Files' }));
  append(wrap, el('h1', { text: 'Case 01: The Evidence', 'data-autofocus': true, tabindex: '-1' }));
  append(wrap, el('p', { class: 'landing__meta', text: 'An investigation game for teams. 15 minutes. One screen.' }));

  const actions = el('div', { class: 'landing__actions' });
  append(actions, el('button', {
    type: 'button',
    class: 'btn btn--primary',
    text: started ? 'Resume the case' : 'Begin',
    onClick: () => ctx.router.go(started ? ctx.store.get('lastRoute', 'case01/desk') : 'case01'),
  }));
  append(actions, el('button', {
    type: 'button',
    class: 'btn',
    id: 'landing-sound',
    'aria-pressed': ctx.audio.enabled ? 'true' : 'false',
    text: ctx.audio.enabled ? 'Sound on' : 'Sound off',
    onClick: (event) => {
      const on = ctx.audio.toggle();
      event.currentTarget.textContent = on ? 'Sound on' : 'Sound off';
      event.currentTarget.setAttribute('aria-pressed', on ? 'true' : 'false');
      ctx.syncSound();
    },
  }));
  append(actions, el('button', {
    type: 'button',
    class: 'btn btn--quiet btn--danger',
    text: 'Reset case',
    onClick: () => {
      if (!window.confirm('Reset Case 01? Progress, timer and findings will be cleared.')) return;
      ctx.resetCase();
    },
  }));
  append(wrap, actions);

  const dossiers = el('div', { class: 'dossiers' });
  ctx.series.forEach((entry) => {
    const open = entry.locked !== true;
    const node = el(open ? 'button' : 'div', {
      class: `dossier ${open ? 'dossier--open' : 'dossier--sealed'}`,
      type: open ? 'button' : null,
      'aria-disabled': open ? null : 'true',
    }, [
      el('span', { class: 'dossier__no', text: entry.number }),
      el('span', {}, [
        el('p', { class: 'dossier__title', text: entry.title }),
        el('p', { class: 'dossier__teaser', text: entry.teaser }),
      ]),
      el('span', { class: `tag ${open ? 'tag--uv' : ''}`, text: open ? 'Open' : 'Sealed' }),
    ]);
    if (open) node.addEventListener('click', () => ctx.router.go(started ? ctx.store.get('lastRoute', 'case01/desk') : 'case01'));
    append(dossiers, node);
  });
  append(wrap, dossiers);

  append(main, wrap);
}

/* ---------- intro ---------- */

export function renderIntro(main, ctx) {
  const intro = ctx.content.intro;
  const wrap = el('div', { class: 'landing' });
  append(wrap, el('p', { class: 'landing__brand', text: 'The Meridian Files' }));
  append(wrap, el('h1', { text: intro.heading, 'data-autofocus': true, tabindex: '-1' }));
  const body = el('div', { class: 'stack stack--tight' });
  intro.lines.forEach((line) => append(body, el('p', { text: line, style: 'font-size:1.05em;margin:0' })));
  append(wrap, body);
  append(wrap, el('p', { class: 'landing__meta', style: 'margin-top:28px', text: intro.timerNote }));
  append(wrap, el('button', {
    type: 'button',
    class: 'btn btn--primary',
    text: intro.cta,
    onClick: () => {
      ctx.timer.start();
      ctx.audio.wake();
      ctx.router.go('case01/desk');
    },
  }));
  append(main, wrap);
}

/* ---------- desk hub ---------- */

export function renderDesk(main, ctx) {
  const desk = ctx.content.desk;
  const progress = ctx.store.get('progress', {});
  append(main, sceneHead('Case 01 · The Evidence', desk.title, desk.subtitle));

  const grid = el('div', { class: 'desk' });

  desk.objects.forEach((object) => {
    const done = progress[object.track] === true;
    const node = el('button', {
      type: 'button',
      class: 'desk-object',
      'data-done': done ? '1' : '0',
      onClick: () => ctx.router.go(object.route),
    }, [
      icon(object.icon),
      el('p', { class: 'desk-object__label', text: object.label }),
      el('p', { class: 'desk-object__caption', text: object.caption }),
      el('span', {
        class: `tag ${done ? 'tag--ok' : ''}`,
        text: done ? 'Read' : 'Unread',
        'data-role': 'state',
      }),
    ]);
    node.querySelector('[data-role="state"]').classList.add('desk-object__state');
    append(grid, node);
  });

  /* The locked file: three word slots, stamped as each challenge lands. */
  const stamped = desk.file.slots.map((slot) => ({
    word: ctx.decode(slot.word),
    filled: progress[slot.track] === true,
  }));
  const allStamped = stamped.every((slot) => slot.filled);
  const fileNode = el('button', {
    type: 'button',
    class: 'desk-file',
    onClick: () => ctx.router.go(desk.file.route),
  }, [
    el('p', { class: 'desk-file__name', text: desk.file.name }),
    el('div', { class: 'slots' }, stamped.map((slot) => el('span', {
      class: 'slot',
      'data-filled': slot.filled ? '1' : '0',
      text: slot.filled ? slot.word : '— — —',
    }))),
    el('p', { class: 'desk-file__caption', text: allStamped ? desk.file.ready : desk.file.locked }),
  ]);
  append(grid, fileNode);

  /* The drawer, and the torch inside it. */
  const torchHeld = ctx.torch.held;
  const drawer = el('div', { class: 'drawer' }, [
    icon('torch'),
    el('p', { class: 'desk-object__label', text: torchHeld ? ctx.content.torch.taken : desk.file ? ctx.content.torch.drawerLabel : '' }),
    el('p', { class: 'drawer__note', text: torchHeld ? ctx.content.torch.description : ctx.content.torch.drawerHint }),
  ]);
  if (!torchHeld) {
    append(drawer, el('button', {
      type: 'button',
      class: 'btn btn--primary',
      text: ctx.content.torch.pickUp,
      onClick: () => {
        ctx.torch.pickUp();
        ctx.audio.play('unlock');
        ctx.render();
      },
    }));
  }
  append(grid, drawer);

  append(main, grid);

  if (allStamped) {
    append(main, el('p', { class: 'samnote', style: 'margin-top:28px', text: 'Three words. Open the file.' }));
  }
}

/* ---------- challenge scenes ---------- */

export async function renderChallenge(main, scene, ctx) {
  append(main, sceneHead(`Case 01 · ${scene.title}`, scene.title, scene.subtitle));

  const docs = el('div', { class: 'stack' });
  (scene.documents || []).forEach((doc) => append(docs, renderDocument(doc, ctx)));

  const work = el('div', { class: 'stack' });
  const hintHost = el('div', { class: 'stack stack--tight', 'data-role': 'hints' });

  const layout = (scene.documents || []).length
    ? el('div', { class: 'columns' }, [el('div', { class: 'stack' }, [docs, hintHost]), work])
    : el('div', { class: 'stack' }, [work, hintHost]);
  append(main, layout);

  const mounted = [];
  for (const config of scene.interactions || []) {
    const host = el('div', { class: 'interaction', 'data-interaction': config.type });
    append(work, host);
    /* eslint-disable no-await-in-loop */
    const mod = await loadInteraction(config.type);
    const instance = mod.mount(host, config, Object.assign({}, ctx, { scene, host }));
    mounted.push(instance);
  }

  ctx.mountHints(scene, hintHost);
  ctx.torch.refresh();
  return mounted;
}

export { sceneHead, formatNumber, clear, focusFirst, announce };
