/* Sam's notes. There is no hint menu and no penalty: tiers surface on their own
   when a challenge stops moving. T1 at 90s of no meaningful progress, then one
   tier per further 60s, so a stuck player holds T3 by 3:30. Nobody is
   hard-stuck — the 17-minute ceiling depends on it. */

const FIRST_MS = 90000;
const STEP_MS = 60000;

export function createHints(store) {
  const tracks = new Map();
  let paceFactor = () => 1;

  function stored() {
    return store.get('hints', {}) || {};
  }

  function tierOf(trackId) {
    return stored()[trackId] || 0;
  }

  function setTier(trackId, tier) {
    const all = stored();
    if ((all[trackId] || 0) >= tier) return;
    all[trackId] = tier;
    store.set('hints', all);
    const track = tracks.get(trackId);
    if (track && track.onTier) track.onTier(tier);
  }

  function schedule(trackId) {
    const track = tracks.get(trackId);
    if (!track) return;
    window.clearTimeout(track.handle);
    const current = tierOf(trackId);
    if (current >= 3) return;
    const wait = (current === 0 ? FIRST_MS : STEP_MS) * paceFactor();
    track.handle = window.setTimeout(() => {
      setTier(trackId, tierOf(trackId) + 1);
      schedule(trackId);
    }, wait);
  }

  return {
    /* Pacing can halve the intervals; it can never skip a step for the player. */
    setPace(factor) { paceFactor = factor; },
    /* Bring the next tier forward now, for a team well behind the line. */
    forceNextTier() {
      tracks.forEach((track, trackId) => {
        const current = tierOf(trackId);
        if (current >= 3) return;
        setTier(trackId, current + 1);
        schedule(trackId);
      });
    },
    /* Called on entering a challenge. Replays any tier already earned, so a
       refresh does not take Sam's notes away again. */
    begin(trackId, onTier) {
      const existing = tracks.get(trackId);
      if (existing) window.clearTimeout(existing.handle);
      tracks.set(trackId, { handle: null, onTier });
      const current = tierOf(trackId);
      for (let t = 1; t <= current; t += 1) onTier(t, { replay: true });
      schedule(trackId);
    },
    /* Meaningful progress restarts the clock. Idle fidgeting does not. */
    progress(trackId) {
      const track = tracks.get(trackId);
      if (!track) return;
      schedule(trackId);
    },
    /* A wrong answer is progress of a sort: it should not reset the clock, but
       it should not be ignored either — nudge one tier closer. */
    stumble(trackId) {
      const track = tracks.get(trackId);
      if (!track) return;
      window.clearTimeout(track.handle);
      track.handle = window.setTimeout(() => {
        setTier(trackId, tierOf(trackId) + 1);
        schedule(trackId);
      }, 20000);
    },
    tier: tierOf,
    solved(trackId) {
      const track = tracks.get(trackId);
      if (track) window.clearTimeout(track.handle);
      tracks.delete(trackId);
    },
    end(trackId) {
      const track = tracks.get(trackId);
      if (track) window.clearTimeout(track.handle);
      tracks.delete(trackId);
    },
    endAll() {
      tracks.forEach((track) => window.clearTimeout(track.handle));
      tracks.clear();
    },
  };
}
