/* What you are carrying.

   Each item does the obvious thing when you pick it out of the tray: the torch
   switches on, the string arms itself for use on something, the letter opens so
   you can read it again. Arming is the adventure-game verb, but nothing is ever
   blocked on discovering it — an object that needs the string will open as long
   as the string is in the tray, because there are fifteen minutes on the clock
   and a puzzle about a UI convention is not the puzzle. */

import { el, append, clear, announce } from './dom.js';
import { spriteToDataURL } from './pixel.js';
import * as SPRITES from '../assets/sprites/desk.js';

export function createInventory(ctx) {
  let armed = null;
  let host = null;

  function held() {
    return ctx.store.get('inventory', []) || [];
  }

  function has(id) {
    return held().indexOf(id) >= 0;
  }

  function definition(id) {
    return (ctx.content.items || []).find((item) => item.id === id);
  }

  function add(id) {
    if (has(id)) return false;
    const next = held().concat([id]);
    ctx.store.set('inventory', next);
    const item = definition(id);
    ctx.bus.emit('item-taken', { id });
    if (item) announce(`${item.label} added to your things.`);
    render();
    return true;
  }

  function arm(id) {
    armed = armed === id ? null : id;
    render();
    return armed;
  }

  function render() {
    if (!host) return;
    clear(host);
    const carried = held();
    if (!carried.length) {
      host.hidden = true;
      return;
    }
    host.hidden = false;
    append(host, el('p', { class: 'inventory__label', text: ctx.content.inventoryLabel }));
    const row = el('div', { class: 'inventory__row', role: 'toolbar', 'aria-label': ctx.content.inventoryLabel });

    carried.forEach((id) => {
      const item = definition(id);
      if (!item) return;
      const sprite = SPRITES[item.sprite];
      const isArmed = armed === id;
      const button = el('button', {
        type: 'button',
        class: 'item',
        'aria-pressed': isArmed ? 'true' : 'false',
        'aria-label': `${item.label}. ${item.hint || ''}`,
      }, [
        sprite
          ? el('img', { class: 'item__art', src: spriteToDataURL(sprite, 3), alt: '' })
          : el('span', { class: 'item__art' }),
        el('span', { class: 'item__name', text: item.label }),
      ]);
      button.addEventListener('click', () => use(item));
      append(row, button);
    });
    append(host, row);
  }

  /* One click, one obvious outcome. */
  function use(item) {
    if (item.action === 'torch') {
      const on = ctx.torch.toggle();
      announce(on ? item.onText : item.offText);
      return;
    }
    if (item.route) {
      ctx.router.go(item.route);
      return;
    }
    const next = arm(item.id);
    ctx.status(next ? item.armedText : item.disarmedText);
  }

  return {
    mount(node) { host = node; render(); },
    render,
    add,
    has,
    get armed() { return armed; },
    disarm() { armed = null; render(); },
  };
}
