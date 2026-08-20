/* Rebuilding an erased sentence from fragments.

   Doubly gated: the section only appears once the board it hangs beside is
   finished, and the fragments themselves only exist once the player has put
   the light on the minutes. Optional by design — the passphrase never depends
   on it, so most teams will finish the case without ever finding it. */

import { el, append, clear, announce } from '../dom.js';
import { renderDocument } from '../scenes.js';
import { createDnD } from './drag.js';

export function mount(host, config, ctx) {
  host.classList.add('card');

  const gate = config.gatedBy;
  const dnd = createDnD({});
  let gated = Boolean(gate) && ctx.store.get('progress', {})[gate] !== true;
  let open = ctx.store.get('fragmentsOpen', false);
  let workHost = null;

  const solved = () => ctx.store.get('progress', {})[config.track] === true;
  let placed = ctx.store.get('fragmentsPlaced', null);
  if (!Array.isArray(placed) || placed.length !== config.fragments.length) {
    placed = config.fragments.map(() => null);
  }

  function persist() {
    ctx.store.set('fragmentsPlaced', placed);
  }

  /* The board next to this one can finish at any moment, so the section
     unlocks in place rather than waiting for the player to navigate away. */
  ctx.bus.on('solved', (event) => {
    if (!gated || !gate || event.track !== gate) return;
    gated = false;
    render();
    announce(`${config.title} is now readable.`);
  });

  ctx.bus.on('reveal', (event) => {
    if (event.reveals !== 'fragments:open' || open) return;
    open = true;
    ctx.store.set('fragmentsOpen', true);
    ctx.hints.begin(config.track, () => {});
    renderWork();
  });

  function renderSolved() {
    clear(workHost);
    append(workHost, el('div', { class: 'unlock' }, [
      el('p', {
        class: 'unlock__word',
        style: 'font-size:clamp(20px,2.4vw,30px)',
        text: config.successTitle,
      }),
      el('blockquote', { class: 'tally-item__quote', text: config.sentenceDisplay }),
      el('p', { class: 'samnote', text: config.successNote }),
    ]));
  }

  function renderWork() {
    if (!workHost) return;
    clear(workHost);
    if (solved()) {
      renderSolved();
      return;
    }
    if (!open) {
      append(workHost, el('p', { class: 'scene__sub', text: config.lockedNote }));
      return;
    }

    append(workHost, el('p', { class: 'scene__sub', text: config.instruction }));

    const slotRow = el('div', { class: 'fragment-slots' });
    placed.forEach((fragmentId, index) => {
      const fragment = config.fragments.find((entry) => entry.id === fragmentId);
      const slot = el('button', {
        type: 'button',
        class: 'fslot',
        'data-filled': fragment ? '1' : '0',
        'aria-label': fragment
          ? `Position ${index + 1}: ${fragment.text}. Select to clear it.`
          : `Position ${index + 1}, empty. Select a fragment, then select this slot.`,
      }, [
        fragment
          ? el('span', { text: fragment.text })
          : el('span', { class: 'fslot__index', text: String(index + 1) }),
      ]);
      dnd.dropzone(slot, {
        accepts: (item) => item && item.kind === 'fragment',
        onDrop: (item) => {
          const from = placed.indexOf(item.id);
          if (from >= 0) placed[from] = null;
          placed[index] = item.id;
          persist();
          ctx.progress();
          renderWork();
        },
      });
      slot.addEventListener('click', () => {
        if (!dnd.selected && fragment) {
          placed[index] = null;
          persist();
          renderWork();
        }
      });
      append(slotRow, slot);
    });
    append(workHost, slotRow);

    const pool = el('div', { class: 'fragment-pool' });
    config.fragments.forEach((fragment) => {
      const node = el('button', {
        type: 'button',
        class: 'fragment',
        'data-used': placed.includes(fragment.id) ? '1' : '0',
        text: fragment.text,
      });
      dnd.draggable(node, { id: fragment.id, label: fragment.text, kind: 'fragment' }, {
        ghostClass: 'fragment--ghost',
        disabled: () => placed.includes(fragment.id),
      });
      append(pool, node);
    });
    append(workHost, pool);

    const feedback = el('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    let wrongCount = 0;
    const submit = el('button', { type: 'button', class: 'btn btn--primary', text: config.submitLabel });
    submit.addEventListener('click', async () => {
      if (placed.some((id) => id === null)) {
        feedback.dataset.tone = 'bad';
        feedback.textContent = config.incompleteNote;
        return;
      }
      const sentence = placed
        .map((id) => config.fragments.find((entry) => entry.id === id).text)
        .join(' ');
      if (await ctx.verify(sentence, config.answerDigest)) {
        ctx.audio.play('unlock');
        ctx.completeTrack(config.track);
        ctx.recordFinding(config.finding);
        announce(`Correct. ${config.successNote}`);
        renderSolved();
        return;
      }
      ctx.audio.play('wrong');
      ctx.hints.stumble(config.track);
      feedback.dataset.tone = 'bad';
      feedback.textContent = config.wrongResponses[wrongCount % config.wrongResponses.length];
      wrongCount += 1;
    });
    append(workHost, el('div', { class: 'fragment-actions' }, [submit, feedback]));
  }

  function render() {
    clear(host);
    append(host, el('h3', { text: config.title }));
    if (gated) {
      workHost = null;
      append(host, el('p', { class: 'scene__sub', text: config.gatedNote }));
      return;
    }
    append(host, renderDocument(config.document, ctx));
    workHost = el('div', { class: 'fragments' });
    append(host, workHost);
    renderWork();
    ctx.torch.refresh();
  }

  render();
  return {
    unmount() { dnd.destroy(); },
  };
}
