/* Challenge 1, act 1: the letter, the reply, and the customer it names.

   Her profile sits above the documents as a plain field list — no verdict,
   just what her file says. Sam's highlighter marks one field here and one
   sentence in the reply; the two marks are the pair that matters, and finding
   why is the puzzle. A UV note also sits on each document, but nothing says so
   until you have actually swept the torch across it — grabbing the torch is
   not the same as knowing where to point it. */

import { el, append, announce } from '../dom.js';
import { renderDocument } from '../scenes.js';
import { spriteToDataURL } from '../pixel.js';
import * as SPRITES from '../../assets/sprites/desk.js';

function renderProfile(profile) {
  const sprite = SPRITES[profile.portrait];
  const card = el('div', { class: 'profile-card' }, [
    sprite
      ? el('img', { class: 'profile-card__portrait', src: spriteToDataURL(sprite, 4), alt: '' })
      : el('span', { class: 'profile-card__portrait' }),
    el('div', { class: 'profile-card__body' }, [
      el('p', { class: 'profile-card__name', text: profile.name }),
      profile.meta ? el('p', { class: 'profile-card__meta', text: profile.meta }) : null,
      el('dl', { class: 'profile-card__fields' }, profile.fields.map((field) => el('div', {
        class: `profile-card__field${field.highlight ? ' profile-card__field--hl' : ''}`,
      }, [
        el('dt', { text: field.label }),
        el('dd', { text: field.value }),
      ]))),
    ]),
  ]);
  return el('div', { class: 'card', 'aria-label': 'Customer file' }, card);
}

/* The "something is smeared" tease. It sits under the document title until
   the torch has actually found that document's note, then it is gone for
   good — checked against the store directly, so a refresh does not bring it
   back once the note has been read. */
function renderSmear(doc, ctx) {
  if (!doc.smear) return null;
  const revealed = () => (ctx.store.get('revealed', []) || []).indexOf(doc.smear.note) >= 0;
  if (revealed()) return null;
  const caption = el('p', { class: 'doc__smear', text: doc.smear.text });
  const off = ctx.bus.on('note-read', ({ id }) => {
    if (id !== doc.smear.note) return;
    if (caption.parentNode) caption.parentNode.removeChild(caption);
    off();
  });
  return caption;
}

export function mount(host, config, ctx) {
  host.classList.add('stack');
  ctx.store.patch('progress', { c1letter: true });
  /* Once you have read it, you carry it — it is worth re-reading later. */
  if (ctx.inventory) ctx.inventory.add('letter');
  ctx.progress();

  append(host, el('h3', { text: config.title }));
  if (config.instruction) {
    append(host, el('p', { class: 'scene__sub', text: config.instruction }));
  }

  if (config.profile) append(host, renderProfile(config.profile));

  config.documents.forEach((doc) => {
    const node = renderDocument(doc, ctx);
    const smear = renderSmear(doc, ctx);
    if (smear) node.insertBefore(smear, node.querySelector('.doc__body'));
    append(host, node);
  });

  append(host, el('div', {}, el('button', {
    type: 'button',
    class: 'btn',
    text: config.nextLabel,
    onClick: () => ctx.router.go(config.nextRoute),
  })));

  announce(`${config.documents.length} documents. Sam’s customer file is above them.`);
  return { unmount() {} };
}
