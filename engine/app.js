/* Bootstrap. Loads content, wires the shared services (state, timer, hints,
   torch, audio, router) and hands a context object to whatever scene the hash
   asks for. Nothing here knows the specifics of any one case. */

import { createStore, prefs } from './state.js';
import { createTimer, formatClock } from './timer.js';
import { createHints } from './hints.js';
import { createRouter } from './router.js';
import { createTorch } from './interactions/torch.js';
import { audio } from './audio.js';
import { verify, normalise, decode } from './verify.js';
import { el, append, clear, announce, focusFirst } from './dom.js';
import * as scenes from './scenes.js';

const CASE_ID = 'case01';
const SERIES = ['case01', 'case02', 'case03', 'case04'];

function createBus() {
  const listeners = new Map();
  return {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
      return () => listeners.get(name).delete(fn);
    },
    emit(name, payload) {
      const set = listeners.get(name);
      if (set) Array.from(set).forEach((fn) => fn(payload));
    },
    reset() {
      listeners.clear();
    },
  };
}

async function loadContent() {
  const files = await Promise.all(SERIES.map(async (id) => {
    const response = await fetch(`content/${id}.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Could not load ${id}.json`);
    return response.json();
  }));
  return files;
}

function boot(series) {
  const content = series[0];
  const store = createStore(CASE_ID);
  const timer = createTimer(store, content.durationSeconds);
  const hints = createHints(store);
  const bus = createBus();
  const main = document.getElementById('main');
  const chrome = document.getElementById('chrome');

  const ctx = {
    caseId: CASE_ID,
    content,
    series: series.map((entry) => ({
      id: entry.id, number: entry.number, title: entry.title,
      teaser: entry.teaser, locked: entry.locked === true,
    })),
    store, timer, hints, bus, audio, verify, normalise, decode,
    router: null,
    torch: null,
  };

  ctx.torch = createTorch(ctx);

  /* ---- chrome ---- */

  const timerNode = document.getElementById('timer');
  const timerValue = document.getElementById('timer-value');
  const timerNote = document.getElementById('timer-note');
  const backButton = document.getElementById('btn-back');
  const backLabel = document.getElementById('btn-back-label');
  const torchButton = document.getElementById('btn-torch');
  const soundButton = document.getElementById('btn-sound');
  const caseLabel = document.getElementById('chrome-case');

  const DEFAULT_NOTE = 'to sign-off';

  timer.subscribe((state) => {
    timerValue.textContent = formatClock(state.remaining);
    timerNode.dataset.level = state.threshold.level;
    /* Urgency is never carried by colour or size alone — the note changes too. */
    timerNote.textContent = state.threshold.note || DEFAULT_NOTE;
    timerValue.setAttribute('aria-label',
      state.remaining < 0
        ? `${formatClock(state.remaining)} past the board meeting`
        : `${formatClock(state.remaining)} remaining`);
  });

  torchButton.addEventListener('click', () => {
    ctx.torch.toggle();
    announce(ctx.torch.on ? 'Torch on. Move it over a document.' : 'Torch off.');
  });
  torchButton.addEventListener('keydown', (event) => {
    const step = event.shiftKey ? 60 : 24;
    const moves = {
      ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0],
    };
    if (!moves[event.key] || !ctx.torch.on) return;
    event.preventDefault();
    ctx.torch.nudge(moves[event.key][0], moves[event.key][1]);
  });

  function syncSound() {
    const on = audio.enabled;
    soundButton.textContent = on ? 'Sound on' : 'Sound off';
    soundButton.setAttribute('aria-pressed', on ? 'true' : 'false');
    const landing = document.getElementById('landing-sound');
    if (landing) {
      landing.textContent = on ? 'Sound on' : 'Sound off';
      landing.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  soundButton.addEventListener('click', () => {
    audio.toggle();
    syncSound();
  });
  ctx.syncSound = syncSound;
  syncSound();

  /* ---- shared context helpers ---- */

  ctx.toast = function toast(text, tone) {
    const rail = document.getElementById('toast-rail');
    const node = el('div', { class: 'toast', 'data-tone': tone || 'uv', text });
    append(rail, node);
    announce(text);
    window.setTimeout(() => {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 6000);
  };

  ctx.progress = function progress() {
    if (ctx.activeTracks) ctx.activeTracks.forEach((track) => hints.progress(track));
  };

  ctx.completeTrack = function completeTrack(track) {
    store.patch('progress', { [track]: true });
    hints.solved(track);
  };

  ctx.recordFinding = function recordFinding(id) {
    const found = store.get('findings', {}) || {};
    if (found[id]) return;
    found[id] = true;
    store.set('findings', found);
  };

  ctx.resetCase = function resetCase() {
    hints.endAll();
    timer.stop();
    store.reset();
    ctx.torch.setOn(false);
    window.location.hash = '#/';
    window.location.reload();
  };

  /* Sam's notes surface here. Tiers 1 and 2 arrive as marginalia that need the
     torch; tier 3 is plain text, because by then nobody should be stuck. */
  ctx.mountHints = function mountHints(scene, host) {
    const tracks = [scene.track].concat(scene.trackSecondary ? [scene.trackSecondary] : []);
    ctx.activeTracks = tracks.filter(Boolean);
    const sets = {
      [scene.track]: scene.hints || [],
      [scene.trackSecondary]: scene.hintsSecondary || [],
    };
    ctx.activeTracks.forEach((track) => {
      hints.begin(track, (tier) => {
        const text = (sets[track] || [])[tier - 1];
        if (!text) return;
        renderHint(host, track, tier, text, ctx);
      });
    });
  };

  ctx.render = function render() {
    if (ctx.router) ctx.router.replace(ctx.router.current ? ctx.router.current.path : '');
  };

  /* ---- routing ---- */

  const router = createRouter(async (route) => {
    bus.reset();
    hints.endAll();
    ctx.activeTracks = [];
    clear(main);

    const path = route.path;
    const isLanding = path === '' || path === 'index.html';

    chrome.hidden = isLanding;
    document.body.dataset.route = path || 'landing';

    if (isLanding) {
      scenes.renderLanding(main, ctx);
      finish();
      return;
    }

    if (!timer.isStarted() && path !== `${CASE_ID}`) {
      router.replace(CASE_ID);
      return;
    }

    if (path === CASE_ID) {
      caseLabel.textContent = `Case ${content.number}`;
      backButton.hidden = false;
      backLabel.textContent = 'Menu';
      backButton.onclick = () => router.go('');
      torchButton.hidden = true;
      scenes.renderIntro(main, ctx);
      finish();
      return;
    }

    timer.resume();
    store.set('lastRoute', path);
    caseLabel.textContent = `Case ${content.number} · ${content.title}`;
    torchButton.hidden = !ctx.torch.held;

    if (path === `${CASE_ID}/desk`) {
      backButton.hidden = false;
      backLabel.textContent = 'Menu';
      backButton.onclick = () => router.go('');
      scenes.renderDesk(main, ctx);
      finish();
      return;
    }

    backButton.hidden = false;
    backLabel.textContent = 'Desk';
    backButton.onclick = () => router.go(`${CASE_ID}/desk`);

    const scene = (content.scenes || []).find((entry) => entry.route === path);
    if (scene) {
      await scenes.renderChallenge(main, scene, ctx);
      finish();
      return;
    }

    const special = await renderSpecial(path, main, ctx);
    if (special) {
      finish();
      return;
    }

    router.replace(`${CASE_ID}/desk`);
  });

  function finish() {
    ctx.torch.refresh();
    focusFirst(main);
  }

  ctx.router = router;
  router.start();
}

/* Scenes that are not challenge scenes: the locked file, the twist and the
   debrief. Each is a registered interaction driven by content. */
async function renderSpecial(path, main, ctx) {
  const map = {
    [`${CASE_ID}/file`]: 'decision',
    [`${CASE_ID}/twist`]: 'timed-twist',
    [`${CASE_ID}/debrief`]: 'debrief',
  };
  const type = map[path];
  if (!type) return false;
  const { isBuilt, load } = await import('./registry.js');
  if (!isBuilt(type)) return false;
  const mod = await load(type);
  const host = el('div', { 'data-interaction': type });
  append(main, host);
  mod.mount(host, ctx.content.final || {}, ctx);
  return true;
}

function renderHint(host, track, tier, text, ctx) {
  if (host.querySelector(`[data-hint="${track}-${tier}"]`)) return;
  /* Tiers 1 and 2 arrive as marginalia to be found. Tier 3 is plain text:
     by then nobody should still be stuck. */
  const plain = tier >= 3;
  let node;
  if (plain) {
    node = el('article', { class: 'doc doc--screen doc--note-card' }, [
      el('h4', { class: 'doc__title', text: 'A note in the margin' }),
      el('p', { class: 'samnote', style: 'margin:0', text }),
    ]);
  } else {
    node = scenes.renderNoteCard('A note in the margin',
      [{ id: `hint-${track}-${tier}`, text }], ctx);
    node.dataset.newNote = '1';
  }
  node.dataset.hint = `${track}-${tier}`;
  append(host, node);
  ctx.torch.refresh();
  announce(plain ? `Sam left a note. ${text}` : 'Sam left a note in the margin.');
}

loadContent()
  .then(boot)
  .catch((error) => {
    document.getElementById('main').innerHTML =
      `<p style="padding:40px">Could not start: ${error.message}. If you opened this file directly, serve the folder over HTTP instead.</p>`;
  });
