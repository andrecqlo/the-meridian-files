/* Interaction registry. Scenes name an interaction type in JSON; the engine
   loads the matching module here. Adding a future case means adding a line to
   BUILT and dropping a module into interactions/ — no existing case changes. */

const BUILT = {
  'torch': () => import('./interactions/torch.js'),
  'complaint-inspect': () => import('./interactions/complaint-inspect.js'),
  'cohort-diagram': () => import('./interactions/cohort-diagram.js'),
  'reweight-workbench': () => import('./interactions/reweight-workbench.js'),
  'pinboard': () => import('./interactions/pinboard.js'),
  'fragment-assembly': () => import('./interactions/fragment-assembly.js'),
  'code-entry': () => import('./interactions/code-entry.js'),
  'lock-screen': () => import('./interactions/lock-screen.js'),
  'decision': () => import('./interactions/decision.js'),
  'timed-twist': () => import('./interactions/timed-twist.js'),
  'memo': () => import('./interactions/memo.js'),
  'debrief': () => import('./interactions/debrief.js'),
};

/* Reserved for cases 02–04. Named here so content can reference them the day
   the module lands, and so nothing silently no-ops in the meantime. */
const PLANNED = [
  'side-by-side-diff',
  'timeline-tracks',
  'string-board',
  'control-panel',
  'stress-test',
  'scrubber',
  'chain-builder',
  'branch-rerun',
];

export function isBuilt(name) {
  return Object.prototype.hasOwnProperty.call(BUILT, name);
}

export async function load(name) {
  if (BUILT[name]) {
    const mod = await BUILT[name]();
    return mod;
  }
  if (PLANNED.includes(name)) {
    throw new Error(`Interaction "${name}" is registered for a future case but not built yet.`);
  }
  throw new Error(`Unknown interaction "${name}".`);
}
