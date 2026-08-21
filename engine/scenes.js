/* Scene loader and renderer. Everything here is driven by content JSON: the
   engine knows about documents, annotations and interaction slots, and nothing
   about Case 01 in particular. */

import { el, append, clear, icon, announce, focusFirst, formatNumber } from './dom.js';
import { load as loadInteraction } from './registry.js';
import { renderDeskScene } from './deskscene.js';

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
    return el('div', { class: 'table-scroll' }, table);
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

  /* Every block gets a row, and its annotation sits in the row's margin —
     physically beside the line it is about, the way a note written on paper
     would be. The gutter is always there, so revealing a note never reflows
     the page. */
  const body = el('div', { class: 'doc__body' });
  const annotations = doc.annotations || [];
  const blocks = doc.blocks || [];

  function row(block, notes) {
    return el('div', { class: 'doc__row' }, [
      el('div', { class: 'doc__col' }, block),
      el('aside', { class: 'doc__margin' }, notes.map(renderAnnotation)),
    ]);
  }

  if (!annotations.length) {
    /* Nothing written on this one, so it does not need a margin reserved. */
    blocks.forEach((block) => append(body, renderBlock(block)));
  } else {
    blocks.forEach((block, index) => {
      append(body, row(renderBlock(block), annotations.filter((note) => Number(note.after) === index)));
    });
    const trailing = annotations
      .filter((note) => note.after === undefined || Number(note.after) >= blocks.length);
    if (trailing.length) append(body, row(null, trailing));
  }

  append(node, body);
  if (annotations.length) node.classList.add('doc--has-notes');

  if (doc.collapsed) {
    /* Behind a disclosure: the paper card is the wrapper, so the document
       inside it drops its own background and padding. */
    node.classList.add('doc--bare');
    /* The disclosure summary is already the document's title. */
    const innerTitle = node.querySelector('.doc__title');
    if (innerTitle) innerTitle.classList.add('visually-hidden');
    const details = el('details', {}, [
      el('summary', { text: doc.openLabel || doc.title }),
      node,
    ]);
    details.addEventListener('toggle', () => {
      if (details.open) ctx.progress();
      ctx.torch.refresh();
    });
    return el('div', { class: `doc doc--${doc.kind || 'paper'}`, 'data-wrapper': doc.id }, details);
  }

  return node;
}

/* A small deterministic tilt per note, so no two look typeset. */
function tiltFor(id) {
  let hash = 0;
  for (let i = 0; i < String(id).length; i += 1) hash = (hash * 31 + String(id).charCodeAt(i)) % 1000;
  return ((hash % 7) - 3) * 0.7;
}

function renderAnnotation(note) {
  return el('span', {
    class: 'uv-note',
    'data-note-id': note.id,
    'data-lit': '0',
    'data-inspect': '0',
    'data-reveals': note.reveals || '',
    style: `--tilt:${tiltFor(note.id).toFixed(2)}deg`,
    text: note.text,
  });
}

/* A compact card carrying nothing but marginalia — used for Sam's hint notes
   and for annotations that belong to an interaction rather than a document.
   It gets the same Inspect control as a full document, so the torch is never
   the only way to read what is on it. */
export function renderNoteCard(title, notes, ctx) {
  const node = el('article', { class: 'doc doc--screen doc--note-card doc--has-notes' });
  append(node, el('h4', { class: 'doc__title', text: title }));
  notes.forEach((note) => append(node, renderAnnotation(note)));
  /* Without the torch there is no way to sweep it, so the note simply reads. */
  if (!ctx.torch.held) {
    notes.forEach((note) => {
      const written = node.querySelector(`[data-note-id="${note.id}"]`);
      if (written) written.dataset.inspect = '1';
    });
  }
  return node;
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

  /* The room, or a plain list of objects if the canvas cannot be drawn. */
  let scene = null;
  try {
    scene = renderDeskScene(main, ctx, desk.objects);
  } catch (error) {
    renderDeskCards(main, ctx, desk.objects);
  }

  /* The file's three word slots live under the room, where the words are
     legible and the stamp can be announced. */
  const seen = ctx.store.get('stampsSeen', []) || [];
  const stamped = desk.file.slots.map((slot) => ({
    word: ctx.decode(slot.word),
    filled: progress[slot.track] === true,
    fresh: progress[slot.track] === true && seen.indexOf(slot.track) < 0,
  }));
  const allStamped = stamped.every((slot) => slot.filled);
  const nowSeen = desk.file.slots
    .filter((slot) => progress[slot.track] === true)
    .map((slot) => slot.track);
  if (nowSeen.length !== seen.length) ctx.store.set('stampsSeen', nowSeen);

  append(main, el('div', { class: 'filestrip' }, [
    el('p', { class: 'filestrip__name', text: desk.file.name }),
    el('div', { class: 'slots' }, stamped.map((slot) => el('span', {
      class: `slot${slot.fresh ? ' slot--stamping' : ''}`,
      'data-filled': slot.filled ? '1' : '0',
      text: slot.filled ? slot.word : '— — —',
    }))),
    el('p', { class: 'filestrip__caption', text: allStamped ? desk.file.ready : desk.file.locked }),
  ]));

  if (scene && allStamped) scene.say(desk.file.ready);
}

/* Fallback for anything that cannot render the room. */
function renderDeskCards(main, ctx, objects) {
  const grid = el('div', { class: 'desk' });
  objects.forEach((object) => {
    const state = ctx.deskState(object);
    const node = el('button', {
      type: 'button', class: 'desk-object', 'data-state': state.kind,
      onClick: () => {
        if (state.kind === 'blocked') { ctx.toast(state.response, 'bad'); return; }
        ctx.deskActivate(object, (text) => ctx.toast(text));
      },
    }, [
      el('p', { class: 'desk-object__label', text: object.label }),
      el('p', { class: 'desk-object__caption', text: (object.responses || {}).look || '' }),
    ]);
    append(grid, node);
  });
  append(main, grid);
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

  for (const config of scene.interactions || []) {
    const host = el('div', { class: 'interaction', 'data-interaction': config.type });
    append(work, host);
    /* eslint-disable no-await-in-loop */
    const mod = await loadInteraction(config.type);
    ctx.track(mod.mount(host, config, Object.assign({}, ctx, { scene, host })));
  }

  ctx.mountHints(scene, hintHost);
  ctx.torch.refresh();
}

export { sceneHead, formatNumber, clear, focusFirst, announce };
