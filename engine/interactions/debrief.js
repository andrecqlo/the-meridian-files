/* The debrief. Untimed, and built in a fixed order: what the team found, how
   it happened, what it was, the check they can take away, where it lands in
   their own work, and the memo. */

import { el, append, clear, announce, reducedMotion, focusFirst } from '../dom.js';
import { mount as mountMemo } from './memo.js';

function scoreLine(template, found) {
  const parts = String(template).split('{n}');
  return el('p', { class: 'tally__score' }, [
    parts[0] || '', el('b', { text: String(found) }), parts[1] || '',
  ]);
}

export function mount(host, _final, ctx) {
  const debrief = ctx.content.debrief;
  ctx.timer.stop();
  ctx.torch.setOn(false);

  const findings = ctx.store.get('findings', {}) || {};
  const found = debrief.tally.items.filter((item) => findings[item.id] === true).length;

  host.classList.add('debrief');

  append(host, el('header', { class: 'scene__head' }, [
    el('p', { class: 'scene__eyebrow', text: `Case ${ctx.content.number} · ${ctx.content.title}` }),
    el('h1', { text: debrief.title, 'data-autofocus': true, tabindex: '-1' }),
    el('p', { class: 'scene__sub', text: debrief.untimedNote }),
  ]));

  /* ---- 1. the tally ---- */

  const tally = el('section', { class: 'tally', 'aria-labelledby': 'tally-head' }, [
    el('h2', { id: 'tally-head', text: debrief.tally.heading }),
    scoreLine(debrief.tally.scoreTemplate, found),
  ]);
  debrief.tally.items.forEach((item) => {
    const isFound = findings[item.id] === true;
    const node = el('div', { class: 'tally-item', 'data-found': isFound ? '1' : '0' }, [
      el('span', { class: 'tally-item__mark', text: isFound ? debrief.tally.foundLabel : debrief.tally.missedLabel }),
      el('div', {}, [
        el('p', { class: 'tally-item__name', text: item.name }),
        el('p', { class: 'tally-item__body', text: isFound ? item.found : item.missed }),
      ]),
    ]);
    if (!isFound && item.missedQuote) {
      append(node.lastChild, el('blockquote', { class: 'tally-item__quote', text: item.missedQuote }));
    }
    append(tally, node);
  });
  append(tally, el('p', { class: 'samnote', text: debrief.tally.closingLine }));
  append(host, tally);

  /* ---- 2. the causal chain ---- */

  const chain = el('ol', { class: 'chain' });
  debrief.chain.links.forEach((link, index) => {
    append(chain, el('li', { class: 'chain__link', 'data-index': String(index), text: link }));
  });
  append(host, el('section', { class: 'chain-section', 'aria-labelledby': 'chain-head' }, [
    el('h2', { id: 'chain-head', text: debrief.chain.title }),
    chain,
    el('p', { class: 'scene__sub', text: debrief.chain.caption }),
  ]));

  /* Assemble the chain link by link, or simply fade it in when the player has
     asked for reduced motion. Fifteen seconds of screen time, no more. */
  const links = Array.from(chain.querySelectorAll('.chain__link'));
  if (reducedMotion()) {
    links.forEach((node) => { node.dataset.shown = '1'; });
  } else {
    links.forEach((node, index) => {
      window.setTimeout(() => { node.dataset.shown = '1'; }, 350 + index * 450);
    });
  }

  /* ---- 3. the reveal ---- */

  append(host, el('section', { class: 'reveal', 'aria-labelledby': 'reveal-head' }, [
    el('h2', { id: 'reveal-head', class: 'visually-hidden', text: debrief.reveal.heading }),
    el('p', { text: debrief.reveal.body }),
    el('p', { class: 'reveal__coda', text: debrief.reveal.coda }),
  ]));

  /* ---- 4. the blind spot check ---- */

  append(host, el('section', { class: 'blindspot', 'aria-labelledby': 'bs-head' }, [
    el('h2', { id: 'bs-head', text: debrief.blindSpot.title }),
    el('p', { class: 'scene__sub', text: debrief.blindSpot.subtitle }),
    el('ol', { class: 'blindspot__list' },
      debrief.blindSpot.questions.map((question) => el('li', {}, el('span', { text: question })))),
  ]));

  /* ---- 5. sector prompts ---- */

  const promptHost = el('div', { class: 'prompts' });
  const picker = el('div', { class: 'sector-picker' });
  let sector = ctx.store.get('sector', null);

  function renderPrompts() {
    clear(promptHost);
    const set = debrief.sectors.options.find((option) => option.id === sector);
    if (!set) return;
    set.prompts.forEach((prompt) => append(promptHost, el('p', { class: 'prompt', text: prompt })));
    ctx.bus.emit('memo-refresh', {});
  }

  debrief.sectors.options.forEach((option) => {
    const button = el('button', {
      type: 'button', class: 'btn',
      'aria-pressed': sector === option.id ? 'true' : 'false',
      text: option.label,
    });
    button.addEventListener('click', () => {
      sector = option.id;
      ctx.store.set('sector', sector);
      Array.from(picker.children).forEach((child) => child.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      renderPrompts();
      announce(`${option.label} prompts loaded.`);
    });
    append(picker, button);
  });

  append(host, el('section', { 'aria-labelledby': 'sector-head' }, [
    el('h2', { id: 'sector-head', text: debrief.sectors.title }),
    el('p', { class: 'scene__sub', text: debrief.sectors.instruction }),
    picker,
    promptHost,
  ]));
  renderPrompts();

  /* ---- 6. the memo ---- */

  const memoHost = el('section', { 'aria-label': debrief.memo.title });
  append(host, memoHost);
  mountMemo(memoHost, {}, ctx);

  append(host, el('section', { class: 'next-case' }, [
    el('h2', { style: 'font-size:1.1em;margin:0 0 6px', text: debrief.next.title }),
    el('p', { style: 'margin:0', text: debrief.next.text }),
  ]));

  append(host, el('div', {}, el('button', {
    type: 'button', class: 'btn btn--quiet', text: 'Back to the series menu',
    onClick: () => ctx.router.go(''),
  })));

  focusFirst(host);
  return { unmount() {} };
}
