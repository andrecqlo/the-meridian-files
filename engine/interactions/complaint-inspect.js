/* Act 1 and 2 of the first challenge: a letter from a customer, the reply she
   received, and her customer record.

   The record chips state three facts each — what her file says, what the
   customer base looks like, what the methodology claims — and never a verdict.
   No ticks, no crosses, no "covered" labels. Working out which of the four
   matters is the challenge; a chip that answered it would be the challenge. */

import { el, append, clear, announce } from '../dom.js';
import { renderDocument } from '../scenes.js';

export function mount(host, config, ctx) {
  host.classList.add('stack');
  ctx.store.patch('progress', { c1letter: true });

  append(host, el('h3', { text: config.title }));
  if (config.instruction) {
    append(host, el('p', { class: 'scene__sub', text: config.instruction }));
  }

  config.documents.forEach((doc) => append(host, renderDocument(doc, ctx)));

  const recordHost = el('div', { class: 'stack stack--tight' });
  append(host, recordHost);

  const opened = ctx.store.get('recordOpened', false);

  function openRecord() {
    ctx.store.set('recordOpened', true);
    ctx.progress();
    clear(recordHost);
    append(recordHost, el('h3', { text: config.record.title, tabindex: '-1', id: 'record-head' }));
    append(recordHost, el('p', { class: 'scene__sub', text: config.record.instruction }));

    const grid = el('div', { class: 'chips' });
    config.record.chips.forEach((chip) => append(grid, renderChip(chip, ctx)));
    append(recordHost, grid);
    const head = recordHost.querySelector('#record-head');
    if (head) head.focus();
    announce(`${config.record.chips.length} record fields. Select one to inspect it.`);
  }

  if (opened) openRecord();
  else {
    append(recordHost, el('button', {
      type: 'button',
      class: 'btn btn--primary',
      text: config.record.openLabel,
      onClick: openRecord,
    }));
  }

  append(host, el('div', {}, el('button', {
    type: 'button',
    class: 'btn',
    text: config.nextLabel,
    onClick: () => ctx.router.go(config.nextRoute),
  })));

  return { unmount() {} };
}

/* Tap or Enter to inspect. Nothing in this game is revealed by hover: hover
   does not exist on touch and is invisible from the back of a room. */
function renderChip(chip, ctx) {
  const body = el('div', { class: 'chip__body', hidden: true, id: `chip-body-${chip.id}` }, [
    row('Her record', chip.record),
    row('Customer base', chip.base),
    row('Methodology', chip.methodology),
  ]);

  const solvedNote = chip.unlockNote && ctx.store.get('progress', {}).c1 === true
    ? el('p', { class: 'samnote samnote--paper', text: chip.unlockNote })
    : null;
  if (solvedNote) append(body, solvedNote);

  const button = el('button', {
    type: 'button',
    class: 'chip__toggle',
    'aria-expanded': 'false',
    'aria-controls': `chip-body-${chip.id}`,
  }, [
    el('span', { class: 'chip__label', text: chip.label }),
    el('span', { class: 'chip__cue', 'aria-hidden': 'true', text: '+' }),
  ]);

  button.addEventListener('click', () => {
    const next = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', next ? 'true' : 'false');
    button.querySelector('.chip__cue').textContent = next ? '−' : '+';
    body.hidden = !next;
    if (next) ctx.progress();
  });

  return el('div', { class: 'chip' }, [button, body]);
}

function row(label, value) {
  return el('div', { class: 'chip__row' }, [
    el('span', { class: 'chip__key', text: label }),
    el('span', { class: 'chip__value', text: value }),
  ]);
}
