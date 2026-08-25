/* The locked file: passphrase, Sam's unsent memo, and the decision.

   The passphrase is checked against a digest of normalised input, so spacing,
   hyphens and case are all forgiven and the words themselves are nowhere in
   the repo. No decision option is marked correct. */

import { el, append, clear, announce, focusFirst } from '../dom.js';

export function mount(host, final, ctx) {
  const progress = ctx.store.get('progress', {});
  const tracks = ctx.content.desk.file.slots;
  const stamped = tracks.map((slot) => ({
    word: ctx.decode(slot.word),
    filled: progress[slot.track] === true,
  }));
  const allStamped = stamped.every((slot) => slot.filled);
  let wrongCount = 0;

  function renderLock() {
    clear(host);
    const slots = el('div', { class: 'lockplate__slots' }, stamped.map((slot) => el('span', {
      class: 'lockplate__slot',
      'data-filled': slot.filled ? '1' : '0',
      text: slot.filled ? slot.word : '— — —',
    })));

    const feedback = el('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
    const input = el('input', {
      type: 'text', class: 'field field--wide', id: 'passphrase',
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false',
      placeholder: final.lock.placeholder, 'aria-describedby': 'lock-help',
    });

    const form = el('form', { class: 'code-entry' }, [
      el('label', { class: 'code-entry__prompt', for: 'passphrase', text: final.lock.prompt }),
      el('div', { class: 'code-entry__row' }, [
        input,
        el('button', { type: 'submit', class: 'btn btn--primary', text: final.lock.submitLabel }),
      ]),
      feedback,
    ]);

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!ctx.normalise(input.value)) return;
      const result = await ctx.verify(input.value, final.lock.answerDigest);
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
      input.select();
    });

    append(host, el('div', { class: 'lockplate' }, [
      el('h1', { text: final.lock.title, 'data-autofocus': true, tabindex: '-1' }),
      el('p', { class: 'scene__sub', text: final.lock.subtitle }),
      slots,
      el('p', { class: 'doc__meta', id: 'lock-help', style: 'margin:0', text: allStamped ? final.lock.help : final.lock.incomplete }),
      form,
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

  return { unmount() {} };
}
