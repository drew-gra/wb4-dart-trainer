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
  
  const totalThrows = games.reduce((sum, g) => sum + (g.throws || 0), 0);
  const totalMarks = games.reduce((sum, g) => sum + (g.totalMarks || 0), 0);
  const avgMPR = totalThrows > 0 ? ((totalMarks / totalThrows) * 3).toFixed(2) : '0.00';
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

/**
 * Compute the four cross-mode headline metrics: Double-In %, unified
 * Checkout % (DO reps + Solo 501 checkouts), weighted 3DA (Solo 501
 * only), and unified MPR (Triples + Cricket).
 *
 * Consumed by both the History and Insights views — single source of
 * truth so changes to any metric formula only land in one place.
 *
 * @param {Array} sessions - All completed sessions across modes
 * @returns {{doubleInPct, checkoutPct, unified3DA, unifiedMPR}}
 */
export const calculateUnifiedMetrics = (sessions) => {
  const diSessions = sessions.filter(s => s.mode === 'double-in');
  const diTotal = diSessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const diSuccesses = diSessions.reduce((sum, s) => sum + s.successes, 0);
  const doubleInPct = diTotal > 0 ? Math.round((diSuccesses / diTotal) * 100) : '-';

  const doSessions = sessions.filter(s => s.mode === 'double-out');
  const doTotal = doSessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const doSuccesses = doSessions.reduce((sum, s) => sum + s.successes, 0);

  const s501CoSessions = sessions.filter(s => s.mode === 'solo-501' && s.checkoutAttempts);
  const s501CoTotal = s501CoSessions.reduce((sum, s) => sum + s.checkoutAttempts, 0);
  const s501CoSuccesses = s501CoSessions.reduce((sum, s) => sum + s.checkoutSuccesses, 0);

  const coTotal = doTotal + s501CoTotal;
  const coSuccesses = doSuccesses + s501CoSuccesses;
  const checkoutPct = coTotal > 0 ? Math.round((coSuccesses / coTotal) * 100) : '-';

  const solo501Sessions = sessions.filter(s => s.mode === 'solo-501' && s.darts > 0);
  const s501TotalDarts = solo501Sessions.reduce((sum, s) => sum + s.darts, 0);
  const unified3DA = s501TotalDarts > 0
    ? ((501 * solo501Sessions.length / s501TotalDarts) * 3).toFixed(1)
    : '-';

  const tripsSessions = sessions.filter(s => s.mode === 'triples');
  const tripsMarks = tripsSessions.reduce((sum, s) => sum + (parseFloat(s.avgRounds) * s.totalAttempts), 0);
  const tripsRounds = tripsSessions.reduce((sum, s) => sum + s.totalAttempts, 0);

  const cricketSessions = sessions.filter(s => s.mode === 'cricket');
  const cricketMarks = cricketSessions.reduce((sum, s) => sum + (s.totalMarks || 21), 0);
  const cricketRounds = cricketSessions.reduce((sum, s) => sum + (s.throws / 3), 0);

  const totalMarks = tripsMarks + cricketMarks;
  const totalRounds = tripsRounds + cricketRounds;
  const unifiedMPR = totalRounds > 0 ? (totalMarks / totalRounds).toFixed(2) : '-';

  return { doubleInPct, checkoutPct, unified3DA, unifiedMPR };
};
