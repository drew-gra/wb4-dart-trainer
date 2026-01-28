import { PRIORITY_DOUBLES, CRICKET_WEIGHTS } from './constants';

/**
 * Generate a weighted random double-out target
 * Priority doubles (16, 8, 20, 10, 12, DB) are weighted 1.5x
 * Consecutive failures increase priority double weighting
 * 
 * @param {number} consecutiveFails - Number of consecutive misses
 * @returns {number|string} Target number (1-20) or 'DB' for double bull
 */
export const generateDoubleOutTarget = (consecutiveFails = 0) => {
  const weights = {};
  
  // Base weights: all doubles start at 1
  for (let i = 1; i <= 20; i++) {
    weights[i] = PRIORITY_DOUBLES.includes(i) ? 1.5 : 1;
  }
  // Add DB (double bull) with priority weight
  weights['DB'] = 1.5;
  
  // After 4+ consecutive failures, boost priority doubles further
  if (consecutiveFails >= 4) {
    const bonus = Math.floor((consecutiveFails - 3) * 2);
    PRIORITY_DOUBLES.forEach(n => weights[n] += bonus);
  }
  
  // Weighted random selection
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  
  for (const [num, weight] of Object.entries(weights)) {
    rand -= weight;
    if (rand <= 0) return num === 'DB' ? 'DB' : parseInt(num);
  }
  
  return 20; // Fallback
};

/**
 * Generate a random triples target from cricket numbers
 * Bull is weighted lower (0.2) compared to numbers (1.0)
 * 
 * @returns {number|string} Target number (15-20) or 'Bull'
 */
export const generateTriplesTarget = () => {
  const total = Object.values(CRICKET_WEIGHTS).reduce((sum, w) => sum + w, 0);
  let rand = Math.random() * total;
  
  for (const [num, weight] of Object.entries(CRICKET_WEIGHTS)) {
    rand -= weight;
    if (rand <= 0) return num === 'Bull' ? 'Bull' : parseInt(num);
  }
  
  return 20; // Fallback
};