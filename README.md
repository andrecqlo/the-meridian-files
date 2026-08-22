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
index.html            the shell: chrome, timer, torch layer, item tray, notes
engine/               router, timer, state, scenes, answer checking, pacing
engine/pixel.js       sprite renderer — art is text, one character per pixel
engine/deskscene.js   the room: canvas, hotspots, status bar
engine/shells.js      how a scene is framed — laptop, desk surface, cork
engine/inventory.js   what you are carrying
engine/interactions/  one module per interaction type, loaded from the registry
content/case01.json   all of Case 01 — copy, documents, figures, answer digests
content/case02–04     sealed stubs
assets/sprites/       the art, as editable text files
assets/fonts/         two vendored open-licence typefaces
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
- **Accessibility.** Every drag has a select-then-place equivalent and sliders
  take arrow keys. The UV light follows the pointer on a mouse, goes where you
  touch on a touchscreen, and is focusable in its own right for a keyboard:
  arrow keys walk it, `N` jumps it to the next annotation, `Escape` puts it out.
  Annotation text stays in the accessibility tree whether or not the light is on
  it, so a screen reader never needs the torch at all. Counts and state changes
  are announced, and `prefers-reduced-motion` is honoured. Body text is 18px and
  above so it carries from the back of a room.
- **Sound** is optional, off by default, and synthesised — there are no audio
  files. Nothing in the game requires it.

## Art and type

The room is drawn at 300×150 logical pixels and scaled up with nearest
neighbour. Sprites live in `assets/sprites/` as plain text — one character per
pixel, keyed to a four-tone ramp — so the art is editable by hand and diffable
in review, with no binaries and no build step. Shading is dithering, never a
gradient. Violet is the only chromatic colour in the world: everything else is
the ramp from `--tone-0` to `--tone-3`.

Two typefaces are vendored into `assets/fonts/` rather than fetched from a CDN,
so the game works on a meeting-room machine with no wifi:

- **Silkscreen** by Jason Kottke — interface chrome.
- **Caveat** by Impallari Type — Sam's handwriting.

Both are licensed under the SIL Open Font License 1.1; the full licence is in
`assets/fonts/OFL.txt`. Document body text deliberately stays in a normal
reading face: there is too much prose here to set in a pixel font and still be
legible from the back of a room.

## Running a session

See [`facilitation/case01.md`](facilitation/case01.md) for session shape,
timings, and what to do with the group afterwards. Read it before you run the
game with a team; do not circulate it to players beforehand.
