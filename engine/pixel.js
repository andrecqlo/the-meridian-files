/* Sprite rendering.

   Sprites are text: one character per pixel, keyed to a colour map. That keeps
   the art diffable, hand-editable and free of binaries — the repo stays a
   folder of source files with no build step, which is what lets this deploy
   straight from a branch.

   Characters map either to an index into the four-tone ramp or to a literal
   colour. The ramp is the whole world; literal colours are reserved for the
   one thing that has any. */

export const TONES = ['#14110E', '#3A3630', '#8B857A', '#EDE7DC'];

function colourFor(value, palette) {
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? palette[value] : value;
}

/* Draws a sprite onto a canvas at an integer scale. Nearest-neighbour by
   construction: every pixel is a filled rectangle, so nothing is ever
   interpolated. */
export function drawSprite(ctx2d, sprite, originX, originY, scale) {
  const palette = sprite.tones || TONES;
  for (let y = 0; y < sprite.rows.length; y += 1) {
    const row = sprite.rows[y];
    for (let x = 0; x < row.length; x += 1) {
      const colour = colourFor(sprite.map[row[x]], palette);
      if (!colour) continue;
      ctx2d.fillStyle = colour;
      ctx2d.fillRect(originX + x * scale, originY + y * scale, scale, scale);
    }
  }
}

export function spriteToCanvas(sprite, scale) {
  const step = scale || 1;
  const width = sprite.w || (sprite.rows[0] || '').length;
  const height = sprite.h || sprite.rows.length;
  const canvas = document.createElement('canvas');
  canvas.width = width * step;
  canvas.height = height * step;
  const ctx2d = canvas.getContext('2d');
  ctx2d.imageSmoothingEnabled = false;
  drawSprite(ctx2d, sprite, 0, 0, step);
  return canvas;
}

export function spriteToDataURL(sprite, scale) {
  return spriteToCanvas(sprite, scale).toDataURL('image/png');
}

/* Dither a rectangle in one tone over whatever is under it, so an area can be
   shaded without a gradient. All coordinates are logical pixels.

   Patterns rather than diagonals: diagonal hatching moires badly at scale and
   reads as noise. 1 is a 50% checkerboard, 2 is 25%, 3 is 12.5%. */
export function dither(ctx2d, x, y, width, height, colour, density, scale) {
  const step = scale || 1;
  const level = density || 1;
  ctx2d.fillStyle = colour;
  /* The pattern is keyed to absolute position, not to the rectangle being
     filled — otherwise adjacent calls phase against each other and the
     texture breaks into stripes. */
  for (let row = 0; row < height; row += 1) {
    const py = y + row;
    for (let col = 0; col < width; col += 1) {
      const pxx = x + col;
      let on;
      if (level <= 1) on = (py + pxx) % 2 === 0;
      else if (level === 2) on = py % 2 === 0 && pxx % 2 === 0;
      else on = py % 2 === 0 && pxx % 4 === (py % 4 === 0 ? 0 : 2);
      if (!on) continue;
      ctx2d.fillRect(pxx * step, py * step, step, step);
    }
  }
}
