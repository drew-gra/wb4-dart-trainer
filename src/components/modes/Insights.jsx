import React, { useMemo } from 'react';
import { useSessionStore } from '../../store/gameStore';
import { calculateDataSufficiency, calculateRegionalAnalysis } from '../../utils/heatmap';
import { BOARD_REGIONS, GOLD_GRADIENT } from '../../utils/constants';

// Home icon SVG component
const HomeIcon = ({ size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

// Trend arrow component
const TrendArrow = ({ direction }) => {
  if (direction === 'hot') return <span className="text-base text-green-400">▲</span>;
  if (direction === 'cold') return <span className="text-base text-red-400">▼</span>;
  return <span className="text-base text-gray-500">—</span>;
};

// Calculate unified metrics from sessions
const calculateUnifiedMetrics = (sessions) => {
  const diSessions = sessions.filter(s => s.mode === 'double-in');
  const diTotal = diSessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const diSuccesses = diSessions.reduce((sum, s) => sum + s.successes, 0);
  const doubleInPct = diTotal > 0 ? Math.round((diSuccesses / diTotal) * 100) : '-';

  const doSessions = sessions.filter(s => s.mode === 'double-out');
  const doTotal = doSessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const doSuccesses = doSessions.reduce((sum, s) => sum + s.successes, 0);
  const s501Sessions = sessions.filter(s => s.mode === 'solo-501' && s.checkoutAttempts);
  const s501Total = s501Sessions.reduce((sum, s) => sum + s.checkoutAttempts, 0);
  const s501Successes = s501Sessions.reduce((sum, s) => sum + s.checkoutSuccesses, 0);
  const coTotal = doTotal + s501Total;
  const coSuccesses = doSuccesses + s501Successes;
  const checkoutPct = coTotal > 0 ? Math.round((coSuccesses / coTotal) * 100) : '-';

  // 3DA: Solo 501 only, weighted by darts thrown
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

// Calculate trending — last 5 sessions vs overall, requires 40+ qualifying sessions
const calculateTrending = (sessions) => {
  const WINDOW = 5;
  const MIN_SESSIONS = 40;

  // 3DA trending: Solo 501 only, weighted by darts thrown
  const all3DA = sessions
    .filter(s => s.mode === 'solo-501' && s.darts > 0)
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime));

  let trend3DA = null;
  if (all3DA.length >= MIN_SESSIONS) {
    const recent = all3DA.slice(0, WINDOW);
    const recentDarts = recent.reduce((sum, s) => sum + s.darts, 0);
    const recentAvg = (501 * recent.length / recentDarts) * 3;

    const overallDarts = all3DA.reduce((sum, s) => sum + s.darts, 0);
    const overallAvg = (501 * all3DA.length / overallDarts) * 3;

    const delta = recentAvg - overallAvg;
    trend3DA = {
      recent: recentAvg.toFixed(1),
      overall: overallAvg.toFixed(1),
      delta: delta.toFixed(1),
      direction: delta > 0.5 ? 'hot' : delta < -0.5 ? 'cold' : 'steady',
    };
  }

  // MPR trending (Triples + Cricket), weighted by session length
  const allMPR = sessions
    .filter(s => (s.mode === 'triples' && s.totalAttempts > 0) || (s.mode === 'cricket' && s.throws > 0))
    .sort((a, b) => new Date(b.endTime) - new Date(a.endTime))
    .map(s => ({
      marks:  s.mode === 'cricket' ? (s.totalMarks || 21) : s.totalRounds,
      rounds: s.mode === 'cricket' ? s.throws / 3 : s.totalAttempts,
    }));

  let trendMPR = null;
  if (allMPR.length >= MIN_SESSIONS) {
    const recent = allMPR.slice(0, WINDOW);
    const recentMarks  = recent.reduce((sum, s) => sum + s.marks, 0);
    const recentRounds = recent.reduce((sum, s) => sum + s.rounds, 0);
    const recentAvg = recentRounds > 0 ? recentMarks / recentRounds : 0;

    const overallMarks  = allMPR.reduce((sum, s) => sum + s.marks, 0);
    const overallRounds = allMPR.reduce((sum, s) => sum + s.rounds, 0);
    const overallAvg = overallRounds > 0 ? overallMarks / overallRounds : 0;

    const delta = recentAvg - overallAvg;
    trendMPR = {
      recent: recentAvg.toFixed(2),
      overall: overallAvg.toFixed(2),
      delta: delta.toFixed(2),
      direction: delta > 0.05 ? 'hot' : delta < -0.05 ? 'cold' : 'steady',
    };
  }

  return { trend3DA, trendMPR, count3DA: all3DA.length, countMPR: allMPR.length };
};

export const Insights = ({ onBack }) => {
  const repsSessions = useSessionStore(state => state.repsSessions);
  const soloSessions = useSessionStore(state => state.soloSessions);
  const allSessions = useMemo(() => [...repsSessions, ...soloSessions], [repsSessions, soloSessions]);

  const metrics = useMemo(() => calculateUnifiedMetrics(allSessions), [allSessions]);
  const trending = useMemo(() => calculateTrending(allSessions), [allSessions]);

  const dataSufficiency = calculateDataSufficiency(allSessions);
  const regionalAnalysis = calculateRegionalAnalysis(allSessions);

  const sortedRegions = Object.entries(regionalAnalysis).sort((a, b) => a[1].score - b[1].score);
  const weakest = sortedRegions[0];
  const strongest = sortedRegions[sortedRegions.length - 1];

  const meanScore = sortedRegions.reduce((sum, r) => sum + r[1].score, 0) / sortedRegions.length;

  const getRegionDescription = (name) => {
    switch (name) {
      case 'Top': return 'the top of the board';
      case 'Right': return 'the right side of the board';
      case 'Bottom': return 'the bottom of the board';
      case 'Left': return 'the left side of the board';
      default: return name;
    }
  };

  const TrendCard = ({ label, data }) => {
    if (!data) return null;
    const deltaColor = data.direction === 'hot'
      ? 'text-orange-400'
      : data.direction === 'cold'
      ? 'text-blue-400'
      : 'text-slate-400';
    const sign = parseFloat(data.delta) > 0 ? '+' : '';

    return (
      <div className="p-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-sm font-bold text-gray-300">{label}</span>
          <TrendArrow direction={data.direction} />
        </div>
        <div className="flex items-baseline justify-center gap-2 mb-1">
          <span className="text-2xl font-black text-white">{data.recent}</span>
          <span className={`text-sm font-bold ${deltaColor}`}>
            {sign}{data.delta}
          </span>
        </div>
        <div className="text-xs text-gray-500">
          vs {data.overall} overall (last 5)
        </div>
      </div>
    );
  };


  return (
    <>
      {/* Insights Header with Home */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-pink-400">INSIGHTS</h2>
        <button
          onClick={onBack}
          className="p-2 rounded-lg transition-all text-gray-500 hover:text-gray-300"
        >
          <HomeIcon size={22} />
        </button>
      </div>

      {/* YOUR METRICS */}
      <div className="bg-[#1c1f2e] rounded-lg p-4 mb-6 border border-[#2a2f42]">
        <h3 className="text-lg font-bold mb-4 text-pink-400">YOUR METRICS</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-300 font-medium mb-1">DI %</div>
            <div className="text-2xl font-black" style={GOLD_GRADIENT}>
              {metrics.doubleInPct}{metrics.doubleInPct !== '-' && '%'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-300 font-medium mb-1">CO %</div>
            <div className="text-2xl font-black" style={GOLD_GRADIENT}>
              {metrics.checkoutPct}{metrics.checkoutPct !== '-' && '%'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-300 font-medium mb-1">3DA</div>
            <div className="text-2xl font-black" style={GOLD_GRADIENT}>
              {metrics.unified3DA}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-300 font-medium mb-1">MPR</div>
            <div className="text-2xl font-black" style={GOLD_GRADIENT}>
              {metrics.unifiedMPR}
            </div>
          </div>
        </div>
      </div>

      {/* METRICS TRENDING — gold border, dominant element */}
      <div className="bg-[#1c1f2e] rounded-lg p-4 mb-6 border-2 border-amber-500">
        <h3 className="text-lg font-bold mb-4 text-pink-400">METRICS TRENDING</h3>
        <div className="grid grid-cols-2 gap-3">
          {trending.trend3DA ? (
            <TrendCard label="3DA" data={trending.trend3DA} />
          ) : (
            <div className="p-4 text-center">
              <span className="text-sm font-bold text-gray-300">3DA</span>
              <p className="text-gray-500 text-xs mt-3">Insufficient Data</p>
              <p className="text-gray-600 text-xs mt-1">{trending.count3DA} of 40</p>
            </div>
          )}
          {trending.trendMPR ? (
            <TrendCard label="MPR" data={trending.trendMPR} />
          ) : (
            <div className="p-4 text-center">
              <span className="text-sm font-bold text-gray-300">MPR</span>
              <p className="text-gray-500 text-xs mt-3">Insufficient Data</p>
              <p className="text-gray-600 text-xs mt-1">{trending.countMPR} of 40</p>
            </div>
          )}
        </div>
      </div>

      {/* PRACTICE FOCUS */}
      {!dataSufficiency.hasMinimum ? (
        <div className="bg-[#1c1f2e] rounded-lg p-5 border border-[#2a2f42]">
          <h3 className="text-lg font-bold mb-4 text-pink-400">PRACTICE FOCUS</h3>
          <div className="py-6 text-center">
            <p className="text-gray-500 text-sm mb-2">Insufficient Data</p>
            {Object.entries(dataSufficiency.regionData)
              .filter(([, darts]) => darts < 90)
              .map(([key]) => (
                <p key={key} className="text-gray-600 text-xs">
                  {BOARD_REGIONS[key].name}: {dataSufficiency.regionData[key]} of 90
                </p>
              ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#1c1f2e] rounded-lg p-5 border border-[#2a2f42]">
          <h3 className="text-lg font-bold mb-3 text-pink-400">PRACTICE FOCUS</h3>
          <p className="text-sm text-gray-300 mb-4">
            The data says you need to work on {getRegionDescription(weakest[1].name)}.
            Your efficiency there is {((meanScore - weakest[1].score) / meanScore * 100).toFixed(0)}%
            lower than everyplace else on the board.
          </p>
          <p className="text-sm text-slate-400">
            Your strongest area is {getRegionDescription(strongest[1].name)},
            where your efficiency is {((strongest[1].score - meanScore) / meanScore * 100).toFixed(0)}%
            greater than the other areas.
          </p>
        </div>
      )}
    </>
  );
};