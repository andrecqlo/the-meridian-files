# Vendored typefaces

Both faces are licensed under the SIL Open Font License 1.1 and are copied into
this repository so the game needs no network at run time — it works on a
meeting-room machine with no wifi.

| File | Family | Used for |
|---|---|---|
| `vt323-400.woff2` | VT323, by Peter Hull | Everything: chrome, data, and document prose |
| `pixelifysans-var.woff2` | Pixelify Sans, by Eddy Gann and Stefie Justprince | Sam's marginalia and the notes that arrive over time |

VT323 is monospaced, so figures line up, and it carries about a third less
cap-height per em than a normal UI face — every size in `assets/app.css` is
scaled up accordingly. Pixelify Sans is rounder and wider, so a note in the
margin never reads as system output.

Latin subsets only. Full licence in `OFL.txt`.
