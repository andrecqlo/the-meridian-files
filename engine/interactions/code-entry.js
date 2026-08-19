/* Code entry. Input is normalised and hashed before it is compared with the
   digest in content, so no code exists in plaintext anywhere in the repo.

   Wrong entries never produce a bare error. Content supplies targeted replies
   for the near-misses that a thinking team actually types, and a rotating set
   of in-world rebuffs for everything else. */

import { el, append, clear, announce } from '../dom.js';

export function mount(host, config, ctx) {
  host.classList.add('card');
  const solved = () => ctx.store.get('progress', {})[config.track] === true;
  let wrongCount = 0;

  function renderUnlocked() {
    clear(host);
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
      text: 'Back to the desk',
      onClick: () => ctx.router.go('case01/desk'),
    })));
  }

  if (solved()) {
    renderUnlocked();
    return { unmount() {} };
  }

  const input = el('input', {
    type: 'text',
    class: 'field',
    inputmode: config.inputMode === 'numeric' ? 'numeric' : 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    placeholder: config.placeholder || '',
    id: `entry-${config.id}`,
    'aria-describedby': `prompt-${config.id}`,
  });
  const feedback = el('p', { class: 'feedback', 'data-tone': '', role: 'status', 'aria-live': 'polite' });

  const form = el('form', { class: 'code-entry' }, [
    el('p', { class: 'code-entry__label', text: config.label }),
    el('label', { class: 'code-entry__prompt', id: `prompt-${config.id}`, for: `entry-${config.id}`, text: config.prompt }),
    el('div', { class: 'code-entry__row' }, [
      input,
      el('button', { type: 'submit', class: 'btn btn--primary', text: config.submitLabel || 'Enter' }),
    ]),
    feedback,
  ]);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = input.value;
    if (!ctx.normalise(value)) return;

    if (await ctx.verify(value, config.answerDigest)) {
      ctx.audio.play('unlock');
      ctx.completeTrack(config.track);
      if (config.finding) ctx.recordFinding(config.finding);
      ctx.bus.emit('solved', { track: config.track, id: config.id });
      announce(`Correct. ${config.successTitle} stamped on the file.`);
      renderUnlocked();
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
    feedback.dataset.tone = 'bad';
    clear(feedback);
    append(feedback, [el('span', { class: 'stamp-thud', text: 'NO' }), ' ', reply]);
    input.select();
  });

  append(host, form);
  return { unmount() {} };
}
