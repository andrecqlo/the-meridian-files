/* The impact assessment as claim cards, an evidence tray, and string.

   Run a string from each claim to whatever holds it up. Some claims hold:
   the board is not uniformly rotten, and a game that made everything rotten
   would teach the wrong reflex. Two claims lead somewhere that is not evidence,
   and flagging exactly those two is what completes the board. */

import { el, append, clear, announce } from '../dom.js';
import { createDnD } from './drag.js';

export function mount(host, config, ctx) {
  host.classList.add('card');

  const saved = ctx.store.get('pinboard', {}) || {};
  const links = Object.assign({}, saved.links || {});
  const flags = new Set(saved.flags || []);
  const revealed = new Set(saved.revealed || []);
  const opened = new Set(saved.opened || []);
  let wrongCount = 0;
  let complete = ctx.store.get('progress', {})[config.track] === true;

  function persist() {
    ctx.store.set('pinboard', {
      links, flags: Array.from(flags), revealed: Array.from(revealed), opened: Array.from(opened),
    });
  }

  append(host, el('h3', { text: config.title }));
  append(host, el('p', { class: 'scene__sub', text: config.instruction }));

  const feedback = el('p', { class: 'feedback', role: 'status', 'aria-live': 'polite' });
  const strings = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  strings.setAttribute('class', 'board__strings');
  strings.setAttribute('aria-hidden', 'true');

  const claimsColumn = el('div', { class: 'claims' });
  const trayColumn = el('div', { class: 'evidence-tray' });
  const board = el('div', { class: 'board' }, [
    strings,
    el('div', { class: 'board__grid columns' }, [
      el('div', {}, [el('h4', { class: 'board__head', text: config.claimsLabel }), claimsColumn]),
      el('div', {}, [el('h4', { class: 'board__head', text: config.evidenceLabel }), trayColumn]),
    ]),
  ]);
  append(host, board);
  append(host, feedback);

  const dnd = createDnD({
    onSelect(item) {
      if (!item) return;
      announce(`${item.label} selected. Now choose a piece of evidence.`);
    },
  });

  const claimNodes = {};
  const evidenceNodes = {};

  function evidenceById(id) {
    return config.evidence.find((entry) => entry.id === id);
  }

  function say(text, tone) {
    feedback.dataset.tone = tone || 'bad';
    clear(feedback);
    append(feedback, text);
  }

  /* ---- string drawing ---- */

  function drawStrings() {
    clear(strings);
    const frame = board.getBoundingClientRect();
    strings.setAttribute('viewBox', `0 0 ${frame.width} ${frame.height}`);
    strings.setAttribute('width', String(frame.width));
    strings.setAttribute('height', String(frame.height));
    Object.keys(links).forEach((claimId) => {
      const claim = claimNodes[claimId];
      const target = evidenceNodes[links[claimId]];
      if (!claim || !target) return;
      const a = claim.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const x1 = a.right - frame.left;
      const y1 = a.top + a.height / 2 - frame.top;
      const x2 = b.left - frame.left;
      const y2 = b.top + b.height / 2 - frame.top;
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const verdict = (config.claims.find((c) => c.id === claimId) || {}).verdict;
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + 40} ${y1}, ${x2 - 40} ${y2}, ${x2} ${y2}`);
      path.setAttribute('class', `board__string board__string--${verdict}`);
      strings.appendChild(path);
      /* A pin at each end, so the string reads as run between two pins rather
         than drawn between two boxes. Same anchor points the curve already
         uses, so nothing about the geometry moves. */
      [[x1, y1], [x2, y2]].forEach(([cx, cy]) => {
        const pin = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pin.setAttribute('cx', String(cx));
        pin.setAttribute('cy', String(cy));
        pin.setAttribute('r', '4');
        pin.setAttribute('class', 'board__pin');
        strings.appendChild(pin);
      });
    });
  }

  /* ---- claims ---- */

  function renderClaims() {
    clear(claimsColumn);
    config.claims.forEach((claim) => {
      const linked = links[claim.id];
      const node = el('button', {
        type: 'button',
        class: 'claim',
        'data-linked': linked ? '1' : '0',
        'data-flagged': flags.has(claim.id) ? '1' : '0',
        'aria-describedby': `claim-state-${claim.id}`,
      }, [
        el('span', { class: 'claim__text', text: claim.text }),
      ]);

      const row = el('span', { class: 'claim__row', id: `claim-state-${claim.id}` });
      if (linked) {
        append(row, el('span', {
          class: `tag ${verdictTag(claim.verdict)}`,
          text: config.verdicts[claim.verdict],
        }));
        append(row, el('span', { class: 'claim__linked', text: `→ ${evidenceById(linked).label}` }));
      } else {
        append(row, el('span', { class: 'claim__linked', text: config.unstrungLabel }));
      }
      append(node, row);
      claimsColumn.appendChild(node);
      claimNodes[claim.id] = node;

      dnd.draggable(node, { id: claim.id, label: claim.text, kind: 'claim' }, {
        disabled: () => complete,
      });

      if (linked && claim.note) {
        append(claimsColumn, el('p', { class: 'samnote samnote--claim', text: claim.note }));
      }

      /* Flagging is a separate, deliberate act — the string alone is not a
         judgement, and the board only completes when the judgement is made. */
      if (linked && !complete) {
        const flagButton = el('button', {
          type: 'button',
          class: 'claim__flag',
          'aria-pressed': flags.has(claim.id) ? 'true' : 'false',
          text: flags.has(claim.id) ? config.flaggedLabel : config.flagLabel,
        });
        flagButton.addEventListener('click', () => {
          if (flags.has(claim.id)) flags.delete(claim.id);
          else flags.add(claim.id);
          persist();
          ctx.progress();
          check();
          renderAll();
        });
        append(claimsColumn, el('div', { class: 'claim__actions' }, flagButton));
      } else if (linked && complete && flags.has(claim.id)) {
        append(claimsColumn, el('div', { class: 'claim__actions' },
          el('span', { class: 'tag tag--bad', text: config.flaggedLabel })));
      }
    });
  }

  function verdictTag(verdict) {
    if (verdict === 'supported') return 'tag--ok';
    if (verdict === 'plausible') return 'tag--warn';
    return 'tag--bad';
  }

  /* ---- evidence ---- */

  function renderEvidence() {
    clear(trayColumn);
    config.evidence.forEach((entry) => {
      if (entry.hidden && !revealed.has(entry.id)) return;
      const used = Object.values(links).includes(entry.id);
      const node = el('button', {
        type: 'button',
        class: 'evidence',
        'data-used': used ? '1' : '0',
        'data-enlarged': opened.has(entry.id) ? '1' : '0',
      }, [
        el('span', { class: 'evidence__label', text: entry.label }),
      ]);
      trayColumn.appendChild(node);
      evidenceNodes[entry.id] = node;
      dnd.dropzone(node, {
        accepts: (item) => item && item.kind === 'claim' && !complete,
        onDrop: (item) => link(item.id, entry.id),
      });

      const detailId = `ev-detail-${entry.id}`;
      const detail = el('p', { class: 'evidence__detail', id: detailId, hidden: !opened.has(entry.id), text: entry.detail });
      const more = el('button', {
        type: 'button',
        class: 'evidence__more',
        'aria-expanded': opened.has(entry.id) ? 'true' : 'false',
        'aria-controls': detailId,
        text: opened.has(entry.id) ? config.lessLabel : config.moreLabel,
      });
      more.addEventListener('click', () => {
        const next = !opened.has(entry.id);
        if (next) opened.add(entry.id); else opened.delete(entry.id);
        detail.hidden = !next;
        more.setAttribute('aria-expanded', next ? 'true' : 'false');
        more.textContent = next ? config.lessLabel : config.moreLabel;
        node.dataset.enlarged = next ? '1' : '0';
        if (next && entry.finding) ctx.recordFinding(entry.finding);
        if (next && entry.terminal) say(entry.behindNote, 'bad');
        persist();
        ctx.progress();
        window.requestAnimationFrame(drawStrings);
      });
      const wrap = el('div', { class: 'evidence__wrap' }, [more, detail]);
      if (entry.annotation) {
        append(wrap, el('span', {
          class: 'uv-note',
          'data-note-id': `ev-note-${entry.id}`,
          'data-lit': '0',
          'data-inspect': opened.has(entry.id) && !ctx.torch.held ? '1' : '0',
          text: entry.annotation,
        }));
      }
      trayColumn.appendChild(wrap);
    });
  }

  /* ---- linking ---- */

  function link(claimId, evidenceId) {
    if (complete) return;
    const claim = config.claims.find((entry) => entry.id === claimId);
    if (!claim) return;
    if (claim.evidence !== evidenceId) {
      ctx.audio.play('wrong');
      ctx.hints.stumble(config.track);
      const pool = config.wrongLinkResponses;
      say(pool[wrongCount % pool.length], 'bad');
      wrongCount += 1;
      return;
    }
    links[claimId] = evidenceId;
    ctx.audio.play('unlock');
    ctx.progress();
    const target = evidenceById(evidenceId);
    if (target && target.behind) {
      revealed.add(target.behind);
      say(target.behindNote, 'bad');
    } else {
      say(config.linkedResponse, 'ok');
    }
    persist();
    check();
    renderAll();
  }

  /* ---- completion ---- */

  function check() {
    if (complete) return;
    const allLinked = config.claims.every((claim) => links[claim.id] === claim.evidence);
    if (!allLinked) return;
    const wanted = config.claims.filter((claim) => claim.verdict === 'unsupported').map((c) => c.id);
    const flagged = Array.from(flags);
    const exact = wanted.length === flagged.length && wanted.every((id) => flags.has(id));
    if (!exact) {
      if (flagged.length) say(config.flagWrongResponse, 'bad');
      else say(config.flagPromptResponse, 'bad');
      return;
    }
    complete = true;
    clear(feedback);
    feedback.dataset.tone = '';
    ctx.completeTrack(config.track);
    (config.findings || []).forEach((id) => ctx.recordFinding(id));
    ctx.audio.play('unlock');
    ctx.bus.emit('solved', { track: config.track, id: config.id });
    if (ctx.startSecondaryHints) ctx.startSecondaryHints();
    persist();
  }

  function renderComplete() {
    const panel = el('div', { class: 'unlock', style: 'margin-top:20px' }, [
      el('p', { class: 'unlock__word', text: config.successTitle }),
      el('p', { text: config.successBody }),
      el('p', { class: 'samnote', text: config.successNote }),
    ]);
    append(host, panel);
  }

  function renderAll() {
    renderClaims();
    renderEvidence();
    const done = host.querySelector('.unlock');
    if (done) done.remove();
    if (complete) renderComplete();
    window.requestAnimationFrame(() => {
      drawStrings();
      ctx.torch.refresh();
    });
  }

  renderAll();
  const onResize = () => drawStrings();
  window.addEventListener('resize', onResize);

  return {
    unmount() {
      window.removeEventListener('resize', onResize);
      dnd.destroy();
    },
  };
}
