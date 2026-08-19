/* The UV torch. A circle of violet light that follows the pointer and brings
   Sam's handwriting up out of the paper.

   Keyboard and touch users are not second-class here: every document with
   annotations carries an "Inspect under UV" toggle, and while the torch button
   holds focus the arrow keys walk the beam across the screen. */

import { announce, reducedMotion } from '../dom.js';

const RADIUS = 150;

export function createTorch(ctx) {
  const beam = document.getElementById('torch-beam');
  const store = ctx.store;
  let on = false;
  let x = window.innerWidth / 2;
  let y = window.innerHeight / 2;
  let notes = [];
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
    const doc = node.closest('.doc');
    if (doc) doc.dataset.newNote = '0';
    if (node.dataset.reveals) ctx.bus.emit('reveal', { id, reveals: node.dataset.reveals });
    ctx.bus.emit('note-read', { id });
  }

  function paint() {
    frame = null;
    beam.style.left = `${x}px`;
    beam.style.top = `${y}px`;
    notes.forEach((node) => {
      if (node.dataset.inspect === '1') return;
      const rect = node.getBoundingClientRect();
      const cx = Math.max(rect.left, Math.min(x, rect.right));
      const cy = Math.max(rect.top, Math.min(y, rect.bottom));
      const distance = Math.hypot(x - cx, y - cy);
      const lit = distance < RADIUS * 0.72;
      node.dataset.lit = lit ? '1' : '0';
      if (lit) markRevealed(node);
    });
  }

  function schedule() {
    if (frame !== null) return;
    frame = window.requestAnimationFrame(paint);
  }

  function onPointerMove(event) {
    if (!on) return;
    x = event.clientX;
    y = event.clientY;
    schedule();
  }

  function setOn(next) {
    on = Boolean(next) && held();
    beam.hidden = !on;
    document.body.dataset.torch = on ? 'on' : 'off';
    const button = document.getElementById('btn-torch');
    if (button) {
      button.setAttribute('aria-pressed', on ? 'true' : 'false');
      button.title = on ? ctx.content.torch.toggleOff : ctx.content.torch.toggleOn;
    }
    if (!on) notes.forEach((node) => { if (node.dataset.inspect !== '1') node.dataset.lit = '0'; });
    else schedule();
    store.patch('torch', { on });
    return on;
  }

  function nudge(dx, dy) {
    if (!on) return;
    x = Math.max(0, Math.min(window.innerWidth, x + dx));
    y = Math.max(0, Math.min(window.innerHeight, y + dy));
    schedule();
  }

  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('scroll', () => { if (on) schedule(); }, { passive: true });
  window.addEventListener('resize', () => { if (on) schedule(); });

  return {
    get on() { return on; },
    get held() { return held(); },
    setOn,
    toggle() { return setOn(!on); },
    nudge,
    pickUp() {
      store.patch('torch', { held: true });
      ctx.bus.emit('torch-held', {});
      announce(ctx.content.torch.firstUse);
      return true;
    },
    /* Called after each scene render: re-collect annotations and replay
       anything already discovered so a refresh does not hide it again. */
    refresh() {
      notes = Array.from(document.querySelectorAll('.uv-note'));
      const seen = revealedSet();
      notes.forEach((node) => {
        if (seen.has(node.dataset.noteId)) {
          node.dataset.lit = '0';
          const doc = node.closest('.doc');
          if (doc) doc.dataset.newNote = '0';
        }
      });
      if (on) schedule();
    },
    /* Inspect mode: the per-document keyboard equivalent of sweeping the beam. */
    inspect(docNode, next) {
      const value = next ? '1' : '0';
      docNode.querySelectorAll('.uv-note').forEach((node) => {
        node.dataset.inspect = value;
        if (next) markRevealed(node);
      });
      if (next) {
        docNode.dataset.newNote = '0';
        const count = docNode.querySelectorAll('.uv-note').length;
        announce(count === 1 ? 'One annotation revealed.' : `${count} annotations revealed.`);
      }
    },
    /* Fresh marginalia should announce itself even before the beam finds it. */
    flagNew(docNode) {
      if (!docNode) return;
      docNode.dataset.newNote = '1';
      if (reducedMotion()) docNode.dataset.newNote = '1';
    },
  };
}

export function mount() {
  throw new Error('The torch is mounted by the engine, not by a scene.');
}
