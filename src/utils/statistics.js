/**
 * Calculate success/failure stats for Double-In and Double-Out modes
 * @param {Array} attempts - Array of attempt objects with outcome property
 * @returns {object} Stats object with total, successes, failures, successRate
 */
export const calculateStats = (attempts) => {
  const total = attempts.length;
  const successes = attempts.filter(a => a.outcome === 'success').length;
  const rate = total > 0 ? Math.round((successes / total) * 100) : 0;
  return { 
    total, 
    successes, 
    failures: total - successes, 
    successRate: rate 
  };
};

/**
 * Calculate stats for Triples mode
 * @param {Array} attempts - Array of attempt objects with rounds property
 * @returns {object} Stats with total attempts, total rounds, average rounds
 */
export const calculateTriplesStats = (attempts) => {
  const total = attempts.length;
  const totalRounds = attempts.reduce((sum, a) => sum + (a.rounds || 0), 0);
  const avg = total > 0 ? (totalRounds / total).toFixed(2) : 0;
  return { 
    total, 
    totalRounds, 
    avgRounds: avg 
  };
};

/**
 * Calculate stats for Cricket mode
 * @param {Array} games - Array of completed game objects
 * @returns {object} Stats with total games, average MPR, average throws
 */
export const calculateCricketStats = (games) => {
  const total = games.length;
  
  // Calculate average MPR from games that have it, or compute from throws
  const mprs = games.map(g => {
    if (g.mpr) return g.mpr;
    // Fallback for old games: 21 marks / (throws / 3) = 63 / throws
    return g.throws > 0 ? (63 / g.throws) : 0;
  });
  
  const avgMPR = total > 0 ? (mprs.reduce((sum, m) => sum + m, 0) / total).toFixed(2) : '0.00';
  const totalThrows = games.reduce((sum, g) => sum + (g.throws || 0), 0);
  const avgThrows = total > 0 ? (totalThrows / total).toFixed(1) : 0;
  const bestGame = total > 0 ? Math.min(...games.map(g => g.throws)) : 0;
  
  return { 
    total, 
    totalThrows, 
    avgThrows, 
    avgMPR,
    bestGame 
  };
};

/**
 * Build targetData aggregation from Double-Out attempts
 * Used for heat map analysis
 * @param {Array} attempts - Array of attempts with number and outcome
 * @returns {object} Aggregated data by target number
 */
export const buildDoubleOutTargetData = (attempts) => {
  const targetData = {};
  attempts.forEach(attempt => {
    const num = attempt.number;
    if (!targetData[num]) {
      targetData[num] = { attempts: 0, hits: 0 };
    }
    targetData[num].attempts++;
    if (attempt.outcome === 'success') {
      targetData[num].hits++;
    }
  });
  return targetData;
};

/**
 * Build targetData aggregation from Triples attempts
 * Used for heat map analysis
 * @param {Array} attempts - Array of attempts with number and rounds
 * @returns {object} Aggregated data by target number
 */
export const buildTriplesTargetData = (attempts) => {
  const targetData = {};
  attempts.forEach(attempt => {
    const num = attempt.number;
    if (!targetData[num]) {
      targetData[num] = { attempts: 0, totalMarks: 0 };
    }
    targetData[num].attempts++;
    targetData[num].totalMarks += attempt.rounds || 0;
  });
  return targetData;
};
