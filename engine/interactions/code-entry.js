/* Code entry. Input is normalised and hashed before it is compared with the
   digest in content, so no code exists in plaintext anywhere in the repo.

   Wrong entries never produce a bare error. Content supplies targeted replies
   for the near-misses that a thinking team actually types, and a rotating set
   of in-world rebuffs for everything else. */

import { el, append } from '../dom.js';
import { renderUnlocked, bindAnswerForm } from './answer.js';

export function mount(host, config, ctx) {
  host.classList.add('card');
  const solved = () => ctx.store.get('progress', {})[config.track] === true;

  function showUnlocked() {
    renderUnlocked(host, config, {
      continueLabel: 'Back to the desk',
      onContinue: () => ctx.router.go(`${ctx.caseId}/desk`),
    });
  }

  if (solved()) {
    showUnlocked();
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

  bindAnswerForm(form, input, feedback, config, ctx, { onSolved: showUnlocked });

  append(host, form);
  return { unmount() {} };
}
