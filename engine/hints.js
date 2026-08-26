/* Adaptive hints. There is no hint menu and no penalty: a tier only ever
   surfaces because the case clock says the team is running out of time to
   reach the 15-minute sign-off — see pace.js, which compares the timer's
   remaining seconds against the case's own schedule and calls
   forceNextTier() once a team falls far enough behind it. Nothing here
   measures how long a team has sat on any one challenge: two teams who
   enter the same puzzle at different points on the clock get different
   treatment, which is the point — a team with time to spare should be able
   to sit and think without a hint arriving uninvited. */

export function createHints(store) {
  const tracks = new Map();

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

  return {
    /* progress() and stumble() are called throughout the interactions to mark
       a meaningful move or a wrong answer. Neither advances a tier any more
       — that job belongs to the case clock alone — but the calls stay, both
       because callers still needing them is harmless and because they remain
       the honest place to hook a future clock-independent signal back in. */
    progress() {},
    stumble() {},
    /* Bring the next tier forward now, for a team well behind the line. The
       only way any tier above 0 is ever reached. */
    forceNextTier() {
      tracks.forEach((track, trackId) => {
        const current = tierOf(trackId);
        if (current >= 3) return;
        setTier(trackId, current + 1);
      });
    },
    /* Called on entering a challenge. Replays any tier already earned, so a
       refresh does not take a hint away again. */
    begin(trackId, onTier) {
      tracks.set(trackId, { onTier });
      const current = tierOf(trackId);
      for (let t = 1; t <= current; t += 1) onTier(t, { replay: true });
    },
    tier: tierOf,
    solved(trackId) {
      tracks.delete(trackId);
    },
    end(trackId) {
      tracks.delete(trackId);
    },
    endAll() {
      tracks.clear();
    },
  };
}
