/* Reweighting workbench.

   Four dimensions on which the pilot population differs — or does not — from
   the service population, all in the same shape: what the service looks like,
   what the pilot looked like, the satisfaction that is fixed, and the one
   number you can move.

   Two of them have nothing to give. Gender was already reweighted to the
   service proportions; language matched to begin with. Both let you drag and
   then put the slider back, because a control that refuses to move reads as
   broken while one that returns reads as an answer. Age is the trap: the mix
   genuinely differs, and correcting it lands back on the reported figure,
   because age was already on the weighting list. Complexity is the one that
   moves.

   Watching the figure come down under your own hand is the point. No reading
   substitutes for it, so the sliders get the care. */

import { el, append, clear, announce, bindTablistArrowKeys } from '../dom.js';

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
      /* A locked tab opens already at the service mix — that is the whole of
         what it has to say. Everything else opens at the pilot's own mix. */
      const start = tab.locked === 'service' ? segment.realMix : segment.pilotMix;
      mixes[tab.id][segment.id] = saved && typeof saved[segment.id] === 'number'
        ? saved[segment.id]
        : start;
    });
  });

  function persist() {
    ctx.store.set('workbench', { tab: activeId, mixes });
  }

  /* ---- header ---- */

  append(host, el('h3', { text: config.title }));
  append(host, el('p', { class: 'scene__sub', text: config.instruction }));

  /* The reported pair belongs on the evaluation summary beside it, not
     restated here; config.headline still supplies the benchmark the scale
     marks and the verdict reads against. */

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
    renderReweight(tab);
  }

  /* Where a locked tab's adjusted column is pinned: at the service mix, either
     because the methodology already corrected for it or because the pilot
     already matched. Dragging is allowed and then springs back — a slider that
     refuses to move reads as broken, one that returns reads as an answer. */
  function lockedTarget(tab, segment) {
    return tab.locked === 'service' ? segment.realMix : segment.pilotMix;
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

    /* One row per group: what the service looks like, what the pilot looked
       like, the satisfaction that is fixed, and the only editable number. */
    const rows = {};
    const cols = config.columns;
    const tbody = el('tbody', {});
    tab.segments.forEach((segment) => {
      const value = el('span', { class: 'mixcell__value', 'data-role': 'value' });
      const slider = el('input', {
        type: 'range', min: '0', max: '100', step: '1',
        value: String(mix[segment.id]),
        id: `mix-${tab.id}-${segment.id}`,
        'aria-label': `${segment.label} — ${cols.adjusted}`,
      });
      slider.addEventListener('input', () => {
        mix[segment.id] = Number(slider.value);
        update(true);
      });
      if (tab.locked) slider.addEventListener('change', () => springBack());
      /* Reading order runs: who they are, the satisfaction that cannot move,
         where the pilot started, where the service actually sits, and then the
         one number you can change — sitting directly beside the figure it has
         to be matched against. data-label carries each heading for the stacked
         layout on narrow screens, where the header row is gone. */
      const row = el('tr', { 'data-segment': segment.id, 'data-locked': tab.locked ? '1' : '0' }, [
        el('th', { scope: 'row' }, [
          el('span', { class: 'mixtable__group', text: segment.label }),
          segment.description
            ? el('span', { class: 'mixtable__desc', text: segment.description })
            : null,
        ]),
        el('td', { class: 'mixtable__num', 'data-label': cols.satisfaction, text: `${segment.satisfaction}%` }),
        el('td', { class: 'mixtable__num', 'data-label': cols.pilot, text: `${segment.pilotMix}%` }),
        el('td', { class: 'mixtable__num mixtable__service', 'data-label': cols.service, text: `${segment.realMix}%` }),
        el('td', { class: 'mixcell', 'data-label': cols.adjusted },
          el('div', { class: 'mixcell__inner' }, [slider, value])),
      ]);
      rows[segment.id] = { row, slider, value };
      append(tbody, row);
    });

    append(panel, el('div', { class: 'table-scroll' }, el('table', { class: 'doc__table doc__table--dark mixtable' }, [
      el('thead', {}, el('tr', {}, [
        el('th', { scope: 'col', class: 'mixtable__head-group', text: cols.group }),
        el('th', { scope: 'col', class: 'mixtable__num', text: cols.satisfaction }),
        el('th', { scope: 'col', class: 'mixtable__num', text: cols.pilot }),
        el('th', { scope: 'col', class: 'mixtable__num', text: cols.service }),
        el('th', { scope: 'col', class: 'mixtable__adjusted', text: cols.adjusted }),
      ])),
      tbody,
    ])));

    const totalNote = el('p', { class: 'doc__meta', style: 'margin:8px 0 0', 'data-role': 'total' });
    append(panel, totalNote);

    /* Stated up front as well as on the attempt, so a locked tab is signposted
       before anyone drags rather than only answering after. */
    const lockNote = tab.locked
      ? el('p', { class: 'workbench__verdict', 'data-flash': '0', text: tab.lockedNote })
      : null;
    if (lockNote) append(panel, lockNote);

    if (!tab.locked) {
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
    }

    const anchorNote = el('div', { 'data-role': 'anchor-note' });
    append(panel, anchorNote);

    let flashHandle = null;
    function springBack() {
      tab.segments.forEach((segment) => {
        const target = lockedTarget(tab, segment);
        mix[segment.id] = target;
        rows[segment.id].slider.value = String(target);
      });
      update(true);
      if (lockNote) {
        lockNote.dataset.flash = '1';
        window.clearTimeout(flashHandle);
        flashHandle = window.setTimeout(() => { lockNote.dataset.flash = '0'; }, 1400);
      }
      announce(tab.lockedNote);
    }

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
        row.value.textContent = `${mix[segment.id]}%`;
        row.slider.value = String(mix[segment.id]);
        row.slider.setAttribute('aria-valuetext', `${mix[segment.id]} per cent of the mix`);
        row.row.dataset.atReal = mix[segment.id] === segment.realMix ? '1' : '0';
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

      /* A locked tab sits on its anchor from the moment it opens, so it must
         not fire the "you found it" beat every time it is looked at. */
      if (!tab.locked && anchor && anchor.at === 'real' && anchor.id !== lastAnchor) {
        lastAnchor = anchor.id;
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
