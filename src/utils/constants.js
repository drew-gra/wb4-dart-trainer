// Priority doubles for Double-Out mode weighting (1.5x weight)
export const PRIORITY_DOUBLES = [16, 8, 20, 10, 12, 'DB'];

// Cricket numbers for Triples mode
export const CRICKET_NUMBERS = [15, 16, 17, 18, 19, 20, 'Bull'];

// Weights for random target selection in Triples mode
export const CRICKET_WEIGHTS = { 
  15: 1, 
  16: 1, 
  17: 1, 
  18: 1, 
  19: 1, 
  20: 1, 
  'Bull': 0.4 
};

// Board regions for insights analysis
export const BOARD_REGIONS = {
  top: { name: 'Top', numbers: [5, 20, 1, 18, 4, 13] },
  right: { name: 'Right', numbers: [13, 6, 10, 15, 2, 17] },
  bottom: { name: 'Bottom', numbers: [17, 3, 19, 7, 16, 8] },
  left: { name: 'Left', numbers: [8, 11, 14, 9, 12, 5] }
};

// Main menu categories
export const MENU_CATEGORIES = [
  { id: 'reps', label: 'REPS', description: 'Repetition drills with assigned targets', defaultMode: 'double-in' },
  { id: 'solo', label: 'SOLO', description: 'Full game simulations', defaultMode: 'cricket' },
  { id: 'multiplayer', label: 'MULTIPLAYER', description: 'Coming soon', disabled: true, comingSoon: true },
];

// Reps modes (repetition-based drills)
export const REPS_MODES = [
  { id: 'double-in', label: 'DI' },
  { id: 'double-out', label: 'DO' },
  { id: 'triples', label: 'TRIPS' },
  { id: 'first-9', label: 'F9' },
];

// Solo modes (full game simulations)
export const SOLO_MODES = [
  { id: 'cricket', label: 'CRICKET' },
  { id: 'solo-501', label: '501' },
];

// Legacy export for backwards compatibility
export const TRAINING_MODES = [
  { id: 'double-in', label: 'DOUBLE-IN', description: 'Practice getting into the game with any double' },
  { id: 'double-out', label: 'DOUBLE-OUT', description: 'Master your checkout doubles with targeted practice' },
  { id: 'triples', label: 'TRIPLES', description: 'Hit triples consistently to dominate Cricket' },
  { id: 'cricket', label: 'CRICKET', description: 'Close everything - full Cricket game simulation' }
];

// Shared styles
export const GOLD_GRADIENT = {
  background: 'linear-gradient(45deg, #ffd700, #ffed4a)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};
