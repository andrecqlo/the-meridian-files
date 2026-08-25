/* New information, ninety seconds, one sentence.

   The sub-countdown runs on its own persisted clock so a refresh does not
   hand the team extra time. At zero the screen moves on with whatever is in
   the box: the sentence is stored verbatim and never marked. */

import { el, append, clear, announce, reducedMotion } from '../dom.js';
import { formatClock } from '../timer.js';

export function mount(host, final, ctx) {
  const twist = final.twist;
  const options = final.decision.options;
  const initial = ctx.store.get('decision', options[0].id);
  let choice = ctx.store.get('twistChoice', initial);
  let sentence = ctx.store.get('twistSentence', '');
  let handle = null;
  let done = false;

  const saved = ctx.store.get('twistClock', { remaining: twist.seconds });
  let remaining = typeof saved.remaining === 'number' ? saved.remaining : twist.seconds;

  ctx.audio.play('twist');

  const clock = el('span', { class: 'subclock', 'data-role': 'clock', text: formatClock(remaining) });
  const clockNote = el('p', { class: 'doc__meta', style: 'margin:6px 0 0', text: twist.clockLabel });

  append(host, el('div', { class: 'twist-banner' }, [
    el('p', { class: 'twist-banner__label', text: twist.banner }),
    el('h1', { text: twist.body, 'data-autofocus': true, tabindex: '-1', style: 'font-size:clamp(22px,2.2vw,32px)' }),
  ]));

  append(host, el('div', { class: 'twist-clock' }, [clock, clockNote]));

  function revised(option) {
    if (!option.assisted) return null;
    return option.saving + twist.adjustment;
  }

  function money(value) {
    const millions = value / 1000000;
    const text = `£${Math.abs(millions).toFixed(1)}m`;
    return value < 0 ? `cost ${text}` : text;
  }

  const optionsHost = el('div', { class: 'options' });

  function renderOptions() {
    clear(optionsHost);
    options.forEach((option) => {
      const isChoice = option.id === choice;
      const node = el('button', {
        type: 'button',
        class: 'option',
        'data-chosen': isChoice ? '1' : '0',
        'aria-pressed': isChoice ? 'true' : 'false',
      }, [
        el('span', { class: 'option__id', text: option.id }),
        el('span', { class: 'option__title', text: option.title }),
        el('span', { class: 'option__detail', text: option.detail }),
      ]);
      const change = revised(option);
      if (change !== null) {
        append(node, el('span', {
          class: 'option__revised',
          text: `${twist.revisedLabel}: ${money(change)}`,
        }));
      }
      append(node, el('span', {
        class: 'tag ' + (isChoice ? 'tag--uv' : ''),
        text: isChoice ? twist.holdLabel : twist.switchLabel,
      }));
      node.addEventListener('click', () => {
        choice = option.id;
        ctx.store.set('twistChoice', choice);
        renderOptions();
        announce(`${option.title} selected.`);
      });
      append(optionsHost, node);
    });
  }
  renderOptions();
  append(host, optionsHost);

  const box = el('textarea', {
    class: 'field field--wide', id: 'justification', rows: '3',
    placeholder: twist.placeholder, 'aria-describedby': 'justification-note',
  });
  box.value = sentence;
  box.addEventListener('input', () => {
    sentence = box.value;
    ctx.store.set('twistSentence', sentence);
  });

  const submit = el('button', { type: 'submit', class: 'btn btn--primary', text: twist.submitLabel });
  const form = el('form', { class: 'code-entry', style: 'margin-top:24px' }, [
    el('label', { class: 'code-entry__prompt', for: 'justification', text: twist.question }),
    box,
    el('p', { class: 'doc__meta', id: 'justification-note', style: 'margin:0', text: twist.note }),
    el('div', { class: 'code-entry__row' }, submit),
  ]);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    finish(false);
  });
  append(host, form);

  function finish(expired) {
    if (done) return;
    done = true;
    window.clearInterval(handle);
    ctx.store.set('twist', {
      choice,
      sentence: box.value,
      expired,
    });
    ctx.router.go(`${ctx.caseId}/debrief`);
  }

  function tick() {
    remaining -= 1;
    ctx.store.set('twistClock', { remaining });
    clock.textContent = formatClock(Math.max(remaining, 0));
    clock.dataset.low = remaining <= 20 ? '1' : '0';
    if (remaining === 20) announce('Twenty seconds.');
    if (remaining <= 0) {
      clock.textContent = '00:00';
      clockNote.textContent = twist.expiryNote;
      announce(twist.expiryNote);
      finish(true);
    }
  }

  if (remaining > 0) handle = window.setInterval(tick, 1000);
  else finish(true);

  if (reducedMotion()) clock.dataset.low = '0';

  return {
    unmount() { window.clearInterval(handle); },
  };
}
