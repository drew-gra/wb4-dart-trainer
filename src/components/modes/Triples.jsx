import React, { useState, useMemo } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { calculateTriplesStats, buildTriplesTargetData } from '../../utils/statistics';
import { generateTriplesTarget } from '../../utils/targeting';
import { trackEvent } from '../../utils/analytics';
import { useInProgressSession } from '../../hooks/useInProgressSession';
import { Button } from '../ui/Button';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { SessionSavedOverlay, ModeInfoOverlay } from '../ui/Overlay';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_triples';

export const Triples = () => {
  const [attempts, setAttempts] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [showSavedOverlay, setShowSavedOverlay] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  
  const addSession = useSessionStore(state => state.addSession);
  const showStatus = useAppStore(state => state.showStatus);

  useInProgressSession({
    storageKey: STORAGE_KEY,
    onLoad: (data) => {
      if (data) {
        setAttempts(data.attempts || []);
        setSessionStart(data.sessionStart ? new Date(data.sessionStart) : null);
        setCurrentTarget(data.currentTarget || generateTriplesTarget());
      } else {
        setCurrentTarget(generateTriplesTarget());
      }
    },
    getState: () => ({
      attempts,
      sessionStart: sessionStart?.toISOString(),
      currentTarget,
    }),
    isActive: attempts.length > 0,
    deps: [attempts, sessionStart, currentTarget],
  });

  const stats = useMemo(() => calculateTriplesStats(attempts), [attempts]);

  const recordRounds = (rounds) => {
    const now = new Date();
    if (attempts.length === 0) setSessionStart(now);

    const attempt = {
      number: currentTarget,
      rounds,
      timestamp: now.toLocaleTimeString()
    };

    setAttempts(prev => [attempt, ...prev]);
    trackEvent('Attempt Recorded', { mode: 'triples', target: currentTarget, rounds });
    setCurrentTarget(generateTriplesTarget());
    showStatus('💾 Saved', 1000);
  };

  const saveSession = () => {
    if (attempts.length === 0) return;

    const targetData = buildTriplesTargetData(attempts);
    const duration = Math.round((new Date() - sessionStart) / 60000);

    addSession({
      id: Date.now(),
      mode: 'triples',
      startTime: sessionStart.toISOString(),
      endTime: new Date().toISOString(),
      duration,
      totalAttempts: stats.total,
      totalRounds: stats.totalRounds,
      avgRounds: stats.avgRounds,
      targetData
    });

    trackEvent('Training Session Completed', {
      mode: 'triples',
      attempts: stats.total,
      avgRounds: stats.avgRounds,
      duration
    });

    // Clear in-progress data
    localStorage.removeItem(STORAGE_KEY);
    setAttempts([]);
    setSessionStart(null);
    setCurrentTarget(generateTriplesTarget());
    setShowSavedOverlay(true);
  };

  const isBull = currentTarget === 'Bull';

  return (
    <>
      <SessionSavedOverlay
        isOpen={showSavedOverlay}
        onContinue={() => setShowSavedOverlay(false)}
      />

      <ModeInfoOverlay
        isOpen={showInfo}
        onClose={() => setShowInfo(false)}
        title="TRIPS REPS MODE"
      >
        <p>Practice reps for cricket triples. Hit as many marks as you can. Targets are randomized.</p>
      </ModeInfoOverlay>

      {/* Target Display - no box */}
      <div className="mb-8 min-h-16 flex items-center justify-center">
        <div className="text-6xl font-black" style={GOLD_GRADIENT}>
          {currentTarget || '...'}
        </div>
      </div>

      {/* Round buttons - different layout for Bull vs numbers */}
      {isBull ? (
        <>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <Button onClick={() => recordRounds(0)} size="md">MISS</Button>
            <Button onClick={() => recordRounds(1)} size="md">C1</Button>
            <Button onClick={() => recordRounds(2)} size="md">C2</Button>
          </div>
          <div className="grid grid-cols-4 gap-2 mb-8">
            {[3, 4, 5, 6].map(n => (
              <Button key={n} onClick={() => recordRounds(n)} size="md">C{n}</Button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2 mb-2">
            <Button onClick={() => recordRounds(0)} size="md">MISS</Button>
            {[1, 2, 3, 4].map(n => (
              <Button key={n} onClick={() => recordRounds(n)} size="md">R{n}</Button>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-2 mb-8">
            {[5, 6, 7, 8, 9].map(n => (
              <Button key={n} onClick={() => recordRounds(n)} size="md">R{n}</Button>
            ))}
          </div>
        </>
      )}

      {/* Save Button */}
      <div className="mb-8">
        <button
          onClick={saveSession}
          disabled={attempts.length === 0}
          className={`w-full py-4 rounded-lg font-black text-lg transition-all border-2 shadow-lg ${
            attempts.length === 0
              ? 'bg-[#252a3a] text-gray-600 border-[#2a2f42] cursor-not-allowed'
              : 'text-black border-amber-400 transform hover:scale-105'
          }`}
          style={attempts.length > 0 ? { background: 'linear-gradient(135deg, #f59e0b, #fcd34d)' } : {}}
        >
          💾 SAVE SESSION
        </button>
      </div>

      <StatsCard title="📊 STATS" onInfoClick={() => setShowInfo(true)}>
        <StatItem value={stats.total} label="ATTEMPTS" color="yellow" />
        <StatItem value={stats.avgRounds} label="AVG MPR" useGradient />
      </StatsCard>

      <RecentList 
        title="📝 RECENT THROWS"
        items={attempts}
        renderItem={(a, i) => (
          <>
            <span className="text-yellow-400 font-semibold">{a.number}</span>
            <span className={`font-semibold ${a.rounds === 0 ? 'text-red-400' : 'text-blue-400'}`}>
              {a.rounds === 0 ? '❌ MISS' : `✅ ${a.number === 'Bull' ? 'C' : 'R'}${a.rounds}`}
            </span>
            <span className="text-slate-400 text-xs">{a.timestamp}</span>
          </>
        )}
      />
    </>
  );
};
