/* Challenge 1, act 1: the letter, the reply, and the customer it names.

   Her profile sits above the documents as a plain field list — no verdict,
   just what her file says. Sam's highlighter marks one field here and one
   sentence in the reply; the two marks are the pair that matters, and finding
   why is the puzzle. A UV note also sits on each document, but nothing says so
   until you have actually swept the torch across it — grabbing the torch is
   not the same as knowing where to point it. */

import { el, append, announce } from '../dom.js';
import { renderDocument, renderUvHighlight } from '../scenes.js';
import { spriteToDataURL } from '../pixel.js';
import * as SPRITES from '../../assets/sprites/desk.js';

function renderProfile(profile, ctx) {
  const sprite = SPRITES[profile.portrait];
  const body = el('div', { class: 'profile-card__body' }, [
    el('p', { class: 'profile-card__name', text: profile.name }),
    profile.meta ? el('p', { class: 'profile-card__meta', text: profile.meta }) : null,
  ]);
  const smear = renderSmear(profile.smear, ctx);
  if (smear) append(body, smear);
  append(body, el('dl', { class: 'profile-card__fields' }, profile.fields.map((field) => el('div', {
    class: 'profile-card__field',
  }, [
    el('dt', { text: field.label }),
    el('dd', {}, field.highlight ? renderUvHighlight(field.value, profile.smear.note) : field.value),
  ]))));
  const card = el('div', { class: 'profile-card' }, [
    sprite
      ? el('img', { class: 'profile-card__portrait', src: spriteToDataURL(sprite, 4), alt: '' })
      : el('span', { class: 'profile-card__portrait' }),
    body,
  ]);
  return el('div', { class: 'card', 'aria-label': 'Customer file' }, card);
}

/* The "something is smeared" tease. It sits under the title until the torch
   has actually found the thing it's about, then it is gone for good —
   checked against the store directly, so a refresh does not bring it back
   once the note has been read. Shared by documents and the profile card. */
function renderSmear(smear, ctx) {
  if (!smear) return null;
  const revealed = () => (ctx.store.get('revealed', []) || []).indexOf(smear.note) >= 0;
  if (revealed()) return null;
  const caption = el('p', { class: 'doc__smear', text: smear.text });
  const off = ctx.bus.on('note-read', ({ id }) => {
    if (id !== smear.note) return;
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

  if (config.profile) append(host, renderProfile(config.profile, ctx));

  config.documents.forEach((doc) => {
    const node = renderDocument(doc, ctx);
    const smear = renderSmear(doc.smear, ctx);
    if (smear) node.insertBefore(smear, node.querySelector('.doc__body'));
    append(host, node);
  });

  /* Closing this puts you back wherever you actually came from — the desk,
     the laptop, anywhere the tray is reachable from — rather than assuming
     the only reason to open it was to head to the laptop next. */
  append(host, el('div', {}, el('button', {
    type: 'button',
    class: 'btn',
    text: config.closeLabel || 'Put away',
    onClick: () => {
      announce('Put away.');
      ctx.router.go(ctx.previousPath || `${ctx.caseId}/desk`);
    },
  })));

  announce(`${config.documents.length} documents. Sam’s customer file is above them.`);
  return { unmount() {} };
}
