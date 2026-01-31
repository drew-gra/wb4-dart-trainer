import React, { useState, useEffect, useMemo } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { calculateStats } from '../../utils/statistics';
import { trackEvent } from '../../utils/analytics';
import { getHotRowScores } from '../../utils/hotrow';
import { ActionButton } from '../ui/Button';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { ScoreInput } from '../ui/ScoreInput';
import { HotRow } from '../ui/HotRow';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_double_in';

export const DoubleIn = () => {
  const [attempts, setAttempts] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [pendingScore, setPendingScore] = useState(null);
  
  const addSession = useSessionStore(state => state.addSession);
  const sessions = useSessionStore(state => state.sessions);
  const showStatus = useAppStore(state => state.showStatus);

  // Compute dynamic hot row scores from session history
  const hotRowScores = useMemo(() => getHotRowScores(sessions), [sessions]);

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
    // Score submitted via ScoreInput "Got In" button
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
    setPendingScore(null);
  };

  const handleBust = () => {
    // Bust pressed in ScoreInput
    const now = new Date();
    if (attempts.length === 0) setSessionStart(now);

    const attempt = { outcome: 'fail', score: null, timestamp: now.toLocaleTimeString() };
    setAttempts(prev => [attempt, ...prev]);
    trackEvent('Attempt Recorded', { mode: 'double-in', outcome: 'fail' });
    showStatus('💾 Saved', 800);
    setPendingScore(null);
  };

  const handleHotRowScore = (score) => {
    // Hot row tap - store pending, user still needs to confirm
    setPendingScore(score);
  };

  const handleUndo = () => {
    if (attempts.length === 0) return;
    setAttempts(prev => prev.slice(1));
    showStatus('↩️ Undone', 800);
  };

  const confirmPendingScore = () => {
    if (!pendingScore) return;
    handleGotIn(pendingScore);
  };

  const cancelPendingScore = () => {
    setPendingScore(null);
    showStatus('❌ Cancelled', 800);
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
    setPendingScore(null);
    showStatus('📊 Session saved', 1500);
  };

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="text-4xl font-black mb-2" style={GOLD_GRADIENT}>
          GET IN
        </div>
        <p className="text-gray-400 text-sm">
          Three darts to hit any double.
        </p>
      </div>

      {/* Pending Score from Hot Row */}
      {pendingScore && (
        <div className="bg-gray-900 rounded-lg p-4 mb-4 border border-yellow-500 text-center">
          <div className="text-sm text-gray-400 mb-2">Score ready:</div>
          <div className="text-3xl font-black text-yellow-400 mb-3">{pendingScore}</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={confirmPendingScore}
              className="py-3 rounded-lg font-bold text-white"
              style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
            >
              ✅ GOT IN
            </button>
            <button
              onClick={cancelPendingScore}
              className="py-3 rounded-lg font-bold bg-gray-700 text-gray-300"
            >
              ❌ CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Score Input + Hot Row */}
      <div className="mb-6">
        <ScoreInput
          isOpen={showScoreInput}
          onToggle={() => setShowScoreInput(!showScoreInput)}
          onScore={handleGotIn}
          onBust={handleBust}
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
        <ActionButton 
          icon="💾" 
          label="SAVE SESSION" 
          onClick={saveSession}
          disabled={attempts.length === 0}
          className="w-full"
        />
      </div>

      <StatsCard title="📊 STATS">
        <StatItem value={stats.total} label="ATTEMPTS" color="yellow" />
        <StatItem value={`${stats.successRate}%`} label="SUCCESS RATE" useGradient />
      </StatsCard>

      <RecentList 
        title="🔁 RECENT"
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