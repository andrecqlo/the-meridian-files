/* Adaptive hints, surfacing over time.

   Distinct from the room's status bar, which answers something you just did.
   These arrive because time is passing: a folded note in the top corner,
   closed and pulsing until you open it. Only a team well behind the pace line
   ever has one open itself, and even then it can be put back. Not attributed
   to Sam — a live-feeling notification that escalates on a schedule doesn't
   read as something she left behind before resigning. */

import { el, append, clear, announce, reducedMotion } from './dom.js';

export function createHintStack(ctx) {
  const host = document.getElementById('hintstack');
  const notes = [];

  function open(entry, spoken) {
    if (entry.open) return;
    entry.open = true;
    entry.node.dataset.open = '1';
    entry.node.dataset.fresh = '0';
    entry.body.hidden = false;
    entry.tab.setAttribute('aria-expanded', 'true');
    if (spoken !== false) announce(entry.text);
  }

  function close(entry) {
    entry.open = false;
    entry.node.dataset.open = '0';
    entry.body.hidden = true;
    entry.tab.setAttribute('aria-expanded', 'false');
  }

  return {
    add(track, tier, text) {
      if (!text) return;
      const id = `${track}-${tier}`;
      if (notes.some((entry) => entry.id === id)) return;

      const bodyId = `hintnote-${id}`;
      const tab = el('button', {
        type: 'button',
        class: 'hintnote__tab',
        'aria-expanded': 'false',
        'aria-controls': bodyId,
        text: ctx.content.hintNote.closedLabel,
      });
      const body = el('div', { class: 'hintnote__body', id: bodyId, hidden: true }, [
        el('p', { class: 'hintnote__text', text }),
        el('button', {
          type: 'button',
          class: 'hintnote__close',
          text: ctx.content.hintNote.dismissLabel,
          onClick: () => close(entry),
        }),
      ]);
      const node = el('div', { class: 'hintnote', 'data-open': '0', 'data-fresh': '1' }, [tab, body]);
      const entry = { id, text, node, tab, body, open: false };
      tab.addEventListener('click', () => (entry.open ? close(entry) : open(entry)));

      append(host, node);
      host.hidden = false;
      notes.push(entry);
      if (reducedMotion()) node.dataset.fresh = '1';
      announce(ctx.content.hintNote.arrival);
    },

    /* Used once, and only when a team is a long way behind the line. */
    openLatest() {
      const entry = notes[notes.length - 1];
      if (!entry || entry.autoOpened) return;
      entry.autoOpened = true;
      open(entry);
    },

    /* A track that has just been solved takes its notes with it — nothing
       nags after it has been answered, even without a route change. */
    remove(track) {
      const prefix = `${track}-`;
      for (let i = notes.length - 1; i >= 0; i -= 1) {
        if (notes[i].id.indexOf(prefix) !== 0) continue;
        const [entry] = notes.splice(i, 1);
        if (entry.node.parentNode) entry.node.parentNode.removeChild(entry.node);
      }
      if (!notes.length) host.hidden = true;
    },

    clear() {
      notes.length = 0;
      clear(host);
      host.hidden = true;
    },
  };
}
