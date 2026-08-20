/* Adaptive pacing.

   An invisible line runs through the case: by such-and-such a point on the
   clock, a team on schedule has opened the letter, cleared a challenge, turned
   the lock. Falling behind it never removes content and never completes a step
   — it only makes Sam's notes arrive sooner, then more visibly, then once,
   opened. The player still does every action. */

const LEVELS = [
  { at: 0, level: 0 },
  { at: 60, level: 1 },
  { at: 120, level: 2 },
  { at: 180, level: 3 },
];

function reached(store, milestone) {
  if (milestone.progress) return (store.get('progress', {}) || {})[milestone.progress] === true;
  return Boolean(store.get(milestone.key, false));
}

export function createPace(store, timer, milestones) {
  let level = 0;
  const listeners = new Set();

  function behindBy() {
    const remaining = timer.state.remaining;
    const next = milestones.find((milestone) => !reached(store, milestone));
    if (!next) return 0;
    return Math.max(0, next.at - remaining);
  }

  function levelFor(seconds) {
    let found = 0;
    LEVELS.forEach((entry) => { if (seconds > entry.at) found = entry.level; });
    return found;
  }

  function evaluate() {
    const seconds = behindBy();
    const next = levelFor(seconds);
    if (next === level) return level;
    level = next;
    listeners.forEach((fn) => fn(level, seconds));
    return level;
  }

  return {
    behindBy,
    get level() { return level; },
    /* 1 on schedule, 0.5 once the team is more than a minute behind. */
    factor() { return level >= 1 ? 0.5 : 1; },
    evaluate,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
