# Content schema

What a case's `content/caseNN.json` is expected to contain, and the field
names the engine looks for. Written for whoever builds Case 02 next — cross
it against `content/case01.json` as the worked example.

## Top level

```
id, number, title, teaser, locked      series-list metadata (shown on the landing dossiers)
durationSeconds, pace                  the countdown and its warning thresholds
intro                                  { heading, lines[], timerNote, cta }
desk                                   the hub scene — see below
scenes[]                               the challenge/reading scenes — see below
final                                  { lock, memo, decision, twist } — the end-of-case sequence
debrief                                { title, untimedNote, tally, chain, reveal, blindSpot, sectors, memo, next }
hintNote                               { closedLabel, dismissLabel, arrival } — tab copy, not per-hint text
inventoryLabel, items                  the carried-item tray
```

`ctx.content` in every engine module *is* this object, unmodified. Never
hardcode a case's number, title, or route prefix in engine code — read
`ctx.content.number` / `ctx.content.title`, and build routes from
`ctx.caseId` (e.g. `` `${ctx.caseId}/desk` ``), so the same engine code works
for whichever case's content it was given.

## `desk.objects[]` — hotspots on the desk hub

```
id, label, route      identity, display label, and where clicking it goes (routeless objects, e.g.
                       the torch, are picked up rather than routed)
track                 the progress key this object's challenge sets on completion
sprite, at, hit        which sprite to draw and where (at = draw position, hit = click/tap target,
                       both in the room's logical pixel grid)
responses              { look, taken, locked, empty, done, ... } — status-line text per state
emptyWhen              { item, sprite } — swap to a different sprite once an item has been taken from it
unlockedBy             see "Gating fields" below
lockedRoute            optional — where clicking this object goes while it is still blocked.
                       Without it a blocked object only says why; with it the lock itself is
                       a place you can go and work (the bottom drawer's dial)
lockAt                 { x, y } sprite-local override for where the padlock overlay draws (only
                       meaningful alongside unlockedBy — see deskscene.js)
altSprite              a sprite swap for one particular state (e.g. the laptop's locked screen)
```

## `scenes[]` — challenge and reading scenes

```
id, route, kind         kind is "challenge" for anything gated by a track, used for the room-status
                        chrome and the back-button label
title, subtitle          scene head; kind-specific lockedSubtitle overrides subtitle while locked
track                    the progress key this scene sets on completion
documents[]              plain reading material (letters, memos) with no interaction attached
interactions[]           one or more interaction configs — see "Interaction types" below
hints[]                  tier 1..n hint content for `track` — see "Hints" below
shell                    which chrome wraps the interaction(s): a laptop shell, the desk surface, a
                        cork board, etc. (see engine/shells.js for the available kinds)
grants                   an item handed to inventory the moment the scene is opened
lockedBy / lockedSubtitle   see "Gating fields" below
unlockedBy / unlockedByMessage   see "Gating fields" below
trackSecondary / trackSecondaryWhen / hintsSecondary   a second, optional finding thread inside
                        one scene (e.g. the pinboard's fragment-assembly) — see "Gating fields"
```

## Gating fields — four names, four different jobs

The same underlying idea — "don't let the player see/reach this until some
progress key is true" — is spelled four different ways depending on *what*
is being gated. They are not interchangeable; each is read by different code:

| Field | Read by | Gates |
|---|---|---|
| `unlockedBy` | `app.js` (`deskState`), `deskscene.js` (padlock) | A **desk object** — blocked until the named progress key is true; draws a padlock if so. |
| `lockedBy` | `scenes.js` (`renderChallenge`) | A **scene itself** — shows `lockedSubtitle` and (if present) a `lockScreen` instead of the scene's real content. |
| `gatedBy` | `fragment-assembly.js` | A **sub-feature inside an already-open scene** (e.g. a fragment-assembly puzzle that only appears once another interaction on the same board is solved). |
| `trackSecondaryWhen` | `app.js` (`startSecondaryHints`) | Not visibility — **when a second hint track is allowed to start firing**, so hints for a hidden thread never point at it before the player could plausibly have found it. |

If a future case needs a fifth flavour of "gated until", check this table
first — it likely already exists under one of these names with slightly
different semantics, rather than needing a fifth.

## Hints

`scenes[].hints` is an array indexed by tier (tier 1 = index 0). Each tier is
either:
- a plain string, shown as-is, or
- an array of `{ when, text }`, evaluated fresh every time that tier fires;
  the first entry whose `when` matches (or has none) wins.

`when` supports (see `matchesWhen()` in `engine/app.js`):

```
{ missingItem: "id" }        true if that item is NOT yet in inventory
{ hasItem: "id" }             true if that item IS in inventory
{ missingRevealAny: ["id"] }  true if none of the given UV-note ids has been revealed yet
```

## Documents and annotations

A `documents[]` entry carries `id`, `kind`, `title`, `meta`, optional `stamp`,
and `blocks[]`. Annotations are the marginalia the UV torch reveals:

```
annotations[].id         the reveal id, also used by hints' missingRevealAny
annotations[].after      index of the block it sits beside
annotations[].text       what the torch reveals
annotations[].finding    optional — records this finding the first time the beam
                         lands on it, so reading a note can BE the whole of a
                         finding with nothing to solve (see the workshop minutes)
annotations[].reveals    optional — fires a `reveal` bus event other interactions listen for
doc.notesBelow           optional — render annotations full-width under the body
                         instead of in the margin gutter. The gutter is ~230px, so
                         anything longer than a line reserves more blank page than
                         the document itself; this keeps the reserved-space (no
                         reflow on reveal) property at a readable width.
```

`hintNote` (top level) only carries the tab's own chrome copy — label,
dismiss label, arrival announcement — not hint text itself.

## Interaction types

`scenes[].interactions[].type` names a module in `engine/registry.js`'s
`BUILT` map; `PLANNED` lists type names reserved for Cases 02–04 that don't
have a module yet (referencing one throws a clear "not built yet" error
instead of silently no-oping). Each module's own header comment explains
its *design intent*; the config fields it actually reads are:

```
complaint-inspect   title, instruction, documents[], profile, closeLabel
cohort-diagram       title, instruction, track, population, dimensions[], dimUsing,
                     tabsLabel, countLabel, clearLabel, emptyLabel
reweight-workbench   title, instruction, headline, readoutLabel, tabsLabel, annotation,
                     columns {group, service, pilot, satisfaction, adjusted}, tabs[]
                     tab: id, label, kind:"reweight", fixedLabel, resetLabel, segments[], anchors[]
                     tab.locked:"service"  the adjusted column is pinned to the service mix —
                       dragging is allowed and springs back on release with tab.lockedNote,
                       because a slider that refuses to move reads as broken. Locked tabs
                       open at realMix, skip the reset button, and never fire the
                       "you found it" beat that anchors otherwise trigger.
                     segment: id, label, description, satisfaction, pilotMix, realMix
pinboard             id, title, instruction, track, claims[], evidence[], verdicts,
                     claimsLabel, evidenceLabel, unstrungLabel, moreLabel, lessLabel,
                     flagLabel, flaggedLabel, flagPromptResponse, flagWrongResponse,
                     linkedResponse, wrongLinkResponses, findings, successTitle,
                     successBody, successNote
fragment-assembly    title, instruction, track, document, fragments[], sentenceDisplay,
                     answerDigest, submitLabel, finding, gatedBy, gatedNote, lockedNote,
                     incompleteNote, successTitle, successNote, wrongResponses
code-entry           id, track, label, prompt, placeholder, inputMode, submitLabel,
                     answerDigest, targetedResponses, wrongResponses, reward, finding,
                     successTitle, successBody, successNote
lock-screen          same shape as code-entry, plus device, sticky, stickyTitle,
                     stickySharp, continueLabel
```

`code-entry` and `lock-screen` also accept `maxLength` alongside
`inputMode: "numeric"`; together they hard-constrain the field (digits only,
capped length, enforced on paste as well as typing) rather than letting a
malformed answer through to fail the hash. `lock-screen` additionally accepts
`continueRoute`, for a lock that guards something back in the room rather than
revealing it in place.

A lock and the finding it relates to are deliberately separable: give the
`finding` to whichever interaction represents actually doing the reasoning (an
anchor on the workbench), not to the field where the answer is typed. Then a
team that guesses the code still gets through, and the debrief still reports
the finding as missed — which is the truthful outcome rather than a locked door.

`decision` reads `desk.file.words` — one `{ word, track }` per challenge, the
word base64-encoded. Order in that array is display order on the desk and is
deliberately *not* the password: no position is stored anywhere, and the
arrangement the player builds is joined and hashed against
`final.lock.answerDigest`, so the answer order exists only as that hash.

`torch`, `memo`, `decision`, `timed-twist`, and `debrief` are not configured
per-scene the same way — they read fixed sections of `content` (`torch`,
`final.memo`, `final.decision`, `final.twist`, `debrief`) rather than a
per-instance config object, since a case has exactly one of each.

`answerDigest` values, and any other spoiler-sensitive string, are never
plaintext — see the README's note on answer checking for how to generate
one.
