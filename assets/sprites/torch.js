/* The UV torch, drawn side on with the lens at the right-hand end.

   Deliberately not rotated: rotating pixel art resamples it and the grid goes
   soft. Horizontal, with the light pool sitting at the lens, reads correctly
   and stays crisp. */

export const TORCH = {
  w: 30,
  h: 12,
  map: {
    '.': null,
    'k': 0,          // outline
    'd': 1,          // barrel shadow
    'm': 2,          // barrel highlight
    'l': 3,          // bezel
    'v': '#8B5CF6',  // lens
    'g': '#B79CFB',  // lens glare
  },
  rows: [
    '..............................',
    '....kkkkkkkkkkkkkkkk..........',
    '...klllllllllllllllk..kkkk....',
    '..klmlmlmlmlmlmlmlllk.kllk....',
    '..kllllllllllllllllkkkllllk...',
    '..kmmmmmmmmmmmmmmmmkklvvvvk...',
    '..kddddddddddddddddkklvvggk...',
    '..kmdmdmdmdmdmdmdddk.kllllk...',
    '...kddddddddddddddk..kkllk....',
    '....kkkkkkkkkkkkkkk...kkkk....',
    '..............................',
    '..............................',
  ],
};
