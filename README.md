# The Meridian Files

A short investigation game for teams, played on one screen.

A senior analyst has resigned overnight, leaving a locked file and fifteen
minutes before a board meeting. A team works through the evidence on the desk,
finds what is wrong with it, and makes a recommendation. Case 01 — *The
Evidence* — is complete. Cases 02–04 are sealed dossiers on the menu and ship
as content packs later.

Designed for one shared screen with a group around it: a laptop on a projector,
a meeting-room display, or a phone passed around. Fifteen minutes of play, a
couple of minutes of debrief.

## Running it locally

The game is plain HTML, CSS and ES modules — no build step, no dependencies.
It does need to be served over HTTP rather than opened as a file, because it
loads its content as JSON.

```
# any static server will do
npx http-server -p 8080 -c-1 .
# or
python3 -m http.server 8080
```

Then open <http://localhost:8080>.

## Publishing on GitHub Pages

There is one manual step, in the repository settings:

**Settings → Pages → Build and deployment → Deploy from a branch → `main` /
`(root)`.**

Nothing else is required. `.nojekyll` is already in place so the `engine/`
folder is served as-is, and routing is hash-based (`#/case01/desk`), so deep
links work on Pages without any server configuration.

## How it is put together

```
index.html            the shell: chrome, timer, torch layer, live region
engine/               router, timer, state, scenes, answer checking, pacing
engine/interactions/  one module per interaction type, loaded from the registry
content/case01.json   all of Case 01 — copy, documents, figures, answer digests
content/case02–04     sealed stubs
assets/               stylesheet, icon sprite
facilitation/         notes for whoever is running the session
```

The engine renders whatever the content JSON describes. Adding a case means
writing a JSON file and, at most, adding a new interaction module to the
registry in `engine/registry.js` — never editing an existing case.

Some notes on the mechanics:

- **State** lives in `localStorage` under `meridian.case01.*`, so a refresh
  mid-session resumes exactly where the team was. The landing page has a
  **Reset case** control.
- **Answers** are never stored in the repository. Player input is normalised
  (trimmed, lower-cased, commas, spaces and hyphens removed) and compared as a
  SHA-256 digest against a digest in the content file, using the Web Crypto
  API. A few spoiler-sensitive strings travel base64-encoded for the same
  reason: a curious teammate should not be able to read the repository and
  arrive knowing the answers.
- **Accessibility.** Every drag has a select-then-place equivalent, sliders take
  arrow keys, the torch has a per-document "Inspect" mode, counts and state
  changes are announced, and `prefers-reduced-motion` is honoured. Base text is
  18px and above so it carries from the back of a room.
- **Sound** is optional, off by default, and synthesised — there are no audio
  files. Nothing in the game requires it.

## Running a session

See [`facilitation/case01.md`](facilitation/case01.md) for session shape,
timings, and what to do with the group afterwards. Read it before you run the
game with a team; do not circulate it to players beforehand.
