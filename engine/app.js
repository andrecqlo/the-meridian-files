/* Bootstrap. Loads content, wires the shared services (state, timer, hints,
   torch, audio, router) and hands a context object to whatever scene the hash
   asks for. Nothing here knows the specifics of any one case. */

import { createStore, prefs } from './state.js';
import { createTimer, formatClock } from './timer.js';
import { createHints } from './hints.js';
import { createPace } from './pace.js';
import { createRouter } from './router.js';
import { createTorch } from './interactions/torch.js';
import { createInventory } from './inventory.js';
import { audio } from './audio.js';
import { verify, normalise, decode, checkerAvailable, CHECKER_UNAVAILABLE } from './verify.js';
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
  const pace = createPace(store, timer, content.pace.milestones);
  const bus = createBus();
  const main = document.getElementById('main');
  const chrome = document.getElementById('chrome');
  const tray = document.getElementById('inventory');

  const ctx = {
    caseId: CASE_ID,
    content,
    series: series.map((entry) => ({
      id: entry.id, number: entry.number, title: entry.title,
      teaser: entry.teaser, locked: entry.locked === true,
    })),
    store, timer, hints, bus, audio, verify, normalise, decode,
    checkerAvailable, checkerMessage: CHECKER_UNAVAILABLE,
    router: null,
    torch: null,
  };

  ctx.torch = createTorch(ctx);
  ctx.inventory = createInventory(ctx);
  ctx.inventory.mount(tray);
  ctx.pace = pace;
  hints.setPace(() => pace.factor());

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

  /* Pace escalations. Each one fires once, on the way down. */
  pace.subscribe((level) => {
    document.body.dataset.paceLevel = String(level);
    if (level >= 2) hints.forceNextTier();
    if (level >= 3) ctx.openLatestNote();
    if (level > 0) store.patch('paceSeen', { [`level${level}`]: true });
  });
  timer.subscribe(() => {
    if (timer.isStarted()) pace.evaluate();
  });

  /* The last surfaced note, opened once and then dismissible. Used only when a
     team is more than three minutes behind the line. */
  ctx.openLatestNote = function openLatestNote() {
    const notes = document.querySelectorAll('[data-hint] .uv-note');
    const note = notes[notes.length - 1];
    if (!note || note.dataset.autoOpened === '1') return;
    note.dataset.autoOpened = '1';
    note.dataset.inspect = '1';
    const card = note.closest('.doc');
    if (!card || card.querySelector('.note-dismiss')) return;
    card.dataset.newNote = '0';
    const dismiss = el('button', {
      type: 'button', class: 'btn btn--quiet note-dismiss', text: 'Put it back',
    });
    dismiss.addEventListener('click', () => {
      note.dataset.inspect = '0';
      dismiss.remove();
    });
    append(card, dismiss);
    announce(`Sam left a note. ${note.textContent}`);
  };

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

  /* The room's status bar when there is one, a toast everywhere else. */
  ctx.status = function status(text) {
    if (!text) return;
    if (ctx.sayStatus) ctx.sayStatus(text);
    else ctx.toast(text);
  };

  ctx.toast = function toast(text, tone) {
    const rail = document.getElementById('toast-rail');
    const node = el('div', { class: 'toast', 'data-tone': tone || 'uv', text });
    append(rail, node);
    announce(text);
    window.setTimeout(() => {
      if (node.parentNode) node.parentNode.removeChild(node);
    }, 6000);
  };

  /* Anything mounted for the current scene, so window listeners and intervals
     go away when the route does. */
  ctx.mounted = [];
  ctx.track = function track(instance) {
    if (instance && typeof instance.unmount === 'function') ctx.mounted.push(instance);
    return instance;
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

  /* What the room does when you click something, and what it says when you
     click something you cannot use yet. Progress gates the sections; an item
     gate is handled the same way, so a hotspot only ever has one blocker. */
  ctx.deskState = function deskState(object) {
    const progress = store.get('progress', {}) || {};
    const responses = object.responses || {};
    const inventory = store.get('inventory', []) || [];
    if (object.unlockedBy && progress[object.unlockedBy] !== true) {
      return { kind: 'blocked', response: responses.locked, label: `${object.label}. ${responses.locked || 'Not yet.'}` };
    }
    if (object.requiresItem && inventory.indexOf(object.requiresItem) < 0) {
      return { kind: 'blocked', response: responses.noItem, label: `${object.label}. ${responses.noItem || 'Not yet.'}` };
    }
    if (object.id === 'torch' && ctx.torch.held) {
      return { kind: 'taken', response: responses.taken, label: `${object.label} — taken` };
    }
    if (object.track && progress[object.track] === true) {
      return { kind: 'done', response: responses.look, label: `${object.label} — read` };
    }
    return { kind: 'open', response: responses.look, label: object.label };
  };

  ctx.deskActivate = function deskActivate(object, say) {
    const responses = object.responses || {};
    /* Re-rendering the room rebuilds the status bar, so anything worth saying
       has to survive the redraw. */
    if (object.action === 'takeTorch') {
      if (ctx.torch.held) { say(responses.taken); return; }
      ctx.torch.pickUp();
      ctx.inventory.add('torch');
      audio.play('unlock');
      ctx.pendingStatus = responses.taken;
      ctx.render();
      return;
    }
    if (object.gives) {
      if (ctx.inventory.has(object.gives)) { say(responses.empty || responses.look); return; }
      ctx.inventory.add(object.gives);
      audio.play('unlock');
      ctx.pendingStatus = responses.taken;
      ctx.render();
      return;
    }
    if (object.route) {
      if (object.requiresItem && ctx.inventory.armed === object.requiresItem) {
        ctx.inventory.disarm();
        say(responses.used);
      }
      router.go(object.route);
      return;
    }
    say(responses.look);
  };

  ctx.resetCase = function resetCase() {
    hints.endAll();
    timer.stop();
    /* Put the torch away before the wipe, or switching it off writes a key
       straight back into the namespace we just cleared. */
    ctx.torch.setOn(false);
    store.reset();
    window.location.hash = '#/';
    window.location.reload();
  };

  /* Sam's notes surface here. Tiers 1 and 2 arrive as marginalia that need the
     torch; tier 3 is plain text, because by then nobody should be stuck. */
  ctx.mountHints = function mountHints(scene, host) {
    const sets = {
      [scene.track]: scene.hints || [],
      [scene.trackSecondary]: scene.hintsSecondary || [],
    };

    function begin(track) {
      if (!track || ctx.activeTracks.indexOf(track) >= 0) return;
      ctx.activeTracks.push(track);
      hints.begin(track, (tier) => {
        const text = (sets[track] || [])[tier - 1];
        if (!text) return;
        renderHint(host, track, tier, text, ctx);
      });
    }

    ctx.activeTracks = [];
    begin(scene.track);

    /* A second track only opens once its gate is met, so hints for a hidden
       thread never point at it before the player could have reached it. */
    ctx.startSecondaryHints = () => {
      if (!scene.trackSecondary) return;
      const gate = scene.trackSecondaryWhen;
      if (gate && store.get('progress', {})[gate] !== true) return;
      begin(scene.trackSecondary);
    };
    ctx.startSecondaryHints();
  };

  ctx.render = function render() {
    if (ctx.router) ctx.router.replace(ctx.router.current ? ctx.router.current.path : '');
  };

  /* ---- routing ---- */

  const router = createRouter(async (route) => {
    ctx.mounted.forEach((instance) => instance.unmount());
    ctx.mounted = [];
    bus.reset();
    hints.endAll();
    ctx.activeTracks = [];
    clear(main);

    const path = route.path;
    const isLanding = path === '' || path === 'index.html';

    chrome.hidden = isLanding;
    ctx.sayStatus = null;
    document.body.dataset.route = path || 'landing';
    /* Nothing you are carrying is usable once the file is open, and the twist
       is a timed decision — the tray must not sit over the controls. */
    const trayRoutes = [`${CASE_ID}/file`, `${CASE_ID}/twist`, `${CASE_ID}/debrief`];
    tray.hidden = isLanding || path === CASE_ID || trayRoutes.indexOf(path) >= 0;
    if (!tray.hidden) ctx.inventory.render();
    document.body.dataset.tray = tray.hidden || !(store.get('inventory', []) || []).length ? 'off' : 'on';

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

    /* A gated object cannot be reached by deep link either: bounce back to the
       desk and let the room say why. */
    const owner = (content.desk.objects || []).find((object) => object.route === path);
    if (owner) {
      const state = ctx.deskState(owner);
      if (state.kind === 'blocked') {
        ctx.pendingStatus = state.response;
        router.replace(`${CASE_ID}/desk`);
        return;
      }
    }

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
    if (!checkerAvailable()) {
      main.insertBefore(
        el('p', { class: 'insecure-banner', role: 'alert', text: CHECKER_UNAVAILABLE }),
        main.firstChild,
      );
    }
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
  ctx.track(mod.mount(host, ctx.content.final || {}, ctx));
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
