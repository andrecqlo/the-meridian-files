/* Tiny DOM helpers. No framework: this has to run from a static folder. */

export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach((name) => {
      const value = attrs[name];
      if (value === null || value === undefined || value === false) return;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = value;
      else if (name === 'html') node.innerHTML = value;
      else if (name === 'dataset') Object.assign(node.dataset, value);
      else if (name.startsWith('on') && typeof value === 'function') {
        node.addEventListener(name.slice(2).toLowerCase(), value);
      } else node.setAttribute(name, value === true ? '' : value);
    });
  }
  append(node, children);
  return node;
}

export function append(parent, children) {
  if (children === null || children === undefined) return parent;
  const list = Array.isArray(children) ? children : [children];
  list.forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    parent.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  });
  return parent;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

/* Politely announced status line, shared by every interaction. */
export function announce(message) {
  const region = document.getElementById('live-region');
  if (!region) return;
  region.textContent = '';
  window.setTimeout(() => {
    region.textContent = message;
  }, 60);
}

export function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function formatNumber(value) {
  return Number(value).toLocaleString('en-GB');
}

/* Arrow/Home/End roving-tabindex navigation for a role="tablist" whose tabs
   auto-activate on focus — shared by the two workbench-style tab bars
   (reweight-workbench, cohort-diagram). The shell's own tab bar mixes
   navigation "link" tabs in with content tabs, where auto-activating on
   arrow focus would be wrong (moving focus would leave the current scene),
   so it keeps its own manual-activation keydown handler rather than this one. */
export function bindTablistArrowKeys(tablist, { items, getActiveId, onSelect, tabs }) {
  tablist.addEventListener('keydown', (event) => {
    const index = items.findIndex((item) => item.id === getActiveId());
    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = items.length - 1;
    if (next === null) return;
    event.preventDefault();
    onSelect(items[next].id);
    tabs[next].focus();
  });
}

export function focusFirst(container) {
  const target = container.querySelector('[data-autofocus]')
    || container.querySelector('h1, h2, [tabindex="-1"]');
  if (target) {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: false });
  }
}
