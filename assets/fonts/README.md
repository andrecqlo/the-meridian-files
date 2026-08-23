# Vendored typefaces

All three are licensed under the SIL Open Font License 1.1 and copied into this
repository so the game needs no network at run time — it works on a
meeting-room machine with no wifi.

| File | Family | Used for |
|---|---|---|
| `jersey25-400.woff2` | Jersey 25, by Sarah Cadigan-Fried | Words: prose, labels, buttons, headings |
| `vt323-400.woff2` | VT323, by Peter Hull | Figures: the clock, live counts, data tables, codes |
| `pixelifysans-var.woff2` | Pixelify Sans, by Eddy Gann and Stefie Justprince | Sam's marginalia and the notes that arrive over time, set at weight 600 |

**Why two faces for text.** Compared at matched cap height, Jersey has heavier
stems than VT323 and is easier to read across a paragraph — and there are about
1,400 words in this case. But Jersey's digits are proportional (`0` is 12px
wide, `1` is 8px) and it carries no tabular-figures feature, so a fifteen-minute
countdown set in it shuffles width every second. VT323 is monospaced, so it
holds the clock, the cohort count and the recomputed satisfaction figure still.

Words in Jersey, figures in VT323. Both need roughly a third more size than a
normal UI face to reach the same cap height, which is what the scale in
`assets/app.css` allows for.

**Why weight 600 for Sam.** Pixelify is variable, and 600 is markedly more
legible than 400 at the same width — worth having, because the notes are set in
violet on paper and often read from across a room. Faces that are genuinely
wider than Pixelify were tested and rejected: Silkscreen runs 167% of the body
width and Press Start 2P 159%, and both are harder to read, because a wide face
on a fixed pixel grid spends its pixels on spacing rather than stroke detail.
DotGothic16 reads well but is narrower than the body face, which loses the
contrast that makes marginalia look like marginalia.

Latin subsets only. Full licence in `OFL.txt`.
