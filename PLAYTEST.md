# Playtest notes

## Timing targets

| Run | Total, including debrief |
|---|---|
| Fast | 11 minutes |
| Typical | 14 minutes |
| Ceiling | 17 minutes |

The on-screen countdown is 15:00 and the debrief is untimed. A team that runs
out of clock is not locked out — the timer counts up in red and everything
stays playable. The ceiling is held by the hint system and the pace line, not
by cutting content.

Rough shape of a typical run: intro 60 seconds · Challenge 1 (profile, reply,
reference sheet, laptop PIN lock) 2 minutes · Challenge 2 (workbench) 2.5–3
minutes · Challenge 3 (pinboard) 2.5–3 minutes · final sequence 2 minutes ·
debrief 2 minutes.

## Checklist

Watch a real team, not the screen. Record answers as yes/no plus one line.

### The room and the light

- [ ] Does anyone fail to find the torch on the desk? It is the first thing the
      case needs and nothing else prompts you to pick it up.
- [ ] Taking something removes it from the desk — the torch disappears, the
      paper tray empties. Does that register as "I picked it up", or does
      anyone think they broke something?
- [ ] Does reading a note by moving the light across it feel like reading, or
      like fighting the interface? Watch whether people sweep or jab.
- [ ] Does anyone try to click a document while the torch is on and find the
      light in the way?
- [ ] Clicking a locked object gives a clue in the status bar. Does anyone miss
      it because they were looking at the object rather than the bar?
- [ ] Does the team connect the workbench figure to the bottom drawer's dial,
      or do they finish the reweighting and then stall with nowhere to put it?
- [ ] **Does anyone brute-force the two-digit dial?** It is only 100
      combinations and 76/81 are on screen, so it is guessable. That is
      deliberately not blocked — but check the debrief afterwards lists the
      aggregation as *missed* for that team, because the finding is credited by
      reaching the service mix, not by opening the drawer.
- [ ] On Gender and Language, does the slider springing back read as the system
      answering, or as a bug? The note under the table states it before anyone
      drags; watch whether anyone drags first and reads second.
- [ ] Do the hints that arrive top-right read as helpful, or as a nag? Does
      anyone fail to notice one arrive?
- [ ] Is the bottom drawer's padlock (on the handle) read as "locked, come
      back" rather than "broken"? Watch for a team that gives up on it rather
      than trying the other objects first.
- [ ] The laptop's locked state and the pinboard should never show a padlock
      — the laptop's own dark screen carries that signal, and the pinboard
      isn't locked at all, it just needs the string. Does either ever get
      misread as broken rather than "not yet"?
- [ ] Does the "smeared paper" caption on the profile card and the reply
      actually send people to the torch, or does it read as decorative and
      get ignored?
- [ ] Once all three words are found, does the filestrip at the bottom of
      the desk get noticed as the way in, or does the team keep looking for a
      folder or icon on the desk itself?
- [ ] On the attachment screen, is it obvious the words in the tray have to be
      *ordered*, not just placed? Watch for a team pressing Unlock with the
      tray order copied straight across, and whether the wrong-answer lines
      ("read it back as a sentence") get them to rearrange.
- [ ] Does anyone try to drag on a touchscreen and fail? Select-then-place is
      the equivalent path — does anyone discover it without being told?

### The interactions

- [ ] Does the slider collapse produce a reaction — an audible one, out loud,
      when the figure goes under 76?
- [ ] Does the letter read aloud on a projector in under 40 seconds?
- [ ] Does at least one tester reach 9,214 without hints?
- [ ] Does anyone try the laptop first, before the tray? Does the PIN pad read
      as a hook to go find the answer, or as a wall?
- [ ] Does the sticky note's vague clue ("the ones nobody asked") get decoded
      before anyone types a wrong answer? If it **never** does, the clue is too
      vague; if it **always** does, it is carrying too much and the sharpened
      wrong-answer line is never seen.
- [ ] **Does a team that never sweeps the torch over the profile and reply get
      completely stuck, with the reference sheet as their only way in?** Both
      highlights are UV-only now — the contradiction carries no visual flag
      at all until swept. That's the intended difficulty, but if it's
      producing hard stalls rather than "check the torch" hints landing in
      time, that's a pacing problem, not a copy one.
- [ ] **Do most teams crack the PIN without opening the drawer, once they've
      swept both highlights?** "Post only" and "issued by email" are
      highlighted as a pair specifically so the two together are decodable
      without the reference sheet's count. If most teams solve it from the
      highlights alone, that pairing is doing too much and the profile
      highlight has lost its point as a *marker* rather than an *answer* —
      note it, do not add more highlighting to compensate.
- [ ] Does any team treat the age tab's 81 as a bug rather than a finding? If
      so, strengthen Sam's note on that tab. Never change the arithmetic.
- [ ] Does the "1 complaint / 9,214 never invited" card get a visible reaction?
      It is the closing beat of Challenge 1.
- [ ] Does anyone find Priya unaided? Most teams will not. That is by design —
      but if *nobody* across several sessions reaches the minutes, check that
      the pinboard's completion is leaving enough clock behind it. The minutes
      are now pinned above the board and readable from the moment the scene
      opens, so a team with the torch in hand can find them early — watch
      whether that makes it too easy rather than too hard.
- [ ] Does any team work out 9,214 but hesitate to type it for want of
      confirmation? If so, sharpen the sticky note's wording, not the PIN
      field itself.
- [ ] If fast teams clear Challenge 1 in under 60 seconds, that is the
      redesign working as intended — do not slow it down by adding a document.

### Pacing and hints

- [ ] Does any tester get hard-stuck for more than 3.5 minutes despite tier 3?
- [ ] With pacing active, does any team finish past 17:00 including debrief?
- [ ] Do auto-surfaced hints read as helpful, or as a nag?
- [ ] Does the pace line fire all three thresholds in a deliberately slow run:
      intervals halve, then a note surfaces unopened and pulsing, then one note
      opens itself once and can be put back?

### The ending

- [ ] Does the chain graphic read in under 15 seconds on a projector?
- [ ] Does the reveal read as credit for what the team did, or as a gotcha?
      This is the single most important line in the checklist. If anyone in the
      room says "so it was a trick", the framing has failed.
- [ ] Does the memo generate, copy, and download with the team's own sentence
      in it, verbatim and unedited?

### Mechanics

- [ ] Refresh mid-challenge: does the game resume exactly where it was, with the
      timer where it was left?
- [ ] Reset case: does it clear everything and return to the menu?
- [ ] Play it once with the mouse only, once with touch only, once with the
      keyboard only. All three must complete the case.
- [ ] Read it at 1080p from the back of the room, and on a 380px phone. The
      whole game is set in VT323 now, including the letter, Sam's memo and the
      reveal — the single biggest legibility risk in the build. If anyone
      squints at the reveal paragraph, raise its size before anything else.
- [ ] Does anyone read Sam's marginalia as system output rather than as
      something written by hand? It is set in a different pixel face for
      exactly that reason.
- [ ] Safari and Firefox: the reveal mask and the room canvas are the two things
      most likely to differ. Only Chromium is covered by the local suite.
