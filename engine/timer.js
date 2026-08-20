/* The 15:00 countdown. Persists remaining time (not wall-clock deadline) so a
   refresh resumes where the player was, and closing the laptop lid mid-session
   does not silently eat the case. */

const THRESHOLDS = [
  { at: 10 * 60, level: 'pulse', note: 'Ten minutes to sign-off' },
  { at: 5 * 60, level: 'large', note: 'Five minutes to sign-off' },
  { at: 2 * 60, level: 'urgent', note: 'Sign-off imminent' },
  { at: 0, level: 'over', note: 'The meeting has started — finish your investigation.' },
];

export function createTimer(store, totalSeconds) {
  const total = totalSeconds || 900;
  const listeners = new Set();
  let handle = null;

  function snapshot() {
    return store.get('timer', { remaining: total, running: false, over: false });
  }

  function levelFor(remaining) {
    if (remaining <= 0) return THRESHOLDS[3];
    if (remaining <= 120) return THRESHOLDS[2];
    if (remaining <= 300) return THRESHOLDS[1];
    if (remaining <= 600) return THRESHOLDS[0];
    return { at: total, level: 'calm', note: '' };
  }

  function emit() {
    const s = snapshot();
    const state = {
      remaining: s.remaining,
      over: s.remaining <= 0,
      running: s.running,
      overshoot: s.remaining < 0 ? Math.abs(s.remaining) : 0,
      threshold: levelFor(s.remaining),
    };
    listeners.forEach((fn) => fn(state));
    return state;
  }

  function tick() {
    const s = snapshot();
    if (!s.running) return;
    /* Past zero the clock keeps counting, downward into negative seconds, which
       the header renders as a red count-up. Nobody is locked out. */
    store.set('timer', Object.assign({}, s, { remaining: s.remaining - 1 }));
    emit();
  }

  function start() {
    const s = snapshot();
    if (!s.running) store.set('timer', Object.assign({}, s, { running: true }));
    if (handle === null) handle = window.setInterval(tick, 1000);
    emit();
  }

  function resume() {
    const s = snapshot();
    if (s.running && handle === null) handle = window.setInterval(tick, 1000);
    emit();
  }

  function stop() {
    if (handle !== null) window.clearInterval(handle);
    handle = null;
  }

  function isStarted() {
    return snapshot().running;
  }

  return {
    start,
    resume,
    stop,
    emit,
    isStarted,
    get state() {
      const s = snapshot();
      return { remaining: s.remaining, running: s.running, threshold: levelFor(s.remaining) };
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

export function formatClock(seconds) {
  const over = seconds < 0;
  const abs = Math.abs(seconds);
  const mm = Math.floor(abs / 60);
  const ss = abs % 60;
  return `${over ? '+' : ''}${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}
