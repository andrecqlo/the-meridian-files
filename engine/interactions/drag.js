/* Shared pointer-drag with a select-then-place fallback.

   Every drag in this game has to work three ways: mouse drag, touch drag, and
   keyboard. Rather than HTML5 drag-and-drop (which touch does not do), this
   uses pointer events for dragging and treats a plain click or Enter/Space as
   "select", followed by a click or Enter/Space on a target as "place". */

const THRESHOLD = 6;

export function createDnD(options) {
  const opts = options || {};
  const zones = [];
  let selected = null;
  let drag = null;

  function setSelected(next) {
    if (selected && selected.node) selected.node.setAttribute('aria-pressed', 'false');
    selected = next;
    if (selected && selected.node) selected.node.setAttribute('aria-pressed', 'true');
    zones.forEach((zone) => {
      const ready = Boolean(selected) && zone.accepts(selected);
      zone.node.dataset.drop = ready ? 'ready' : '';
    });
    if (opts.onSelect) opts.onSelect(selected);
  }

  function clearSelection() {
    setSelected(null);
  }

  function zoneAt(x, y) {
    const target = document.elementFromPoint(x, y);
    if (!target) return null;
    for (let i = 0; i < zones.length; i += 1) {
      if (zones[i].node.contains(target) || zones[i].node === target) return zones[i];
    }
    return null;
  }

  function endDrag(event) {
    if (!drag) return;
    const info = drag;
    drag = null;
    if (info.ghost && info.ghost.parentNode) info.ghost.parentNode.removeChild(info.ghost);
    info.node.style.visibility = '';
    document.body.style.userSelect = '';
    if (!info.moved) return; /* a tap: the click handler deals with selection */
    const zone = zoneAt(event.clientX, event.clientY);
    zones.forEach((z) => { z.node.dataset.drop = ''; });
    if (zone && zone.accepts(info.item)) zone.onDrop(info.item, { x: event.clientX, y: event.clientY });
  }

  function moveDrag(event) {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < THRESHOLD) return;
    if (!drag.moved) {
      drag.moved = true;
      document.body.style.userSelect = 'none';
      const rect = drag.node.getBoundingClientRect();
      const ghost = drag.node.cloneNode(true);
      ghost.classList.add(drag.ghostClass || 'criterion--ghost');
      ghost.removeAttribute('id');
      ghost.style.width = `${rect.width}px`;
      ghost.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ghost);
      drag.ghost = ghost;
      drag.offsetX = drag.startX - rect.left;
      drag.offsetY = drag.startY - rect.top;
    }
    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;
    drag.ghost.style.position = 'fixed';
    const zone = zoneAt(event.clientX, event.clientY);
    zones.forEach((z) => {
      z.node.dataset.drop = z === zone && z.accepts(drag.item) ? 'ready' : (selected && z.accepts(selected) ? 'ready' : '');
    });
  }

  window.addEventListener('pointermove', moveDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);

  return {
    /* node must be a <button> so keyboard activation and ARIA come free. */
    draggable(node, item, config) {
      const cfg = config || {};
      node.setAttribute('aria-pressed', 'false');
      node.addEventListener('pointerdown', (event) => {
        if (cfg.disabled && cfg.disabled()) return;
        if (event.button !== undefined && event.button !== 0) return;
        drag = {
          node, item, moved: false, ghost: null,
          startX: event.clientX, startY: event.clientY,
          ghostClass: cfg.ghostClass,
        };
      });
      node.addEventListener('click', (event) => {
        event.preventDefault();
        if (cfg.disabled && cfg.disabled()) return;
        if (selected && selected.id === item.id) clearSelection();
        else setSelected(item);
      });
      return node;
    },
    dropzone(node, config) {
      const zone = {
        node,
        accepts: config.accepts || (() => true),
        onDrop: config.onDrop,
      };
      zones.push(zone);
      node.addEventListener('click', () => {
        if (!selected) return;
        if (!zone.accepts(selected)) return;
        const item = selected;
        clearSelection();
        zone.onDrop(item, null);
      });
      return node;
    },
    get selected() { return selected; },
    select: setSelected,
    clearSelection,
    destroy() {
      window.removeEventListener('pointermove', moveDrag);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
    },
  };
}
