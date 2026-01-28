/**
 * Hot Row - Dynamic score shortcuts based on user history
 * 
 * First Principles:
 * 1. Scores always display smallest to largest (left to right)
 * 2. Nothing below 26, nothing 27-39 (except checkouts)
 * 3. Slot index 1 becomes the checkout when in range
 * 4. 50+ turns required before dynamic adjustment
 * 5. Each score needs 5+ appearances AND 3%+ frequency
 */

export const DEFAULT_HOT_SCORES = [26, 45, 60, 100, 140];

const MIN_TURNS_FOR_DYNAMIC = 50;
const MIN_APPEARANCES = 5;
const MIN_FREQUENCY_PCT = 0.03; // 3%

/**
 * Check if a score is valid for Hot Row (frequency-based slots)
 * Checkouts bypass this filter
 */
export const isValidHotRowScore = (score) => {
  return score === 26 || score >= 40;
};

/**
 * Calculate dynamic Hot Row scores from session history
 * 
 * @param {Array} sessions - Array of session objects with turnScores
 * @returns {number[]} - Array of 5 scores, sorted ascending
 */
export const getHotRowScores = (sessions) => {
  // Aggregate all turnScores from relevant modes
  const allScores = sessions
    .filter(s => ['solo-501', 'first-9'].includes(s.mode))
    .flatMap(s => s.turnScores || []);

  const totalTurns = allScores.length;

  // Not enough data - return defaults
  if (totalTurns < MIN_TURNS_FOR_DYNAMIC) {
    return [...DEFAULT_HOT_SCORES];
  }

  // Count frequency of each valid score
  const freq = {};
  allScores.forEach(score => {
    if (isValidHotRowScore(score)) {
      freq[score] = (freq[score] || 0) + 1;
    }
  });

  // Filter by thresholds: 5+ appearances AND 3%+ of total
  const minByPct = Math.ceil(totalTurns * MIN_FREQUENCY_PCT);
  const minRequired = Math.max(MIN_APPEARANCES, minByPct);

  const eligible = Object.entries(freq)
    .filter(([_, count]) => count >= minRequired)
    .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
    .slice(0, 5)
    .map(([score]) => parseInt(score));

  // If we don't have 5 eligible scores, fill from defaults
  if (eligible.length < 5) {
    const needed = 5 - eligible.length;
    const fillers = DEFAULT_HOT_SCORES.filter(d => !eligible.includes(d));
    eligible.push(...fillers.slice(0, needed));
  }

  // Sort ascending for display
  return eligible.sort((a, b) => a - b);
};

/**
 * Build the display array for Hot Row, optionally with checkout in slot 1
 * 
 * @param {number[]} scores - Base 5 scores from getHotRowScores
 * @param {number|null} checkout - Remaining score if valid checkout, null otherwise
 * @returns {number[]} - Array of 5 scores for display
 */
export const buildHotRowDisplay = (scores, checkout = null) => {
  const sorted = [...scores].sort((a, b) => a - b);

  if (checkout) {
    // Replace slot 1 (second position) with checkout
    return [
      sorted[0],
      checkout,
      sorted[2],
      sorted[3],
      sorted[4],
    ];
  }

  return sorted;
};
