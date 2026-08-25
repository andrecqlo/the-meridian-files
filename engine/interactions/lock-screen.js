/* A PIN lock, standing in for the laptop's login. Input is normalised and
   hashed before it is compared with the digest in content, exactly like
   code-entry — this is the same mechanism wearing a different scene.

   The sticky note is deliberately vague on first sight: "the ones nobody
   asked" is Sam's fiction, not a hint menu. The first wrong attempt sharpens
   it in-world to a direct question, so a team that never opens the drawer
   still has a way forward, and that sharpening survives a refresh. */

import { el, append, announce } from '../dom.js';
import { renderUnlocked, bindAnswerForm } from './answer.js';

export function mount(host, config, ctx) {
  host.classList.add('card', 'lock-screen');
  const solved = () => ctx.store.get('progress', {})[config.track] === true;

  function showUnlocked() {
    renderUnlocked(host, config, {
      extraHostClass: 'lock-screen',
      continueLabel: config.continueLabel || 'Continue',
      onContinue: () => ctx.render(),
    });
  }

  if (solved()) {
    showUnlocked();
    return { unmount() {} };
  }

  const sharpMarks = ctx.store.get('lockSharp', {}) || {};
  const sharpened = sharpMarks[config.id] === true;

  const input = el('input', {
    type: 'text',
    class: 'field field--lock',
    inputmode: config.inputMode === 'numeric' ? 'numeric' : 'text',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    placeholder: config.placeholder || '',
    id: `entry-${config.id}`,
    'aria-describedby': `prompt-${config.id}`,
  });
  const feedback = el('p', { class: 'feedback', 'data-tone': '', role: 'status', 'aria-live': 'polite' });
  const sticky = el('p', { class: 'lock-screen__sticky', text: sharpened ? config.stickySharp : config.sticky });

  const pad = el('div', { class: 'lock-screen__pad' }, [
    el('p', { class: 'lock-screen__device', text: config.device || '' }),
    el('p', { class: 'lock-screen__label', text: config.label }),
    el('div', { class: 'lock-screen__note', 'aria-hidden': 'false' }, [
      el('p', { class: 'lock-screen__note-title', text: config.stickyTitle || 'Sticky note' }),
      sticky,
    ]),
  ]);

  const form = el('form', { class: 'code-entry' }, [
    el('label', { class: 'code-entry__prompt', id: `prompt-${config.id}`, for: `entry-${config.id}`, text: config.prompt }),
    el('div', { class: 'code-entry__row' }, [
      input,
      el('button', { type: 'submit', class: 'btn btn--primary', text: config.submitLabel || 'Unlock' }),
    ]),
    feedback,
  ]);

  bindAnswerForm(form, input, feedback, config, ctx, {
    onSolved: showUnlocked,
    onWrong: () => {
      /* The clue only ever sharpens once — the second wrong attempt does not
         need to write anything new. */
      if (!sharpMarks[config.id] && config.stickySharp) {
        sharpMarks[config.id] = true;
        ctx.store.set('lockSharp', sharpMarks);
        sticky.textContent = config.stickySharp;
        announce(config.stickySharp);
      }
    },
  });

  append(host, pad);
  append(host, form);
  return { unmount() {} };
}
