/* Hash routing so deep links survive a static host with no server config. */

export function createRouter(resolve) {
  let current = null;

  function parse() {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').filter(Boolean);
    return { path: parts.join('/'), parts };
  }

  function handle() {
    const route = parse();
    current = route;
    resolve(route);
  }

  return {
    start() {
      window.addEventListener('hashchange', handle);
      handle();
    },
    go(path) {
      const next = `#/${String(path).replace(/^#?\/?/, '')}`;
      if (window.location.hash === next) handle();
      else window.location.hash = next;
    },
    replace(path) {
      const next = `#/${String(path).replace(/^#?\/?/, '')}`;
      window.history.replaceState(null, '', next);
      handle();
    },
    get current() {
      return current;
    },
  };
}
