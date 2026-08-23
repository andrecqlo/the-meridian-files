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
import { createHintStack } from './hintnote.js';
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
  ctx.hintStack = createHintStack(ctx);
  ctx.pace = pace;
  hints.setPace(() => pace.factor());

  /* ---- chrome ---- */

  const timerNode = document.getElementById('timer');
  const timerValue = document.getElementById('timer-value');
  const timerNote = document.getElementById('timer-note');
  const backButton = document.getElementById('btn-back');
  const backLabel = document.getElementById('btn-back-label');
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
  /* Applied both when the level changes and when a challenge mounts — a team
     already behind the line when they open a scene should not have to wait for
     the next transition, which may never come. */
  ctx.applyPace = function applyPace() {
    const level = pace.level;
    document.body.dataset.paceLevel = String(level);
    if (level >= 2) hints.forceNextTier();
    if (level >= 3) ctx.hintStack.openLatest();
    if (level > 0) store.patch('paceSeen', { [`level${level}`]: true });
  };
  pace.subscribe(() => ctx.applyPace());
  timer.subscribe(() => {
    if (timer.isStarted()) pace.evaluate();
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
    ctx.hintStack.remove(track);
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
    /* Once you are carrying it, it is not on the desk any more. */
    if (object.goneWhen && inventory.indexOf(object.goneWhen.item) >= 0) {
      return { kind: 'gone' };
    }
    /* A container you have emptied stays where it is and says so. */
    if (object.emptyWhen && inventory.indexOf(object.emptyWhen.item) >= 0) {
      return {
        kind: 'empty',
        sprite: object.emptyWhen.sprite,
        response: responses.empty,
        label: `${object.label}. ${responses.empty || 'Empty.'}`,
      };
    }
    if (object.track && progress[object.track] === true) {
      /* Solving can change what the object looks like saying — the laptop
         goes from "asking for a PIN" to "unlocked" without a new sprite. */
      return { kind: 'done', response: responses.done || responses.look, label: `${object.label} — read` };
    }
    return { kind: 'open', response: responses.look, label: object.label };
  };

  ctx.deskActivate = function deskActivate(object, say) {
    const responses = object.responses || {};
    const state = ctx.deskState(object);
    if (state.kind === 'blocked' || state.kind === 'empty') {
      say(state.response);
      return;
    }
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

  /* A hint tier can be a plain string, or a list of {when, text} entries
     evaluated fresh each time that tier fires — so the same tier reads
     differently depending on what the player is still missing, without
     needing a separate tier for every stage of the challenge. The first
     entry with no `when`, or whose `when` matches, wins. */
  function matchesWhen(when) {
    if (!when) return true;
    const inventory = store.get('inventory', []) || [];
    if (when.missingItem) return inventory.indexOf(when.missingItem) < 0;
    if (when.hasItem) return inventory.indexOf(when.hasItem) >= 0;
    return true;
  }
  function resolveHint(entry) {
    if (!entry) return null;
    if (typeof entry === 'string') return entry;
    if (Array.isArray(entry)) {
      const match = entry.find((option) => matchesWhen(option.when));
      return match ? match.text : null;
    }
    return null;
  }

  /* Sam's notes surface here. Tiers 1 and 2 arrive as marginalia that need the
     torch; tier 3 is plain text, because by then nobody should be stuck. */
  ctx.mountHints = function mountHints(scene) {
    const sets = {
      [scene.track]: scene.hints || [],
      [scene.trackSecondary]: scene.hintsSecondary || [],
    };

    function begin(track) {
      if (!track || ctx.activeTracks.indexOf(track) >= 0) return;
      ctx.activeTracks.push(track);
      hints.begin(track, (tier) => {
        const text = resolveHint((sets[track] || [])[tier - 1]);
        if (!text) return;
        ctx.hintStack.add(track, tier, text);
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
    if (ctx.applyPace) ctx.applyPace();
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
    ctx.hintStack.clear();
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
    /* Full tray in the room, where items get used; a compact strip elsewhere,
       so it takes as little of a document scene as possible. */
    tray.dataset.compact = path === `${CASE_ID}/desk` ? 'off' : 'on';
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
      scenes.renderIntro(main, ctx);
      finish();
      return;
    }

    timer.resume();
    store.set('lastRoute', path);
    caseLabel.textContent = `Case ${content.number} · ${content.title}`;

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
    /* A scene reached only through a shortcut (the laptop's folder icons, not
       a desk object of its own) still needs its own gate checked here — the
       shortcut is the intended path, not the only technical one. */
    if (scene && scene.unlockedBy && store.get('progress', {})[scene.unlockedBy] !== true) {
      ctx.pendingStatus = scene.unlockedByMessage || null;
      router.replace(`${CASE_ID}/desk`);
      return;
    }
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

loadContent()
  .then(boot)
  .catch((error) => {
    document.getElementById('main').innerHTML =
      `<p style="padding:40px">Could not start: ${error.message}. If you opened this file directly, serve the folder over HTTP instead.</p>`;
  });
