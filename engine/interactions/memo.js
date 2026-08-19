/* Client-side memo generation. Everything is assembled from what the team
   actually did: the count they established, the figure they recomputed, the
   claims they flagged, their recommendation, and their sentence verbatim. */

import { el, append, announce } from '../dom.js';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function today() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
}

function money(value) {
  const millions = Math.abs(value) / 1000000;
  return `${value < 0 ? 'cost ' : ''}£${millions.toFixed(1)}m`;
}

export function build(ctx) {
  const content = ctx.content;
  const config = content.debrief.memo;
  const findings = ctx.store.get('findings', {}) || {};
  const pinboard = ctx.store.get('pinboard', {}) || {};
  const twist = ctx.store.get('twist', {}) || {};
  const sector = ctx.store.get('sector', null);

  const claims = (content.scenes
    .flatMap((scene) => scene.interactions)
    .find((interaction) => interaction.type === 'pinboard') || {}).claims || [];
  const flagged = (pinboard.flags || [])
    .map((id) => (claims.find((claim) => claim.id === id) || {}).text)
    .filter(Boolean);

  const options = content.final.decision.options;
  const chosen = options.find((option) => option.id === (twist.choice || ctx.store.get('decision', null)));

  const lines = [];
  lines.push(`# ${config.heading}`);
  lines.push('');
  lines.push(`Date: ${today()}`);
  lines.push('');
  lines.push(`## ${config.sections.sampling}`);
  lines.push(findings.frame ? config.lines.sampling.found : config.lines.sampling.missed);
  lines.push('');
  lines.push(`## ${config.sections.aggregation}`);
  lines.push(findings.aggregation ? config.lines.aggregation.found : config.lines.aggregation.missed);
  lines.push('');
  lines.push(`## ${config.sections.claims}`);
  if (flagged.length) flagged.forEach((text) => lines.push(`- ${text}`));
  else lines.push(config.lines.claimsNone);
  lines.push('');
  lines.push(`## ${config.sections.recommendation}`);
  if (chosen) {
    lines.push(`${chosen.id} — ${chosen.title}. ${chosen.detail}`);
    if (chosen.assisted) {
      const revised = chosen.saving + content.final.twist.adjustment;
      lines.push('');
      lines.push(config.lines.revisedNote.replace('{revised}', money(revised)));
    }
  } else {
    lines.push(config.lines.recommendationNone);
  }
  lines.push('');
  lines.push(`## ${config.sections.justification}`);
  const sentence = (twist.sentence || '').trim();
  lines.push(sentence ? `> ${sentence}` : config.lines.justificationNone);
  lines.push('');
  lines.push(`## ${config.sections.blindSpot}`);
  content.debrief.blindSpot.questions.forEach((question) => lines.push(`- ${question}`));

  const set = content.debrief.sectors.options.find((option) => option.id === sector);
  if (set) {
    lines.push('');
    lines.push(`## ${config.sections.prompts} — ${set.label}`);
    set.prompts.forEach((prompt) => lines.push(`- ${prompt}`));
  }

  lines.push('');
  lines.push('---');
  lines.push(config.footer);
  lines.push('');

  return lines.join('\n');
}

export function mount(host, config, ctx) {
  const memoConfig = ctx.content.debrief.memo;
  host.classList.add('stack', 'stack--tight');

  append(host, el('h2', { text: memoConfig.title }));
  append(host, el('p', { class: 'scene__sub', text: memoConfig.instruction }));

  const preview = el('pre', { class: 'memo-preview', tabindex: '0', 'aria-label': 'Generated memo' });
  const status = el('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });

  function refresh() {
    preview.textContent = build(ctx);
  }
  refresh();
  ctx.bus.on('memo-refresh', refresh);

  const copy = el('button', { type: 'button', class: 'btn btn--paper', text: memoConfig.copyLabel });
  copy.addEventListener('click', async () => {
    const text = build(ctx);
    try {
      await navigator.clipboard.writeText(text);
      status.dataset.tone = 'ok';
      status.textContent = memoConfig.copiedLabel;
    } catch (error) {
      /* Clipboard permission refused: fall back to selecting the text so the
         team can copy it by hand. */
      const range = document.createRange();
      range.selectNodeContents(preview);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      status.dataset.tone = '';
      status.textContent = 'Memo selected — press Ctrl or Cmd + C.';
    }
    announce(status.textContent);
  });

  const download = el('button', { type: 'button', class: 'btn btn--paper', text: memoConfig.downloadLabel });
  download.addEventListener('click', () => {
    const blob = new Blob([build(ctx)], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = el('a', { href: url, download: memoConfig.filename });
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    status.dataset.tone = 'ok';
    status.textContent = `${memoConfig.filename} downloaded.`;
    announce(status.textContent);
  });

  append(host, preview);
  append(host, el('div', { class: 'memo-actions' }, [copy, download, status]));

  return { unmount() {} };
}
