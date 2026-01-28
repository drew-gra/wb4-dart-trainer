import React, { useState, useEffect } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { calculateStats, buildDoubleOutTargetData } from '../../utils/statistics';
import { generateDoubleOutTarget } from '../../utils/targeting';
import { trackEvent } from '../../utils/analytics';
import { ActionButton } from '../ui/Button';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_double_out';

export const DoubleOut = () => {
  const [attempts, setAttempts] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  
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
        setConsecutiveFails(data.consecutiveFails || 0);
        setCurrentTarget(data.currentTarget || generateDoubleOutTarget(data.consecutiveFails || 0));
      } else {
        setCurrentTarget(generateDoubleOutTarget(0));
      }
    } catch (e) {
      console.error('Error loading in-progress session:', e);
      setCurrentTarget(generateDoubleOutTarget(0));
    }
  }, []);

  // Save in-progress session whenever attempts change
  useEffect(() => {
    if (attempts.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        attempts,
        sessionStart: sessionStart?.toISOString(),
        consecutiveFails,
        currentTarget
      }));
    }
  }, [attempts, sessionStart, consecutiveFails, currentTarget]);

  const stats = calculateStats(attempts);

  const recordAttempt = (outcome) => {
    const now = new Date();
    if (attempts.length === 0) setSessionStart(now);

    const attempt = {
      number: currentTarget,
      outcome,
      timestamp: now.toLocaleTimeString()
    };

    setAttempts(prev => [attempt, ...prev]);
    trackEvent('Attempt Recorded', { mode: 'double-out', outcome, target: currentTarget });
    
    const newFails = outcome === 'success' ? 0 : consecutiveFails + 1;
    setConsecutiveFails(newFails);
    setCurrentTarget(generateDoubleOutTarget(newFails));
    showStatus('💾 Saved', 1000);
  };

  const skipTarget = () => {
    setCurrentTarget(generateDoubleOutTarget(consecutiveFails));
  };

  const saveSession = () => {
    if (attempts.length === 0) return;
    
    const targetData = buildDoubleOutTargetData(attempts);
    const duration = Math.round((new Date() - sessionStart) / 60000);
    
    addSession({
      id: Date.now(),
      mode: 'double-out',
      startTime: sessionStart.toISOString(),
      endTime: new Date().toISOString(),
      duration,
      totalAttempts: stats.total,
      successRate: stats.successRate,
      successes: stats.successes,
      failures: stats.failures,
      targetData
    });

    trackEvent('Training Session Completed', {
      mode: 'double-out',
      attempts: stats.total,
      successRate: stats.successRate,
      duration
    });

    // Clear in-progress data
    localStorage.removeItem(STORAGE_KEY);
    setAttempts([]);
    setSessionStart(null);
    setConsecutiveFails(0);
    setCurrentTarget(generateDoubleOutTarget(0));
    showStatus('📊 Session saved', 1500);
  };

  // Format display: DB shows as "DB", numbers show as "D16" etc
  const displayTarget = currentTarget === 'DB' ? 'DB' : `D${currentTarget}`;

  return (
    <>
      {/* Target Display - no box */}
      <div className="text-center mb-8">
        <div className="text-6xl font-black mb-4" style={GOLD_GRADIENT}>
          {currentTarget ? displayTarget : '...'}
        </div>
        <p className="text-gray-400 text-sm">This is your out. You have three darts.</p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-8">
        <ActionButton 
          icon="✅" 
          label="HIT IT!" 
          onClick={() => recordAttempt('success')}
          disabled={!currentTarget}
        />
        <ActionButton 
          icon="❌" 
          label="MISSED" 
          onClick={() => recordAttempt('fail')}
          disabled={!currentTarget}
        />
        <ActionButton 
          icon="➡️" 
          label="SKIP" 
          onClick={skipTarget}
          disabled={!currentTarget}
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
        title="📝 RECENT ATTEMPTS"
        items={attempts}
        renderItem={(a, i) => (
          <>
            <span className="text-yellow-400 font-semibold">
              {a.number === 'DB' ? 'DB' : `D${a.number}`}
            </span>
            <span className={`font-semibold ${a.outcome === 'success' ? 'text-green-400' : 'text-red-400'}`}>
              {a.outcome === 'success' ? '✅' : '❌'}
            </span>
            <span className="text-gray-400 text-xs">{a.timestamp}</span>
          </>
        )}
      />
    </>
  );
};
