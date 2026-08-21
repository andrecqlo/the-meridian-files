/* The desk, drawn as one room.

   The scene is a canvas at a fixed logical resolution, scaled up with nearest
   neighbour. Interactive objects are HTML buttons positioned over it in
   percentages, not canvas hit-testing — that way focus, labels and keyboard
   activation come from the platform instead of being reimplemented.

   The status bar underneath carries the response to whatever was last clicked.
   It is the adventure-game convention and the natural home for a clue. */

import { el, append, clear, announce } from './dom.js';
import { drawSprite, dither, TONES } from './pixel.js';
import * as SPRITES from '../assets/sprites/desk.js';

const RENDER_SCALE = 4;

function paintRoom(ctx2d, scene, scale) {
  const W = scene.w;
  const H = scene.h;
  const top = scene.deskTop;

  /* Flat wall, darkening towards the ceiling. Dither does the shading — there
     are no gradients anywhere in this world. */
  ctx2d.fillStyle = TONES[1];
  ctx2d.fillRect(0, 0, W * scale, top * scale);
  dither(ctx2d, 0, 0, W, Math.round(top * 0.62), TONES[0], 2, scale);
  dither(ctx2d, 0, 0, W, Math.round(top * 0.30), TONES[0], 1, scale);

  /* The lamp throws a stepped pool of light up the wall: three arcs, not a
     gradient, so it bands the way everything else does. */
  const lamp = scene.lamp;
  [[70, 3], [48, 2], [28, 1]].forEach(([radius, density]) => {
    for (let row = 0; row < top; row += 1) {
      const dy = (lamp.y - row) / 1.35;
      const half = Math.sqrt(Math.max(0, radius * radius - dy * dy));
      if (!half) continue;
      dither(ctx2d, Math.round(lamp.x - half), row, Math.round(half * 2), 1, TONES[2], density, scale);
    }
  });

  /* Desk: a bright front lip, the surface, then the panelled front. */
  ctx2d.fillStyle = TONES[2];
  ctx2d.fillRect(0, top * scale, W * scale, 4 * scale);
  ctx2d.fillStyle = TONES[3];
  ctx2d.fillRect(0, top * scale, W * scale, 1 * scale);
  ctx2d.fillStyle = TONES[0];
  ctx2d.fillRect(0, (top + 4) * scale, W * scale, 1 * scale);

  ctx2d.fillStyle = TONES[1];
  ctx2d.fillRect(0, (top + 5) * scale, W * scale, (H - top - 5) * scale);
  dither(ctx2d, 0, top + 5, W, 10, TONES[2], 3, scale);

  ctx2d.fillStyle = TONES[0];
  ctx2d.fillRect(0, (H - 7) * scale, W * scale, 7 * scale);
  ctx2d.fillStyle = TONES[1];
  ctx2d.fillRect(0, (H - 7) * scale, W * scale, 1 * scale);
}

/* A short dark smear under an object so it sits on the desk instead of
   floating above it. */
function contactShadow(ctx2d, x, width, deskTop, scale) {
  dither(ctx2d, x, deskTop, width, 2, TONES[0], 1, scale);
  ctx2d.fillStyle = TONES[0];
  ctx2d.fillRect(x * scale, deskTop * scale, width * scale, scale);
}

export function renderDeskScene(host, ctx, objects) {
  const scene = ctx.content.desk.scene;
  const canvas = el('canvas', { class: 'room__canvas', role: 'img', 'aria-label': ctx.content.desk.sceneLabel });
  canvas.width = scene.w * RENDER_SCALE;
  canvas.height = scene.h * RENDER_SCALE;
  const ctx2d = canvas.getContext('2d');
  ctx2d.imageSmoothingEnabled = false;

  paintRoom(ctx2d, scene, RENDER_SCALE);
  (scene.dressing || []).forEach((item) => {
    const sprite = SPRITES[item.sprite];
    if (sprite) drawSprite(ctx2d, sprite, item.x * RENDER_SCALE, item.y * RENDER_SCALE, RENDER_SCALE);
  });
  objects.forEach((object) => {
    const sprite = SPRITES[object.sprite];
    if (!sprite || !object.at) return;
    if (object.grounded !== false) {
      contactShadow(ctx2d, object.at.x + 2, sprite.w - 4, scene.deskTop, RENDER_SCALE);
    }
    drawSprite(ctx2d, sprite, object.at.x * RENDER_SCALE, object.at.y * RENDER_SCALE, RENDER_SCALE);
  });

  const status = el('p', { class: 'room__status', role: 'status', 'aria-live': 'polite' });
  const layer = el('div', { class: 'room__layer' });
  const room = el('div', {
    class: 'room',
    style: `aspect-ratio:${scene.w} / ${scene.h}`,
  }, [canvas, layer]);

  function say(text) {
    if (!text) return;
    status.textContent = text;
    announce(text);
  }
  /* While the room is on screen it owns the status channel. */
  ctx.sayStatus = say;

  objects.forEach((object) => {
    const hit = object.hit || object.at;
    if (!hit) return;
    const state = ctx.deskState(object);
    const button = el('button', {
      type: 'button',
      class: 'hotspot',
      'data-state': state.kind,
      /* Deliberately not aria-disabled: a blocked object is still clickable,
         and clicking it is how you find out what you are missing. The state
         belongs in the name, not in a flag that says "do not interact". */
      'aria-label': state.label,
      style: `left:${(hit.x / scene.w) * 100}%;top:${(hit.y / scene.h) * 100}%;`
        + `width:${(hit.w / scene.w) * 100}%;height:${(hit.h / scene.h) * 100}%`,
    }, el('span', { class: 'hotspot__name', text: object.label }));

    button.addEventListener('click', () => {
      const now = ctx.deskState(object);
      if (now.kind === 'blocked') {
        ctx.audio.play('wrong');
        say(now.response);
        return;
      }
      ctx.deskActivate(object, say);
    });
    button.addEventListener('focus', () => say(object.responses && object.responses.look));
    append(layer, button);
  });

  append(host, room);
  append(host, status);

  /* A message left behind by a bounced deep link, or by the object that just
     changed state. */
  if (ctx.pendingStatus) {
    say(ctx.pendingStatus);
    ctx.pendingStatus = null;
  }

  return { say };
}
