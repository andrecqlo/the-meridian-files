/* The room, drawn object by object.

   Characters map to the four-tone ramp: k outline, d shaded face, m lit face,
   l highlight and paper. v and g are the only chromatic pixels in the world.
   Rows may be short; anything missing is transparent. */

const MAP = {
  '.': null, 'k': 0, 'd': 1, 'm': 2, 'l': 3,
  'v': '#8B5CF6', 'g': '#B79CFB',
};

export const PAPER_TRAY = {
  w: 44, h: 22, map: MAP,
  rows: [
    '.......kkkkkkkkkkkkkkkkkkkkkkkk.............',
    '.......klllllllllllllllllllllllk............',
    '.......kldddlllllllllllllllllllk............',
    '.......kllllllllldddddddddlllllk............',
    '.......klddddddddllllllllllllllk............',
    '.......kllllllllllllllldddddddlk............',
    '.......klllllllllllllllllllllllk............',
    '.......kkkkkkkkkkkkkkkkkkkkkkkkk............',
    '....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk........',
    '....kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk.......',
    '....kmllllllllllllllllllllllllllllmmk.......',
    '....kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk......',
    '...kkmddddddddddddddddddddddddddddddmkk.....',
    '...kmmdddddddddddddddddddddddddddddddmmk....',
    '...kmdddddddddddddddddddddddddddddddddmk....',
    '...kmddddddddddddddddddddddddddddddddddmk...',
    '...kkddddddddddddddddddddddddddddddddddkk...',
    '....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk....',
  ],
};

export const LAPTOP = {
  w: 54, h: 32, map: MAP,
  rows: [
    '.......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
    '.......kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk....',
    '.......kmkkkkkkkkkkkkkkkkkkkkkkkkkkkkmmk...',
    '.......kmklllllllllllllllllllllllllllkmk...',
    '.......kmkllllllllllllllllllllllllllllkmk..',
    '.......kmkldddddddddddddlllllllllllllkkmk..',
    '.......kmkllllllllllllllllllllllllllllkmk..',
    '.......kmkldddddddddlllllllllllllllllkkmk..',
    '.......kmkllllllllllllllllllllllllllllkmk..',
    '.......kmkldddddddddddddddddlllllllllkkmk..',
    '.......kmkllllllllllllllllllllllllllllkmk..',
    '.......kmklddddddddddddddddlllllllllllkmk..',
    '.......kmkllllllllllllllllllllllllllllkmk..',
    '.......kmkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkmk..',
    '.......kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk.',
    '.......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    '..kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    '..kmllllllllllllllllllllllllllllllllllllllmk',
    '..kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    '..kmmddddddddddddddddddddddddddddddddddmmmmk',
    '..kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    '..kddddddddddddddddddddddddddddddddddddddddk',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  ],
};

export const PINBOARD = {
  w: 62, h: 40, map: MAP,
  rows: [
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kllllllllllllllllllllllllllllllllllllllllllllllllllllllllllk',
    'klkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'klkmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmkk',
    'klkmmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmmkk',
    'klkmm.lllllll..mm..llllllll..mm..lllllll..mmmmmmmmmmmmmmmmkk',
    'klkmm.lllllll..mm..llllllll..mm..lllllll..mmdmdmdmdmdmdmdmkk',
    'klkmm.lddddll..mm..lddddddl..mm..lddddll..mmmmmmmmmmmmmmmmkk',
    'klkmm.lllllll..mm..llllllll..mm..lllllll..mmdmdmdmdmdmdmdmkk',
    'klkmmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmmmmmmmmmmmmmmmmkk',
    'klkmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmdmdmdmdmdmdmdmkk',
    'klkmm....llllllllll....mm....lllllllll....mmmmmmmmmmmmmmmmkk',
    'klkmm....llllllllll....mm....lddddddll....mmdmdmdmdmdmdmdmkk',
    'klkmm....lddddddddl....mm....lllllllll....mmmmmmmmmmmmmmmmkk',
    'klkmm....llllllllll....mm....mmmmmmmmm....mmdmdmdmdmdmdmdmkk',
    'klkmmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmmmmmmmmmmmmmmmmkk',
    'klkmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmdmdmdmdmdmdmdmkk',
    'klkmmmmmmmmmmmmm....lllllllllll....mmmmmmmmmmmmmmmmmmmmmmmkk',
    'klkmmdmdmdmdmdm.....lllllllllll....mdmdmdmdmdmdmdmdmdmdmdmkk',
    'klkmmmmmmmmmmmm.....lddddddddll....mmmmmmmmmmmmmmmmmmmmmmmkk',
    'klkmmmmmmmmmmmm.....lllllllllll....mmmmmmmmmmmmmmmmmmmmmmmkk',
    'klkmmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmdmmkk',
    'klkmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmkk',
    'klkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kldddddddddddddddddddddddddddddddddddddddddddddddddddddddddk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  ],
};

export const DRAWER = {
  w: 58, h: 24, map: MAP,
  rows: [
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    'kllllllllllllllllllllllllllllllllllllllllllllllllllllllllk',
    'kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmmmmmmmmmmkkkkkkkkkmmmmmmmmmmmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmmmmmmmmmmkllllllkmmmmmmmmmmmmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmmmmmmmmmmkdddddddkmmmmmmmmmmmmmmmmmmmmmmmmk',
    'kmmmmmmmmmmmmmmmmmmmmmmmkkkkkkkkkmmmmmmmmmmmmmmmmmmmmmmmmk',
    'kddddddddddddddddddddddddddddddddddddddddddddddddddddddddk',
    'kddddddddddddddddddddddddddddddddddddddddddddddddddddddddk',
    'kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  ],
};

export const DESK_TORCH = {
  w: 32, h: 12, map: MAP,
  rows: [
    '....kkkkkkkkkkkkkkkkkk..........',
    '...klllllllllllllllllk..kkkk....',
    '...kmlmlmlmlmlmlmlmllk.klllk....',
    '...kmmmmmmmmmmmmmmmmmkkkllllk.v.',
    '...kddddddddddddddddddkklvvvkvgv',
    '...kmdmdmdmdmdmdmdmddkkkllggk.v.',
    '...kddddddddddddddddddk.kllllk..',
    '....kkkkkkkkkkkkkkkkkk..kkkkk...',
  ],
};

export const MUG = {
  w: 16, h: 14, map: MAP,
  rows: [
    '..kkkkkkkkk.....',
    '..kllllllllk....',
    '..kmmmmmmmmk....',
    '..kmddddddmkkk..',
    '..kmddddddmklk..',
    '..kmddddddmkmk..',
    '..kmddddddmklk..',
    '..kmddddddmkkk..',
    '..kdddddddmk....',
    '..kkkkkkkkk.....',
  ],
};

export const STRING = {
  w: 20, h: 18, map: MAP,
  rows: [
    '.....kkkkkkkk.......',
    '...kkllllllllkk.....',
    '..klldddddddlllk....',
    '..kldkkkkkkkkdlk....',
    '..kldkllllllkdlk....',
    '..kldkllllllkdlk....',
    '..kldkkkkkkkkdlk....',
    '..klldddddddlllk....',
    '...kkllllllllkk.....',
    '.....kkkkkkkk.......',
    '.......k...k........',
    '......k.....k.......',
  ],
};

export const LETTER = {
  w: 22, h: 16, map: MAP,
  rows: [
    'kkkkkkkkkkkkkkkkkkkk..',
    'kllllllllllllllllllk..',
    'klkdlllllllllllldkllk.',
    'kllkdlllllllllldkkllk.',
    'klllkdlllllllldkklllk.',
    'kllllkdllllllkdlllllk.',
    'klllllkdllllkdllllllk.',
    'kllllllkddddkdlllllllk',
    'klllllllllllllllllllk.',
    'kllldddddddddllllllllk',
    'klllllllllllllllllllk.',
    'kkkkkkkkkkkkkkkkkkkkk.',
  ],
};

/* The same tray with nothing in it. Padded at the top so it can be drawn at
   the same origin as the full one. */
export const PAPER_TRAY_EMPTY = {
  w: 44, h: 22, map: MAP,
  rows: [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk........',
    '....kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk.......',
    '....kmddddddddddddddddddddddddddddmmk.......',
    '....kmdddddddddddddddddddddddddddddddk......',
    '...kkmddddddddddddddddddddddddddddddmkk.....',
    '...kmmdddddddddddddddddddddddddddddddmmk....',
    '...kmdddddddddddddddddddddddddddddddddmk....',
    '...kmddddddddddddddddddddddddddddddddddmk...',
    '...kkddddddddddddddddddddddddddddddddddkk...',
    '....kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk....',
  ],
};

/* Drawn over anything the room says you cannot open yet. Light body, dark
   keyhole, so it reads against both the drawer front and the desk. */
export const PADLOCK = {
  w: 9, h: 12, map: MAP,
  rows: [
    '..kkkkk..',
    '.kklllkk.',
    '.kl...lk.',
    '.kl...lk.',
    'kkkkkkkkk',
    'klllllllk',
    'kllkkkllk',
    'kllkkkllk',
    'kllllkllk',
    'kllllkllk',
    'klllllllk',
    'kkkkkkkkk',
  ],
};

/* The photograph clipped to the customer's file. A bust on a flat studio
   background, four tones, no detail that would not survive at this size. */
export const PORTRAIT = {
  w: 24, h: 24, map: MAP,
  rows: [
    'kkkkkkkkkkkkkkkkkkkkkkkk',
    'kmmmmmmmmmmmmmmmmmmmmmmk',
    'kmmmmmmmkkkkkkkkmmmmmmmk',
    'kmmmmmkkddddddddkkmmmmmk',
    'kmmmmkddddddddddddkmmmmk',
    'kmmmkdddllllllllddkmmmmk',
    'kmmmkddlllllllllldkmmmmk',
    'kmmmkdllllllllllldkmmmmk',
    'kmmmkdllkllllkllldkmmmmk',
    'kmmmkdllkllllkllldkmmmmk',
    'kmmmkdlllllllllllkkmmmmk',
    'kmmmkdlllllkllllllkmmmmk',
    'kmmmkdllllllllllllkmmmmk',
    'kmmmkdllllkkkkllllkmmmmk',
    'kmmmmkdlllllllllkkmmmmmk',
    'kmmmmmkdlllllllkmmmmmmmk',
    'kmmmmmmkdlllllkmmmmmmmmk',
    'kmmmmmmmkkllkkmmmmmmmmmk',
    'kmmmmmmmkdllldkmmmmmmmmk',
    'kmmmmmkkddlllddkkmmmmmmk',
    'kmmmkkdddddllldddddkkmmk',
    'kmmkddddddddddddddddddkk',
    'kmkddddddddddddddddddddk',
    'kkddddddddddddddddddddkk',
  ],
};

/* The reference sheet from the drawer: ruled rows, three blocks. */
export const STATS = {
  w: 22, h: 18, map: MAP,
  rows: [
    'kkkkkkkkkkkkkkkkkkkk..',
    'klllllllllllllllllllk.',
    'klldddddddddllllllllk.',
    'klllllllllllllllllllk.',
    'klldddllllllldddlllllk',
    'klldddllllllldddllllk.',
    'klllllllllllllllllllk.',
    'klldddllllllldddlllllk',
    'klldddllllllldddllllk.',
    'klllllllllllllllllllk.',
    'klldddllllllldddlllllk',
    'klldddllllllldddllllk.',
    'klllllllllllllllllllk.',
    'kkkkkkkkkkkkkkkkkkkkk.',
  ],
};

/* The same machine with the screen asking for a PIN. Drawn at the same origin
   as LAPTOP, so the object does not shift when it opens. */
export const LAPTOP_LOCKED = {
  w: 54, h: 32, map: MAP,
  rows: [
    '.......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.....',
    '.......kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk....',
    '.......kmkkkkkkkkkkkkkkkkkkkkkkkkkkkkmmk...',
    '.......kmkddddddddddddddddddddddddddkmk....',
    '.......kmkdddddddddddkkkkkddddddddddddkmk..',
    '.......kmkdddddddddddkdddkdddddddddddkkmk..',
    '.......kmkdddddddddddkdddkddddddddddddkmk..',
    '.......kmkddddddddddkkkkkkkddddddddddkkmk..',
    '.......kmkddddddddddkdlllldkddddddddddkmk..',
    '.......kmkddddddddddkdllkldkdddddddddkkmk..',
    '.......kmkddddddddddkdlllldkddddddddddkmk..',
    '.......kmkddddddddddkkkkkkkdddddddddddkmk..',
    '.......kmkddddddddddddddddddddddddddddkmk..',
    '.......kmkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkmk..',
    '.......kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk.',
    '.......kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk..',
    '...kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
    '..kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    '..kmllllllllllllllllllllllllllllllllllllllmk',
    '..kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    '..kmmddddddddddddddddddddddddddddddddddmmmmk',
    '..kmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    '..kddddddddddddddddddddddddddddddddddddddddk',
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk',
  ],
};
