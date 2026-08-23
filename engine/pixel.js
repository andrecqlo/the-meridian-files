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

/* Paints a sprite a pixel at a time. Nearest-neighbour by construction: every
   pixel is a filled rectangle, so nothing is ever interpolated. Only used to
   fill a cache — see drawSprite. */
function paintSprite(ctx2d, sprite, originX, originY, scale) {
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
  paintSprite(ctx2d, sprite, 0, 0, step);
  return canvas;
}

/* Every sprite is rasterised once per scale and then blitted. A sprite drawn
   pixel by pixel costs a fillRect per pixel every time it appears; drawn from
   a cache it costs one drawImage. */
const spriteCache = new Map();

export function drawSprite(ctx2d, sprite, originX, originY, scale) {
  const step = scale || 1;
  let byScale = spriteCache.get(sprite);
  if (!byScale) {
    byScale = new Map();
    spriteCache.set(sprite, byScale);
  }
  let bitmap = byScale.get(step);
  if (!bitmap) {
    bitmap = spriteToCanvas(sprite, step);
    byScale.set(step, bitmap);
  }
  ctx2d.drawImage(bitmap, originX, originY);
}

export function spriteToDataURL(sprite, scale) {
  return spriteToCanvas(sprite, scale).toDataURL('image/png');
}

/* Dither a rectangle in one tone over whatever is under it, so an area can be
   shaded without a gradient. All coordinates are logical pixels.

   Patterns rather than diagonals: diagonal hatching moires badly at scale and
   reads as noise. 1 is a 50% checkerboard, 2 is 25%, 3 is 12.5%.

   The pattern is built once per tone and tiled by the canvas, rather than
   stamped a pixel at a time — shading the back wall this way is one fill
   instead of several thousand. Canvas patterns tile from the origin, which is
   exactly the absolute keying the look depends on: adjacent fills stay in
   phase with each other and the texture never breaks into stripes. */

const PERIOD = 4;
const patternCache = new Map();

function ditherPattern(ctx2d, colour, level, scale) {
  const key = `${colour}|${level}|${scale}`;
  const cached = patternCache.get(key);
  if (cached) return cached;
  const tile = document.createElement('canvas');
  tile.width = PERIOD * scale;
  tile.height = PERIOD * scale;
  const tileCtx = tile.getContext('2d');
  tileCtx.fillStyle = colour;
  for (let y = 0; y < PERIOD; y += 1) {
    for (let x = 0; x < PERIOD; x += 1) {
      let on;
      if (level <= 1) on = (y + x) % 2 === 0;
      else if (level === 2) on = y % 2 === 0 && x % 2 === 0;
      else on = y % 2 === 0 && x % 4 === (y % 4 === 0 ? 0 : 2);
      if (on) tileCtx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  const pattern = ctx2d.createPattern(tile, 'repeat');
  patternCache.set(key, pattern);
  return pattern;
}

export function dither(ctx2d, x, y, width, height, colour, density, scale) {
  const step = scale || 1;
  const level = density || 1;
  ctx2d.fillStyle = ditherPattern(ctx2d, colour, level, step);
  ctx2d.fillRect(x * step, y * step, width * step, height * step);
}
