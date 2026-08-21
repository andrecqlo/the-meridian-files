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

export const CASE_FILE = {
  w: 42, h: 22, map: MAP,
  rows: [
    '.....kkkkkkkkkkkk.........................',
    '.....kllllllllllkkkkkkkkkkkkkkkkkkkkk.....',
    '.....klmmmmmmmmmlllllllllllllllllllllk....',
    'kkkkkklmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk...',
    'klllllllmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk..',
    'klmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk.',
    'klmmkkkkkkmmmkkkkkmmmkkkkkkkkkmmmmmmmmmmk',
    'klmmkllllkmmmklllkmmmkllllllkmmmmmmmmmmmk',
    'klmmkkkkkkmmmkkkkkmmmkkkkkkkkkmmmmmmmmmmk',
    'klmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    'klmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk',
    'kldddddddddddddddddddddddddddddddddddddddk',
    'kkddddddddddddddddddddddddddddddddddddddkk',
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
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

export const LAMP = {
  w: 32, h: 42, map: MAP,
  rows: [
    '.........kkkkkkkkkkkkkk.........',
    '........klllllllllllllk.........',
    '.......kmmmmmmmmmmmmmmmk........',
    '......kmmmmmmmmmmmmmmmmmk.......',
    '.....kmmmmmmmmmmmmmmmmmmmk......',
    '....kddddddddddddddddddddddk....',
    '....kgggggggggggggggggggggggk...',
    '....kkkkkkkkkkkkkkkkkkkkkkkkk...',
    '.............kkkk...............',
    '.............kmmk...............',
    '.............kdmk...............',
    '.............kdmk...............',
    '.............kdmk...............',
    '.............kdmk...............',
    '.............kdmk...............',
    '.............kdmk...............',
    '.............kdmk...............',
    '.............kdmk...............',
    '.............kdmk...............',
    '........kkkkkkdmkkkkkkk.........',
    '.......kmmmmmmmmmmmmmmmk........',
    '.......kdddddddddddddddk........',
    '.......kkkkkkkkkkkkkkkkk........',
  ],
};

export const REPORT = {
  w: 38, h: 18, map: MAP,
  rows: [
    '..kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk......',
    '..klllllllllllllllllllllllllllk.......',
    '..kldddddddddddddddddddddddddlk.......',
    '..klllllllllllllllllllllllllllkkkkkk..',
    'kkkllllllllllllllllllllllllllllllllk..',
    'klllllllllllllllllllllllllllllllllmk..',
    'klmmkkkkkkkkkkkkkkkkkkkkkkkkkkmmmmmk..',
    'klmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk..',
    'klmmkkkkkkkkkkkkkkkkkkkkmmmmmmmmmmmk..',
    'klmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmmk..',
    'kldddddddddddddddddddddddddddddddddmk.',
    'kkddddddddddddddddddddddddddddddddddk.',
    '.kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.',
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
