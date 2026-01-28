import React, { useState, useEffect } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { calculateTriplesStats, buildTriplesTargetData } from '../../utils/statistics';
import { generateTriplesTarget } from '../../utils/targeting';
import { trackEvent } from '../../utils/analytics';
import { Button } from '../ui/Button';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_triples';

export const Triples = () => {
  const [attempts, setAttempts] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [currentTarget, setCurrentTarget] = useState(null);
  
  const addSession = useSessionStore(state => state.addSession);
  const showStatus = useAppStore(state => state.showStatus);

  // Load in-progress session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setAttempts(data.attempts || []);
        setSessionStart(data.sessionStart ? new Date(data.sessionStart) : null);
        setCurrentTarget(data.currentTarget || generateTriplesTarget());
      } else {
        setCurrentTarget(generateTriplesTarget());
      }
    } catch (e) {
      console.error('Error loading in-progress session:', e);
      setCurrentTarget(generateTriplesTarget());
    }
  }, []);

  // Save in-progress session whenever attempts change
  useEffect(() => {
    if (attempts.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        attempts,
        sessionStart: sessionStart?.toISOString(),
        currentTarget
      }));
    }
  }, [attempts, sessionStart, currentTarget]);

  const stats = calculateTriplesStats(attempts);

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
    showStatus('📊 Session saved', 1500);
  };

  const isBull = currentTarget === 'Bull';

  return (
    <>
      {/* Target Display - no box */}
      <div className="text-center mb-8">
        <div className="text-6xl font-black mb-4" style={GOLD_GRADIENT}>
          {currentTarget || '...'}
        </div>
        <p className="text-gray-400 text-sm">This is your triples target. Hit as many as you can.</p>
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

      <Button 
        onClick={saveSession} 
        disabled={attempts.length === 0}
        className="w-full flex items-center justify-center mb-8"
      >
        <span className="text-lg mr-2">💾</span>
        <span className="text-xs font-bold">SAVE SESSION</span>
      </Button>

      <StatsCard title="📊 STATS">
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
            <span className="text-gray-400 text-xs">{a.timestamp}</span>
          </>
        )}
      />
    </>
  );
};
