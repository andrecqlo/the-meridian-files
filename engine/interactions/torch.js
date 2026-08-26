/* The UV torch.

   A pool of violet light that follows the pointer and brings Sam's handwriting
   up out of the paper a few words at a time. The reveal is a mask tracking the
   beam, not a switch on the whole note: you read marginalia by moving the light
   along it, which is the entire point of carrying a torch.

   There is no per-document control. On a pointer device the beam follows the
   cursor; on touch it goes where you touch and sweeps as you drag; on a
   keyboard the beam itself is focusable, the arrow keys walk it, and N jumps it
   to the next annotation on the page. */

import { announce } from '../dom.js';
import { spriteToDataURL } from '../pixel.js';
import { TORCH } from '../../assets/sprites/torch.js';

const RADIUS = 95;
const IN_RANGE = RADIUS * 1.3;
const SPRITE_SCALE = 5;
/* Where the lens sits inside the sprite, so the light pool lines up with it. */
const LENS_X = 26 * SPRITE_SCALE;
const LENS_Y = 5.5 * SPRITE_SCALE;

export function createTorch(ctx) {
  const beam = document.getElementById('torch-beam');
  const store = ctx.store;
  let body = null;
  let handle = null;
  let on = false;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let notes = [];
  let jumpIndex = -1;
  let frame = null;

  function held() {
    return store.get('torch', { held: false }).held === true;
  }

  function revealedSet() {
    return new Set(store.get('revealed', []) || []);
  }

  function markRevealed(node) {
    const id = node.dataset.noteId;
    if (!id) return;
    const seen = revealedSet();
    if (seen.has(id)) return;
    seen.add(id);
    store.set('revealed', Array.from(seen));
    if (node.dataset.reveals) ctx.bus.emit('reveal', { id, reveals: node.dataset.reveals });
    if (node.dataset.finding) ctx.recordFinding(node.dataset.finding);
    ctx.bus.emit('note-read', { id });
  }

  function ensureFurniture() {
    if (body) return;
    body = document.createElement('img');
    body.className = 'torch-body';
    body.alt = '';
    body.setAttribute('aria-hidden', 'true');
    body.src = spriteToDataURL(TORCH, SPRITE_SCALE);
    document.body.appendChild(body);

    /* The beam is focusable in its own right, so a keyboard player steers the
       light rather than hunting for a button on every document. */
    handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'torch-handle';
    handle.setAttribute('aria-label', ctx.content.torch.keyboardHint);
    handle.addEventListener('keydown', onHandleKey);
    document.body.appendChild(handle);
  }

  function paint() {
    frame = null;
    beam.style.left = `${x}px`;
    beam.style.top = `${y}px`;
    if (body) {
      body.style.left = `${x - LENS_X}px`;
      body.style.top = `${y - LENS_Y}px`;
    }
    if (handle) {
      handle.style.left = `${x}px`;
      handle.style.top = `${y}px`;
    }
    notes.forEach((node) => {
      if (node.dataset.inspect === '1') return;
      const rect = node.getBoundingClientRect();
      const nearestX = Math.max(rect.left, Math.min(x, rect.right));
      const nearestY = Math.max(rect.top, Math.min(y, rect.bottom));
      const distance = Math.hypot(x - nearestX, y - nearestY);
      const lit = distance < IN_RANGE;
      node.dataset.lit = lit ? '1' : '0';
      if (!lit) return;
      /* Mask coordinates are note-local, so the light cuts across the words
         rather than switching the whole line on. */
      node.style.setProperty('--uv-x', `${x - rect.left}px`);
      node.style.setProperty('--uv-y', `${y - rect.top}px`);
      if (distance < RADIUS * 0.5) markRevealed(node);
    });
  }

  function schedule() {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(paint);
  }

  function moveTo(nextX, nextY) {
    x = Math.max(0, Math.min(window.innerWidth, nextX));
    y = Math.max(0, Math.min(window.innerHeight, nextY));
    schedule();
  }

  function onPointerMove(event) {
    if (!on) return;
    /* On touch the light only follows a drag that starts on a document — the
       page must still scroll everywhere else. `touch-action: none` on .doc
       while the torch is lit is what makes that safe. */
    if (event.pointerType === 'touch' && !event.target.closest('.doc')) return;
    moveTo(event.clientX, event.clientY);
  }

  function onPointerDown(event) {
    if (!on || event.pointerType !== 'touch') return;
    if (!event.target.closest('.doc')) return;
    moveTo(event.clientX, event.clientY);
  }

  function jumpToNextNote() {
    if (!notes.length) return;
    jumpIndex = (jumpIndex + 1) % notes.length;
    const node = notes[jumpIndex];
    node.scrollIntoView({ block: 'center', behavior: 'auto' });
    const rect = node.getBoundingClientRect();
    moveTo(rect.left + Math.min(rect.width / 2, 80), rect.top + rect.height / 2);
    announce(`Light on annotation ${jumpIndex + 1} of ${notes.length}.`);
  }

  function onHandleKey(event) {
    const step = event.shiftKey ? 64 : 24;
    const moves = {
      ArrowUp: [0, -step], ArrowDown: [0, step], ArrowLeft: [-step, 0], ArrowRight: [step, 0],
    };
    if (moves[event.key]) {
      event.preventDefault();
      moveTo(x + moves[event.key][0], y + moves[event.key][1]);
      return;
    }
    if (event.key === 'n' || event.key === 'N') {
      event.preventDefault();
      jumpToNextNote();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOn(false);
      const item = document.querySelector('.item[data-item="torch"]');
      if (item) item.focus();
    }
  }

  function setOn(next, options) {
    const wanted = Boolean(next) && held();
    if (wanted) ensureFurniture();
    on = wanted;
    beam.hidden = !on;
    if (body) body.hidden = !on;
    if (handle) handle.hidden = !on;
    document.body.dataset.torch = on ? 'on' : 'off';
    /* The inventory item is the only on/off control left — keep its
       aria-pressed in step, however the state changed (click, Escape, or the
       keyboard handle). */
    if (ctx.inventory) ctx.inventory.render();
    if (!on) {
      notes.forEach((node) => { if (node.dataset.inspect !== '1') node.dataset.lit = '0'; });
    } else {
      schedule();
      if (!options || options.focus !== false) handle.focus({ preventScroll: true });
      /* Say how to drive it, once, the first time it goes on. */
      if (!store.get('torchBriefed', false)) {
        store.set('torchBriefed', true);
        announce(ctx.content.torch.keyboardHint);
      }
    }
    store.patch('torch', { on });
    return on;
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerdown', onPointerDown, { passive: true });
  window.addEventListener('scroll', () => { if (on) schedule(); }, { passive: true });
  window.addEventListener('resize', () => { if (on) schedule(); });

  return {
    get on() { return on; },
    get held() { return held(); },
    setOn,
    toggle() { return setOn(!on); },
    jumpToNextNote,
    pickUp() {
      store.patch('torch', { held: true });
      ctx.bus.emit('torch-held', {});
      announce(ctx.content.torch.firstUse);
      return true;
    },
    /* Called after each scene render: re-collect annotations in document order
       so the jump key walks them the way the page reads. */
    refresh() {
      notes = Array.from(document.querySelectorAll('.uv-note'));
      jumpIndex = -1;
      if (on) schedule();
    },
  };
}

export function mount() {
  throw new Error('The torch is mounted by the engine, not by a scene.');
}
