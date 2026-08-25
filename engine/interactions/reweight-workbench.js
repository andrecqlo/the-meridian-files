/* Reweighting workbench.

   Three dimensions on which the pilot population differs — or does not — from
   the service population. Region is a thirty-second elimination. Age looks like
   the answer and is not: reweighting it lands back on the reported figure,
   because age was already on the weighting list. Complexity is the one that
   moves, and the only thing the player can change on any tab is the mix of
   people: the per-group satisfaction is fixed.

   Watching the figure come down under your own hand is the point. No reading
   substitutes for it, so the sliders get the care. */

import { el, append, clear, announce, bindTablistArrowKeys } from '../dom.js';
import { renderNoteCard } from '../scenes.js';

const SCALE_MIN = 40;
const SCALE_MAX = 100;
const TOLERANCE = 2;

function position(value) {
  const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, value));
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}

export function mount(host, config, ctx) {
  host.classList.add('card', 'workbench');

  const state = ctx.store.get('workbench', {}) || {};
  let activeId = state.tab || config.tabs[0].id;
  const mixes = {};
  config.tabs.forEach((tab) => {
    if (tab.kind !== 'reweight') return;
    const saved = (state.mixes || {})[tab.id];
    mixes[tab.id] = {};
    tab.segments.forEach((segment) => {
      mixes[tab.id][segment.id] = saved && typeof saved[segment.id] === 'number'
        ? saved[segment.id]
        : segment.pilotMix;
    });
  });

  function persist() {
    ctx.store.set('workbench', { tab: activeId, mixes });
  }

  /* ---- header ---- */

  append(host, el('h3', { text: config.title }));
  append(host, el('p', { class: 'scene__sub', text: config.instruction }));

  append(host, el('div', { class: 'headline' }, [
    el('div', { class: 'headline__pair' }, [
      el('span', { class: 'headline__value', text: `${config.headline.current}%` }),
      el('span', { class: 'headline__label', text: config.headline.currentLabel }),
    ]),
    el('span', { class: 'headline__vs', 'aria-hidden': 'true', text: 'vs' }),
    el('div', { class: 'headline__pair' }, [
      el('span', { class: 'headline__value', text: `${config.headline.pilot}%` }),
      el('span', { class: 'headline__label', text: config.headline.pilotLabel }),
    ]),
  ]));

  /* A nudge towards the dimension that matters. Once the team has found it,
     the note has done its job and comes down. */
  const diagnosed = (ctx.store.get('workbenchSeen', {}) || {})[config.annotation && config.annotation.retireOn];
  if (config.annotation && !diagnosed) {
    append(host, renderNoteCard(config.annotation.title, [config.annotation], ctx));
  }

  /* ---- tabs ---- */

  const tablist = el('div', { class: 'tabs', role: 'tablist', 'aria-label': config.tabsLabel });
  const panel = el('div', { class: 'workbench__panel', role: 'tabpanel', id: 'workbench-panel', tabindex: '0' });
  const tabs = config.tabs.map((tab) => {
    const node = el('button', {
      type: 'button', class: 'tab', role: 'tab', id: `wtab-${tab.id}`,
      'aria-selected': tab.id === activeId ? 'true' : 'false',
      'aria-controls': 'workbench-panel',
      tabindex: tab.id === activeId ? '0' : '-1',
      text: tab.label,
    });
    node.addEventListener('click', () => setTab(tab.id));
    append(tablist, node);
    return node;
  });
  bindTablistArrowKeys(tablist, { items: config.tabs, getActiveId: () => activeId, onSelect: setTab, tabs });
  append(host, tablist);
  append(host, panel);

  function setTab(id) {
    activeId = id;
    tabs.forEach((tab, index) => {
      const on = config.tabs[index].id === id;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    persist();
    renderPanel();
    ctx.progress();
  }

  /* ---- panels ---- */

  function renderPanel() {
    clear(panel);
    const tab = config.tabs.find((t) => t.id === activeId);
    panel.setAttribute('aria-labelledby', `wtab-${tab.id}`);
    if (tab.kind === 'static') renderStatic(tab);
    else renderReweight(tab);
  }

  function renderStatic(tab) {
    append(panel, el('div', { class: 'table-scroll' }, el('table', { class: 'doc__table doc__table--dark' }, [
      el('thead', {}, el('tr', {}, tab.columns.map((c) => el('th', { scope: 'col', text: c })))),
      el('tbody', {}, tab.rows.map((row) => el('tr', {}, row.map((cell, i) =>
        el(i === 0 ? 'th' : 'td', i === 0 ? { scope: 'row', text: cell } : { text: cell }))))),
    ])));
    append(panel, el('p', { class: 'workbench__verdict', text: tab.note }));
  }

  function renderReweight(tab) {
    const mix = mixes[tab.id];
    const figureValue = el('span', { 'data-role': 'value', text: '—' });
    const figure = el('span', { class: 'readout__figure' }, [figureValue, el('sup', { text: '%' })]);
    const verdict = el('p', { class: 'readout__verdict', 'data-role': 'verdict' });
    const scale = el('div', { class: 'scale' }, [
      el('span', { class: 'scale__track' }),
      el('span', { class: 'scale__fill', 'data-role': 'fill' }),
      el('span', { class: 'scale__mark', style: `left:${position(config.headline.current)}%` },
        el('span', { text: `${config.headline.currentLabel} ${config.headline.current}%` })),
      el('span', { class: 'scale__pin', 'data-role': 'pin' }),
    ]);
    const readout = el('div', { class: 'readout', 'data-role': 'readout', 'data-state': 'above' }, [
      el('div', {}, [el('p', { class: 'readout__label', text: config.readoutLabel }), figure]),
      el('div', {}, [scale, verdict]),
    ]);
    append(panel, readout);

    const mixbar = el('div', { class: 'mixbar', 'aria-hidden': 'true' }, tab.segments.map((segment) =>
      el('span', { class: 'mixbar__part', 'data-part': segment.id })));
    append(panel, el('div', { style: 'margin:18px 0 6px' }, mixbar));
    const totalNote = el('p', { class: 'doc__meta', style: 'margin:6px 0 18px', 'data-role': 'total' });
    append(panel, totalNote);

    const rows = {};
    const list = el('div', { class: 'segments' });
    tab.segments.forEach((segment) => {
      const value = el('span', { class: 'segment__value', 'data-role': 'value' });
      const slider = el('input', {
        type: 'range', min: '0', max: '100', step: '1',
        value: String(mix[segment.id]),
        id: `mix-${tab.id}-${segment.id}`,
        'aria-describedby': `desc-${tab.id}-${segment.id}`,
      });
      slider.addEventListener('input', () => {
        mix[segment.id] = Number(slider.value);
        update(true);
      });
      const row = el('div', { class: 'segment', 'data-segment': segment.id }, [
        el('label', { class: 'segment__label', for: `mix-${tab.id}-${segment.id}`, text: segment.label }),
        el('span', { class: 'segment__fixed' }, [tab.fixedLabel + ' ', el('b', { text: `${segment.satisfaction}%` })]),
        segment.description
          ? el('p', { class: 'segment__desc', id: `desc-${tab.id}-${segment.id}`, text: segment.description })
          : el('p', { class: 'segment__desc', id: `desc-${tab.id}-${segment.id}`, text: '' }),
        el('div', { class: 'segment__slider' }, [slider, value]),
      ]);
      rows[segment.id] = { row, slider, value };
      append(list, row);
    });
    append(panel, list);

    append(panel, el('div', { class: 'refcards' }, [
      el('div', { class: 'refcard' }, [
        el('p', { class: 'refcard__title', text: tab.reference.title }),
        el('p', { class: 'refcard__mix', text: tab.segments.map((s) => s.realMix).join(' / ') }),
        el('p', { class: 'refcard__source', text: tab.reference.source }),
      ]),
      el('div', { class: 'refcard refcard--quiet' }, [
        el('p', { class: 'refcard__title', text: tab.pilotReference.title }),
        el('p', { class: 'refcard__mix', text: tab.segments.map((s) => s.pilotMix).join(' / ') }),
        el('p', { class: 'refcard__source', text: tab.pilotReference.source }),
      ]),
    ]));

    append(panel, el('button', {
      type: 'button', class: 'btn btn--quiet', style: 'margin-top:14px',
      text: tab.resetLabel,
      onClick: () => {
        tab.segments.forEach((segment) => {
          mix[segment.id] = segment.pilotMix;
          rows[segment.id].slider.value = String(segment.pilotMix);
        });
        update(true);
      },
    }));

    const anchorNote = el('div', { 'data-role': 'anchor-note' });
    append(panel, anchorNote);

    let announceHandle = null;
    let lastAnchor = null;
    let snapped = null;
    let released = null;

    function near(kind) {
      return tab.segments.every((segment) => {
        const target = kind === 'real' ? segment.realMix : segment.pilotMix;
        return Math.abs(mix[segment.id] - target) <= TOLERANCE;
      });
    }

    function snapTo(kind) {
      tab.segments.forEach((segment) => {
        const target = kind === 'real' ? segment.realMix : segment.pilotMix;
        mix[segment.id] = target;
        rows[segment.id].slider.value = String(target);
      });
    }

    function update(fromInput) {
      /* Snapping keeps the reference mixes exact, so the figure never wobbles
         by a point between two roundings of the same population. Moving a
         slider releases the snap, and the same anchor will not grab again
         until the mix has left its zone — otherwise a keyboard user pressing
         an arrow key would be pulled straight back and could never leave. */
      if (fromInput && snapped) {
        released = snapped;
        snapped = null;
      }
      let anchor = null;
      if (snapped) {
        anchor = (tab.anchors || []).find((entry) => entry.id === snapped) || null;
      } else {
        const candidate = (tab.anchors || []).find((entry) => entry.id !== released && near(entry.at));
        if (candidate) {
          if (fromInput) snapTo(candidate.at);
          snapped = candidate.id;
          anchor = candidate;
        }
      }
      if (released) {
        const previous = (tab.anchors || []).find((entry) => entry.id === released);
        if (!previous || !near(previous.at)) released = null;
      }

      const total = tab.segments.reduce((sum, segment) => sum + mix[segment.id], 0);
      const weighted = tab.segments.reduce((sum, segment) => sum + (mix[segment.id] * segment.satisfaction), 0);
      const computed = total > 0 ? weighted / total : null;
      const shown = anchor ? anchor.value : (computed === null ? null : Math.round(computed));

      tab.segments.forEach((segment) => {
        const row = rows[segment.id];
        row.value.textContent = String(mix[segment.id]);
        row.slider.value = String(mix[segment.id]);
        row.slider.setAttribute('aria-valuetext', `${mix[segment.id]} per cent of the mix`);
        row.row.dataset.atReal = mix[segment.id] === segment.realMix ? '1' : '0';
        const part = mixbar.querySelector(`[data-part="${segment.id}"]`);
        part.style.flexGrow = String(Math.max(mix[segment.id], 0.001));
        part.textContent = mix[segment.id] >= 8 ? String(mix[segment.id]) : '';
      });

      figureValue.textContent = shown === null ? '—' : String(shown);
      scale.querySelector('[data-role="fill"]').style.width = shown === null ? '0%' : `${position(shown)}%`;
      scale.querySelector('[data-role="pin"]').style.left = shown === null ? '0%' : `${position(shown)}%`;
      totalNote.textContent = total === 100
        ? 'Mix totals 100%.'
        : `Mix totals ${total}% — the figure is normalised to 100%.`;

      const benchmark = config.headline.current;
      let stateName = 'above';
      if (shown === null) stateName = 'above';
      else if (anchor && anchor.at === 'real') stateName = shown < benchmark ? 'below' : 'match';
      else if (shown < benchmark) stateName = 'below';
      readout.dataset.state = stateName;
      verdict.textContent = shown === null
        ? 'Nobody in the mix.'
        : `${shown}% against ${benchmark}% for ${config.headline.currentLabel.toLowerCase()}.`;

      clear(anchorNote);
      if (anchor && anchor.note) {
        append(anchorNote, el('p', { class: 'samnote', text: anchor.note }));
      }

      if (anchor && anchor.at === 'real' && anchor.id !== lastAnchor) {
        lastAnchor = anchor.id;
        ctx.store.patch('workbenchSeen', { [anchor.id]: true });
        ctx.audio.play('twist');
        announce(`${config.readoutLabel} ${shown} per cent. ${anchor.note || ''}`);
        if (anchor.finding) ctx.recordFinding(anchor.finding);
      } else if (!anchor) {
        lastAnchor = null;
      }

      if (fromInput) {
        persist();
        ctx.progress();
        window.clearTimeout(announceHandle);
        announceHandle = window.setTimeout(() => {
          if (!anchor) announce(`${config.readoutLabel} ${shown} per cent.`);
        }, 700);
      }
    }

    update(false);
  }

  renderPanel();
  return { unmount() {} };
}
