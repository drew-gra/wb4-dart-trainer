import React, { useState, useEffect, useMemo } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { calculateStats } from '../../utils/statistics';
import { trackEvent } from '../../utils/analytics';
import { getHotRowScores } from '../../utils/hotrow';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { ScoreInput } from '../ui/ScoreInput';
import { HotRow } from '../ui/HotRow';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_double_in';

export const DoubleIn = () => {
  const [attempts, setAttempts] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [showScoreInput, setShowScoreInput] = useState(false);
  
  const addSession = useSessionStore(state => state.addSession);
  const repsSessions = useSessionStore(state => state.repsSessions);
  const soloSessions = useSessionStore(state => state.soloSessions);
  const showStatus = useAppStore(state => state.showStatus);

  // Merge buckets for hot row calculation
  const allSessions = useMemo(() => [...repsSessions, ...soloSessions], [repsSessions, soloSessions]);

  // Compute dynamic hot row scores from session history
  const hotRowScores = useMemo(() => getHotRowScores(allSessions), [allSessions]);

  // Load in-progress session on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setAttempts(data.attempts || []);
        setSessionStart(data.sessionStart ? new Date(data.sessionStart) : null);
      }
    } catch (e) {
      console.error('Error loading in-progress session:', e);
    }
  }, []);

  // Save in-progress session whenever attempts change
  useEffect(() => {
    if (attempts.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        attempts,
        sessionStart: sessionStart?.toISOString()
      }));
    }
  }, [attempts, sessionStart]);

  const stats = calculateStats(attempts);

  const handleGotIn = (score) => {
    // Score submitted via ScoreInput = Got In with that score
    if (score < 2 || score > 170) {
      showStatus('⚠️ Score must be 2-170', 2000);
      return;
    }

    const now = new Date();
    if (attempts.length === 0) setSessionStart(now);

    const attempt = { outcome: 'success', score, timestamp: now.toLocaleTimeString() };
    setAttempts(prev => [attempt, ...prev]);
    trackEvent('Attempt Recorded', { mode: 'double-in', outcome: 'success', score });
    showStatus('💾 Saved', 800);
  };

  const handleMissed = () => {
    // Missed button pressed in ScoreInput
    const now = new Date();
    if (attempts.length === 0) setSessionStart(now);

    const attempt = { outcome: 'fail', score: null, timestamp: now.toLocaleTimeString() };
    setAttempts(prev => [attempt, ...prev]);
    trackEvent('Attempt Recorded', { mode: 'double-in', outcome: 'fail' });
    showStatus('💾 Saved', 800);
  };

  const handleHotRowScore = (score) => {
    // Hot row tap = Got In with that score
    handleGotIn(score);
  };

  const handleUndo = () => {
    if (attempts.length === 0) return;
    setAttempts(prev => prev.slice(1));
    showStatus('↩️ Undone', 800);
  };

  const saveSession = () => {
    if (attempts.length === 0) return;

    const duration = Math.round((new Date() - sessionStart) / 60000);
    const scores = attempts.filter(a => a.outcome === 'success' && a.score).map(a => a.score);
    const totalScore = scores.reduce((sum, s) => sum + s, 0);
    const expectedValue = attempts.length > 0 ? (totalScore / attempts.length).toFixed(1) : 0;

    addSession({
      id: Date.now(),
      mode: 'double-in',
      startTime: sessionStart.toISOString(),
      endTime: new Date().toISOString(),
      duration,
      totalAttempts: stats.total,
      successRate: stats.successRate,
      successes: stats.successes,
      failures: stats.failures,
      expectedValue: parseFloat(expectedValue)
    });

    trackEvent('Training Session Completed', {
      mode: 'double-in',
      attempts: stats.total,
      successRate: stats.successRate,
      duration
    });

    // Clear in-progress data
    localStorage.removeItem(STORAGE_KEY);
    setAttempts([]);
    setSessionStart(null);
    showStatus('📊 Session saved', 1500);
  };

  return (
    <>
      {/* Header - shows last outcome */}
      <div className="text-center mb-8">
        {attempts.length === 0 ? (
          <div className="text-4xl font-black" style={GOLD_GRADIENT}>
            GET IN
          </div>
        ) : attempts[0].outcome === 'success' ? (
          <div className="text-4xl font-black" style={GOLD_GRADIENT}>
            GOT IN
          </div>
        ) : (
          <div className="text-4xl font-black" style={GOLD_GRADIENT}>
            MISSED
          </div>
        )}
      </div>

      {/* Score Input + Hot Row */}
      <div className="mb-6">
        <ScoreInput
          isOpen={showScoreInput}
          onToggle={() => setShowScoreInput(!showScoreInput)}
          onScore={handleGotIn}
          onBust={handleMissed}
          onBack={handleUndo}
          canUndo={attempts.length > 0}
          mode="double-in"
        />

        {/* Spacer */}
        <div className="h-4"></div>

        {/* Hot Row (always visible) */}
        <HotRow 
          scores={hotRowScores} 
          onSelect={handleHotRowScore}
        />
      </div>

      {/* Save Button */}
      <div className="mb-8">
        <button
          onClick={saveSession}
          disabled={attempts.length === 0}
          className={`w-full py-4 rounded-lg font-black text-lg transition-all border-2 shadow-lg ${
            attempts.length === 0
              ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
              : 'text-black border-yellow-400 transform hover:scale-105'
          }`}
          style={attempts.length > 0 ? { background: 'linear-gradient(45deg, #ffd700, #ffed4a)' } : {}}
        >
          💾 SAVE SESSION
        </button>
      </div>

      <StatsCard title="📊 STATS">
        <StatItem value={stats.total} label="ATTEMPTS" color="yellow" />
        <StatItem value={`${stats.successRate}%`} label="SUCCESS RATE" useGradient />
      </StatsCard>

      <RecentList 
        title="🔍 RECENT"
        items={attempts}
        renderItem={(a, i) => (
          <>
            <span className={`font-semibold ${a.outcome === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {a.outcome === 'success' ? '✅ GOT IN' : '❌ MISSED'}
            </span>
            {a.outcome === 'success' && a.score && (
              <span className="text-yellow-400 font-semibold">{a.score}</span>
            )}
            <span className="text-gray-500 text-xs">{a.timestamp}</span>
          </>
        )}
      />
    </>
  );
};
