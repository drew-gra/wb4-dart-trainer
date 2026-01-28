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

  const handleScoreFromInput = (score) => {
    // Score entered via ScoreInput - store it pending GOT IN button
    setPendingScore(score);
    setShowScoreInput(false);
  };

  const handleHotRowScore = (score) => {
    // Hot row tap - store pending
    setPendingScore(score);
  };

  const handleUndo = () => {
    if (attempts.length === 0) return;
    setAttempts(prev => prev.slice(1));
    showStatus('↩️ Undone', 800);
  };

  const recordAttempt = (outcome) => {
    const now = new Date();
    const start = attempts.length === 0 ? now : sessionStart;
    if (attempts.length === 0) setSessionStart(now);

    let score = null;
    if (outcome === 'success' && pendingScore) {
      const val = pendingScore;
      if (val >= 2 && val <= 170) {
        score = val;
        setPendingScore(null);
        trackEvent('Score Entered', { score: val, mode: 'double-in' });
      } else {
        showStatus('⚠️ Score must be 2-170', 2000);
        return;
      }
    }

    const attempt = { outcome, score, timestamp: now.toLocaleTimeString() };
    setAttempts(prev => [attempt, ...prev]);
    trackEvent('Attempt Recorded', { mode: 'double-in', outcome });
    showStatus('💾 Saved', 1000);
    
    // Clear pending score on miss too
    if (outcome === 'fail') {
      setPendingScore(null);
    }
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
      {/* Score Input Section */}
      <div className="text-center mb-8">
        <div className="text-4xl font-black mb-4" style={GOLD_GRADIENT}>
          GET IN
        </div>
        <p className="text-gray-400 text-sm mb-4">
          You have three darts to get in. Hit any double and enter your score.
        </p>
        
        {/* Pending Score Display */}
        {pendingScore && (
          <div className="text-2xl font-bold text-yellow-400 mb-4">
            Score ready: {pendingScore}
          </div>
        )}
      </div>

      {/* Score Input + Hot Row */}
      <div className="mb-6">
        <ScoreInput
          isOpen={showScoreInput}
          onToggle={() => setShowScoreInput(!showScoreInput)}
          onScore={handleScoreFromInput}
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

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <ActionButton 
          icon="✅" 
          label="GOT IN!" 
          onClick={() => recordAttempt('success')} 
        />
        <ActionButton 
          icon="❌" 
          label="MISSED" 
          onClick={() => recordAttempt('fail')} 
        />
        <ActionButton 
          icon="💾" 
          label="SAVE" 
          onClick={saveSession}
          disabled={attempts.length === 0}
        />
      </div>

      <StatsCard title="📊 STATS">
        <StatItem value={stats.total} label="ATTEMPTS" color="yellow" />
        <StatItem value={`${stats.successRate}%`} label="SUCCESS RATE" useGradient />
      </StatsCard>

      <RecentList 
        title="🔁 RECENT INS"
        items={attempts}
        renderItem={(a, i) => (
          <>
            <span className="text-yellow-400 font-semibold">
              {a.outcome === 'success' && a.score ? `Score: ${a.score}` : 'DOUBLE IN'}
            </span>
            <span className={`font-semibold ${a.outcome === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {a.outcome === 'success' ? '✅ GOT IN' : '❌ MISSED'}
            </span>
            <span className="text-gray-400 text-xs">{a.timestamp}</span>
          </>
        )}
      />
    </>
  );
};
