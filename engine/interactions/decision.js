/* The locked file: the three words in order, Sam's unsent memo, and the
   decision.

   Each challenge hands over one word. Opening the attachment means putting
   those three words in the right order — dragged into slots, or selected and
   placed for anyone not using a pointer. The arrangement is joined and hashed
   before it is compared, so the order itself is nowhere in the repo and
   nowhere on the wire; content only ever states which word each challenge
   awards, never where it belongs. No decision option is marked correct. */

import { el, append, clear, announce, focusFirst } from '../dom.js';
import { createDnD } from './drag.js';

/* The tray is shuffled per session so a team running this after another in
   the same room is not handed the order by the layout. The slots always start
   empty, so even a lucky tray still has to be arranged and submitted. */
function shuffleForSession(list, ctx) {
  let seed = ctx.store.get('lockShuffle', null);
  if (typeof seed !== 'number') {
    seed = Math.floor(Math.random() * 4294967295) + 1;
    ctx.store.set('lockShuffle', seed);
  }
  const out = list.slice();
  let state = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const j = state % (i + 1);
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function mount(host, final, ctx) {
  const progress = ctx.store.get('progress', {});
  const entries = ctx.content.desk.file.words;
  const words = entries
    .filter((entry) => progress[entry.track] === true)
    .map((entry) => ({ id: entry.track, text: ctx.decode(entry.word), kind: 'word' }));
  const allFound = words.length === entries.length;
  const tray = shuffleForSession(words, ctx);

  const dnd = createDnD({
    onSelect(item) {
      if (item) announce(`${item.text} selected. Now choose a slot.`);
    },
  });

  /* placed holds a track id per slot. Anything stale (content edited between
     sessions) is dropped rather than rendered as a blank tile. */
  let placed = ctx.store.get('lockPlaced', null);
  if (!Array.isArray(placed) || placed.length !== entries.length) {
    placed = entries.map(() => null);
  }
  placed = placed.map((id) => (words.some((word) => word.id === id) ? id : null));

  let wrongCount = 0;

  function persist() {
    ctx.store.set('lockPlaced', placed);
  }

  function wordById(id) {
    return words.find((word) => word.id === id) || null;
  }

  function renderLock() {
    clear(host);

    const feedback = el('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });

    const slotRow = el('div', { class: 'lockplate__slots' });
    placed.forEach((id, index) => {
      const word = wordById(id);
      const slot = el('button', {
        type: 'button',
        class: 'lockplate__slot',
        'data-filled': word ? '1' : '0',
        'aria-label': word
          ? `Position ${index + 1}: ${word.text}. Select to send it back.`
          : `Position ${index + 1}, empty. Select a word, then select this slot.`,
      }, el('span', { text: word ? word.text : '— — —' }));

      dnd.dropzone(slot, {
        accepts: (item) => item && item.kind === 'word',
        onDrop: (item) => {
          const from = placed.indexOf(item.id);
          if (from >= 0) placed[from] = null;
          placed[index] = item.id;
          persist();
          renderLock();
        },
      });
      /* Selecting a filled slot with nothing in hand sends that word back. */
      slot.addEventListener('click', () => {
        if (!dnd.selected && word) {
          placed[index] = null;
          persist();
          renderLock();
        }
      });
      append(slotRow, slot);
    });

    const pool = el('div', { class: 'wordpool' });
    tray.forEach((word) => {
      const used = placed.indexOf(word.id) >= 0;
      const node = el('button', {
        type: 'button',
        class: 'wordtile',
        'data-used': used ? '1' : '0',
        text: word.text,
      });
      dnd.draggable(node, word, {
        ghostClass: 'wordtile--ghost',
        disabled: () => placed.indexOf(word.id) >= 0,
      });
      append(pool, node);
    });

    const submit = el('button', {
      type: 'button',
      class: 'btn btn--primary',
      text: final.lock.submitLabel,
    });
    submit.addEventListener('click', async () => {
      if (placed.some((id) => id === null)) {
        feedback.dataset.tone = 'bad';
        feedback.textContent = final.lock.incompleteSlots;
        return;
      }
      const phrase = placed.map((id) => wordById(id).text).join(' ');
      const result = await ctx.verify(phrase, final.lock.answerDigest);
      if (result === null) {
        clear(feedback);
        feedback.dataset.tone = 'bad';
        feedback.textContent = ctx.checkerMessage;
        return;
      }
      if (result) {
        ctx.store.set('unlocked', true);
        ctx.audio.play('door');
        announce('The file opens.');
        renderOpen(true);
        return;
      }
      ctx.audio.play('wrong');
      clear(feedback);
      feedback.dataset.tone = 'bad';
      append(feedback, [
        el('span', { class: 'stamp-thud', text: final.lock.stampWrong }),
        ' ',
        final.lock.wrongResponses[wrongCount % final.lock.wrongResponses.length],
      ]);
      wrongCount += 1;
    });

    append(host, el('div', { class: 'lockplate' }, [
      el('h1', { text: final.lock.title, 'data-autofocus': true, tabindex: '-1' }),
      el('p', { class: 'scene__sub', text: final.lock.subtitle }),
      slotRow,
      el('p', { class: 'doc__meta', style: 'margin:0', text: allFound ? final.lock.help : final.lock.incomplete }),
      allFound ? el('p', { class: 'scene__sub', text: final.lock.instruction }) : null,
      allFound ? el('h2', { class: 'board__head', text: final.lock.trayLabel }) : null,
      allFound ? pool : null,
      allFound ? el('div', { class: 'fragment-actions' }, [submit, feedback]) : null,
    ]));
  }

  function renderOpen(animate) {
    clear(host);
    const memo = el('article', { class: 'doc doc--letter memo-open' }, [
      el('h1', { class: 'doc__title', text: final.memo.title, 'data-autofocus': true, tabindex: '-1' }),
      el('p', { class: 'doc__meta', text: final.memo.meta }),
      el('div', { class: 'doc__body' }, final.memo.paragraphs.map((line) => el('p', { text: line }))),
    ]);
    if (animate) memo.classList.add('door-open');
    append(host, memo);

    const chosen = ctx.store.get('decision', null);
    const options = el('div', { class: 'options' }, final.decision.options.map((option) => {
      const node = el('button', {
        type: 'button',
        class: 'option',
        'data-chosen': chosen === option.id ? '1' : '0',
        'aria-pressed': chosen === option.id ? 'true' : 'false',
      }, [
        el('span', { class: 'option__id', text: option.id }),
        el('span', { class: 'option__title', text: option.title }),
        el('span', { class: 'option__detail', text: option.detail }),
      ]);
      node.addEventListener('click', () => {
        ctx.store.set('decision', option.id);
        ctx.audio.play('twist');
        ctx.router.go(`${ctx.caseId}/twist`);
      });
      return node;
    }));

    append(host, el('section', { class: 'decision' }, [
      el('h2', { class: 'decision__title', text: final.decision.title }),
      el('p', { class: 'scene__sub', text: final.decision.instruction }),
      options,
    ]));
    focusFirst(host);
  }

  if (ctx.store.get('unlocked', false)) renderOpen(false);
  else renderLock();

  return {
    unmount() { dnd.destroy(); },
  };
}
