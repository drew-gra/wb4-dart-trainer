import { BOARD_REGIONS } from './constants';

/**
 * ═══════════════════════════════════════════════════════════════
 * HEAT MAP DATA ARCHITECTURE (Option B - Aggregated per session)
 * ═══════════════════════════════════════════════════════════════
 * 
 * Current: We store aggregated targetData per session for efficiency.
 * Each session includes: { targetData: { 16: {attempts: 5, hits: 3}, ... } }
 * 
 * Valid data sources:
 * - Double-Out: App assigns target → knows attempts + outcomes
 * - Triples: App assigns target → knows rounds thrown at each target
 * - Cricket: User clicks specific buttons (T20, 20, D20) → knows exact hits
 * 
 * Invalid data sources (not included):
 * - Double-In: User chooses target → app cannot verify intent
 * 
 * FUTURE CONSIDERATION (Option A - Granular):
 * If we need individual attempt timestamps, streak analysis, or time-series
 * data in the future, consider migrating to:
 * { attempts: [{ target: 16, type: 'double', success: true, timestamp: ... }] }
 * 
 * Migration path: Keep Option B structure, add optional attempts[] array.
 * This allows backward compatibility while supporting granular tracking.
 * 
 * Estimated storage impact: ~150KB vs current ~20KB for 100 sessions
 * ═══════════════════════════════════════════════════════════════
 */

/**
 * Aggregate heat map data across all sessions
 * Combines Double-Out, Triples, and Cricket data
 * 
 * @param {Array} sessions - All stored sessions
 * @returns {object} Aggregated data by target number
 */
export const aggregateHeatMapData = (sessions) => {
  const aggregated = {};
  
  sessions.forEach(session => {
    // Only include sessions with location data
    if (session.mode !== 'double-out' && session.mode !== 'triples' && session.mode !== 'cricket') return;
    if (!session.targetData) return;
    
    Object.entries(session.targetData).forEach(([num, data]) => {
      if (!aggregated[num]) {
        aggregated[num] = { attempts: 0, hits: 0, triplesAttempts: 0, totalMarks: 0 };
      }
      
      if (session.mode === 'double-out') {
        aggregated[num].attempts += data.attempts || 0;
        aggregated[num].hits += data.hits || 0;
      } else if (session.mode === 'triples') {
        aggregated[num].triplesAttempts += data.attempts || 0;
        aggregated[num].totalMarks += data.totalMarks || 0;
      } else if (session.mode === 'cricket') {
        // Cricket provides direct counts of singles/doubles/triples hit
        if (data.doubles > 0) {
          aggregated[num].attempts += data.doubles;
          aggregated[num].hits += data.doubles;
        }
        if (data.triples > 0) {
          aggregated[num].triplesAttempts += data.triples;
          aggregated[num].totalMarks += data.triples * 3;
        }
      }
    });
  });
  
  return aggregated;
};

/**
 * Calculate effectiveness for a single number
 * @param {object} heatData - Aggregated heat map data
 * @param {number|string} num - Target number
 * @returns {object} Effectiveness metrics
 */
const getNumberEffectiveness = (heatData, num) => {
  const d = heatData[num];
  if (!d) return { doubleRate: 0, tripleRate: 0, totalWeight: 0 };
  
  const doubleRate = d.attempts > 0 ? (d.hits / d.attempts) * 100 : 0;
  const tripleMPR = d.triplesAttempts > 0 ? d.totalMarks / d.triplesAttempts : 0;
  const tripleRate = (tripleMPR / 9) * 100; // Normalize to percentage
  
  const totalWeight = d.attempts + d.triplesAttempts;
  
  return { doubleRate, tripleRate, totalWeight };
};

/**
 * Calculate regional analysis for insights
 * @param {Array} sessions - All stored sessions
 * @returns {object} Analysis by board region
 */
export const calculateRegionalAnalysis = (sessions) => {
  const heatData = aggregateHeatMapData(sessions);
  
  const getRegionalScore = (numbers) => {
    let totalWeightedScore = 0;
    let totalWeight = 0;

    numbers.forEach(num => {
      const { doubleRate, tripleRate, totalWeight: weight } = getNumberEffectiveness(heatData, num);
      const d = heatData[num];
      
      const doubleWeight = d?.attempts || 0;
      const tripleWeight = d?.triplesAttempts || 0;
      
      const numberScore = doubleWeight + tripleWeight > 0
        ? (doubleRate * doubleWeight + tripleRate * tripleWeight) / (doubleWeight + tripleWeight)
        : 0;
      
      totalWeightedScore += numberScore * weight;
      totalWeight += weight;
    });

    const regionalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
    return { score: regionalScore, weight: totalWeight };
  };

  const analysis = {};
  Object.entries(BOARD_REGIONS).forEach(([key, region]) => {
    analysis[key] = {
      ...region,
      ...getRegionalScore(region.numbers)
    };
  });

  return analysis;
};

/**
 * Calculate data sufficiency for insights
 * @param {Array} sessions - All stored sessions
 * @returns {object} Sufficiency metrics and confidence level
 */
export const calculateDataSufficiency = (sessions) => {
  const heatData = aggregateHeatMapData(sessions);
  const allNumbers = Object.keys(heatData);
  
  // Calculate total DARTS thrown
  const totalDarts = allNumbers.reduce((sum, num) => {
    const d = heatData[num];
    const doubleOutDarts = (d?.attempts || 0) * 3;
    const triplesDarts = (d?.triplesAttempts || 0) * 3;
    return sum + doubleOutDarts + triplesDarts;
  }, 0);

  // Check per-region minimums
  const regionData = {};
  Object.entries(BOARD_REGIONS).forEach(([key, region]) => {
    const darts = region.numbers.reduce((sum, num) => {
      const d = heatData[num];
      const doubleOutDarts = (d?.attempts || 0) * 3;
      const triplesDarts = (d?.triplesAttempts || 0) * 3;
      return sum + doubleOutDarts + triplesDarts;
    }, 0);
    regionData[key] = darts;
  });

  const minRegion = Math.min(...Object.values(regionData));
  const regionsWithData = Object.values(regionData).filter(a => a > 0).length;

  return {
    totalAttempts: totalDarts,
    regionData,
    minRegion,
    regionsWithData,
    hasMinimum: totalDarts >= 360 && regionsWithData === 4 && minRegion >= 90,
    confidence: totalDarts < 360 ? 'insufficient' : 
                totalDarts < 720 ? 'initial' : 
                totalDarts < 1440 ? 'solid' : 'high'
  };
};
