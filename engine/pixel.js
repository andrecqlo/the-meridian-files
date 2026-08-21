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

/* Cross-hatch dither between two tones, for shading a flat area without a
   gradient. density 1 = every other pixel, 2 = every fourth, and so on. */
export function dither(ctx2d, x, y, width, height, colour, density, scale) {
  const step = scale || 1;
  const n = density || 1;
  ctx2d.fillStyle = colour;
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < width; col += 1) {
      if ((row + col) % (n + 1) !== 0) continue;
      ctx2d.fillRect(x + col * step, y + row * step, step, step);
    }
  }
}
