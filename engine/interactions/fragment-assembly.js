/* Rebuilding an erased sentence from fragments.

   Gated behind the marginalia: the fragments only exist once the player has
   put the light on the minutes. Optional by design — the passphrase never
   depends on it, so most teams will finish the case without ever finding it. */

import { el, append, clear, announce } from '../dom.js';
import { renderDocument } from '../scenes.js';
import { createDnD } from './drag.js';

export function mount(host, config, ctx) {
  host.classList.add('card');

  const gate = config.gatedBy;
  const gated = gate && ctx.store.get('progress', {})[gate] !== true;

  append(host, el('h3', { text: config.title }));

  if (gated) {
    append(host, el('p', { class: 'scene__sub', text: config.gatedNote }));
    return { unmount() {} };
  }

  append(host, renderDocument(config.document, ctx));

  const workHost = el('div', { class: 'fragments' });
  append(host, workHost);

  const solved = () => ctx.store.get('progress', {})[config.track] === true;
  let open = ctx.store.get('fragmentsOpen', false) || solved();

  ctx.bus.on('reveal', (event) => {
    if (event.reveals !== 'fragments:open' || open) return;
    open = true;
    ctx.store.set('fragmentsOpen', true);
    ctx.hints.begin(config.track, () => {});
    renderWork();
  });

  const dnd = createDnD({});
  let placed = ctx.store.get('fragmentsPlaced', null);
  if (!Array.isArray(placed)) placed = config.fragments.map(() => null);

  function persist() {
    ctx.store.set('fragmentsPlaced', placed);
  }

  function renderSolved() {
    clear(workHost);
    append(workHost, el('div', { class: 'unlock' }, [
      el('p', { class: 'unlock__word', style: 'font-size:clamp(20px,2.4vw,30px)', text: config.successTitle }),
      el('blockquote', { class: 'tally-item__quote', text: config.sentenceDisplay }),
      el('p', { class: 'samnote', text: config.successNote }),
    ]));
  }

  function renderWork() {
    clear(workHost);
    if (!open) {
      append(workHost, el('p', { class: 'scene__sub', text: config.lockedNote }));
      return;
    }
    if (solved()) {
      renderSolved();
      return;
    }

    append(workHost, el('p', { class: 'scene__sub', text: config.instruction }));

    const slotRow = el('div', { class: 'fragment-slots' });
    placed.forEach((fragmentId, index) => {
      const fragment = config.fragments.find((f) => f.id === fragmentId);
      const slot = el('button', {
        type: 'button',
        class: 'fslot',
        'data-filled': fragment ? '1' : '0',
        'aria-label': fragment
          ? `Position ${index + 1}: ${fragment.text}. Select to clear.`
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
      const used = placed.includes(fragment.id);
      const node = el('button', {
        type: 'button',
        class: 'fragment',
        'data-used': used ? '1' : '0',
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
    const submit = el('button', {
      type: 'button',
      class: 'btn btn--primary',
      text: config.submitLabel,
    });
    submit.addEventListener('click', async () => {
      if (placed.some((id) => id === null)) {
        feedback.dataset.tone = 'bad';
        feedback.textContent = config.incompleteNote;
        return;
      }
      const sentence = placed
        .map((id) => config.fragments.find((f) => f.id === id).text)
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

  renderWork();
  return {
    unmount() { dnd.destroy(); },
  };
}
