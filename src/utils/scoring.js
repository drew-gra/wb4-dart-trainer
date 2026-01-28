/**
 * Scoring validation utilities
 * Used across F9, Solo 501, and Double-In modes
 */

// Impossible 3-dart scores (can't be achieved with any combination of 3 darts)
const IMPOSSIBLE_SCORES = [179, 178, 176, 175, 173, 172, 169, 166, 163];

/**
 * Check if a 3-dart score is valid/possible
 * @param {number} score - The score to validate
 * @returns {boolean} - True if the score is possible
 */
export const isValidThreeDartScore = (score) => {
  if (score < 0 || score > 180) return false;
  if (IMPOSSIBLE_SCORES.includes(score)) return false;
  return true;
};

/**
 * Get the maximum possible 3-dart score
 * @returns {number} - 180 (three triple-20s)
 */
export const getMaxThreeDartScore = () => 180;

/**
 * Get list of impossible scores for reference
 * @returns {number[]} - Array of impossible scores
 */
export const getImpossibleScores = () => [...IMPOSSIBLE_SCORES];
