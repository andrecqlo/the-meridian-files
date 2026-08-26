/* Shared verify-and-respond plumbing for any interaction that checks a typed
   answer against config.answerDigest: code-entry and lock-screen are the same
   mechanism wearing different chrome (a plain card vs a device pad with a
   sticky note), so the compare-hash, cycle-targeted/wrong-response, and
   reward-card "unlocked" rendering all live here once. */

import { el, append, clear, announce } from '../dom.js';

/* extraHostClass is removed on unlock (lock-screen drops its device-pad
   styling; code-entry has none to drop). continueLabel/onContinue drive the
   button at the bottom of the reward state, since the two callers send the
   team to different places from here. */
export function renderUnlocked(host, config, { extraHostClass, continueLabel, onContinue } = {}) {
  clear(host);
  if (extraHostClass) host.classList.remove(extraHostClass);
  host.classList.add('unlock');

  append(host, el('p', { class: 'unlock__word', text: config.successTitle }));
  if (config.successBody) append(host, el('p', { text: config.successBody }));
  if (config.successNote) append(host, el('p', { class: 'samnote', text: config.successNote }));

  (config.reward && config.reward.cards ? config.reward.cards : []).forEach((card) => {
    const node = el('div', { class: 'card card--paper', style: 'margin-top:14px' }, [
      el('h4', { text: card.title }),
    ]);
    if (card.lines) {
      append(node, el('ul', {}, card.lines.map((line) => el('li', { text: line }))));
    }
    if (card.figure) append(node, el('p', { class: 'stat__value', style: 'margin:6px 0', text: card.figure }));
    if (card.body) append(node, el('p', { text: card.body }));
    if (card.note) append(node, el('p', { class: 'samnote samnote--paper', text: card.note }));
    append(host, node);
  });

  append(host, el('div', { style: 'margin-top:18px' }, el('button', {
    type: 'button',
    class: 'btn btn--primary',
    text: continueLabel,
    onClick: onContinue,
  })));
}

/* Content can pin a field to a fixed shape — the laptop PIN is four digits, so
   the field refuses anything else rather than accepting it and failing the
   hash. Filtering on input as well as setting the attributes, because
   maxlength does not constrain a paste and inputmode is only a keyboard hint
   on touch: neither stops a desktop user typing letters. */
export function constrainInput(input, config) {
  const numeric = config.inputMode === 'numeric';
  const max = typeof config.maxLength === 'number' ? config.maxLength : null;
  if (max) input.setAttribute('maxlength', String(max));
  if (numeric) input.setAttribute('pattern', '[0-9]*');
  if (!numeric && !max) return;
  input.addEventListener('input', () => {
    let value = input.value;
    if (numeric) value = value.replace(/[^0-9]/g, '');
    if (max) value = value.slice(0, max);
    if (value !== input.value) input.value = value;
  });
}

export function bindAnswerForm(form, input, feedback, config, ctx, { onSolved, onWrong } = {}) {
  let wrongCount = 0;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value;
    if (!ctx.normalise(value)) return;

    const result = await ctx.verify(value, config.answerDigest);
    if (result === null) {
      feedback.dataset.tone = 'bad';
      feedback.textContent = ctx.checkerMessage;
      return;
    }
    if (result) {
      ctx.audio.play('unlock');
      ctx.completeTrack(config.track);
      if (config.finding) ctx.recordFinding(config.finding);
      ctx.bus.emit('solved', { track: config.track, id: config.id });
      announce(`Correct. ${config.successTitle} stamped on the file.`);
      if (onSolved) onSolved();
      return;
    }

    /* Near-misses that a thinking team actually types get their own answer. */
    let reply = null;
    for (const targeted of config.targetedResponses || []) {
      /* eslint-disable no-await-in-loop */
      if (await ctx.verify(value, targeted.digest)) { reply = targeted.text; break; }
    }
    if (!reply) {
      const pool = config.wrongResponses || ['Not that.'];
      reply = pool[wrongCount % pool.length];
    }
    wrongCount += 1;
    ctx.audio.play('wrong');
    ctx.hints.stumble(config.track);
    if (onWrong) onWrong();
    feedback.dataset.tone = 'bad';
    clear(feedback);
    append(feedback, [el('span', { class: 'stamp-thud', text: 'NO' }), ' ', reply]);
    input.select();
  });
}
