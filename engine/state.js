/* Namespaced localStorage wrapper. Every key lives under meridian.<case>.* so a
   refresh mid-session resumes exactly where the player was, and a reset can
   sweep one case without touching the rest of the series. */

const ROOT = 'meridian';

function key(caseId, name) {
  return `${ROOT}.${caseId}.${name}`;
}

function available() {
  try {
    const probe = `${ROOT}.probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return true;
  } catch (err) {
    return false;
  }
}

const HAS_STORAGE = available();
const memory = new Map();

function readRaw(k) {
  if (!HAS_STORAGE) return memory.has(k) ? memory.get(k) : null;
  return localStorage.getItem(k);
}

function writeRaw(k, value) {
  if (!HAS_STORAGE) {
    memory.set(k, value);
    return;
  }
  try {
    localStorage.setItem(k, value);
  } catch (err) {
    memory.set(k, value);
  }
}

function removeRaw(k) {
  if (!HAS_STORAGE) {
    memory.delete(k);
    return;
  }
  localStorage.removeItem(k);
}

export function createStore(caseId) {
  const listeners = new Set();

  function get(name, fallback) {
    const raw = readRaw(key(caseId, name));
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function set(name, value) {
    writeRaw(key(caseId, name), JSON.stringify(value));
    listeners.forEach((fn) => fn(name, value));
    return value;
  }

  /* Shallow-merge into an object-shaped key. Most progress writes are partial. */
  function patch(name, partial) {
    const current = get(name, {}) || {};
    return set(name, Object.assign({}, current, partial));
  }

  function del(name) {
    removeRaw(key(caseId, name));
    listeners.forEach((fn) => fn(name, undefined));
  }

  function reset() {
    const prefix = `${ROOT}.${caseId}.`;
    if (HAS_STORAGE) {
      const doomed = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) doomed.push(k);
      }
      doomed.forEach((k) => localStorage.removeItem(k));
    }
    Array.from(memory.keys())
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => memory.delete(k));
    listeners.forEach((fn) => fn('*', undefined));
  }

  function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  return { caseId, get, set, patch, del, reset, subscribe, persistent: HAS_STORAGE };
}

/* Series-level preferences that outlive a single case (sound, for example). */
export const prefs = {
  get(name, fallback) {
    const raw = readRaw(`${ROOT}.prefs.${name}`);
    if (raw === null || raw === undefined) return fallback;
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  },
  set(name, value) {
    writeRaw(`${ROOT}.prefs.${name}`, JSON.stringify(value));
    return value;
  },
};
