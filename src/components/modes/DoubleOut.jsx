import React, { useState } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { calculateStats, buildDoubleOutTargetData } from '../../utils/statistics';
import { generateDoubleOutTarget } from '../../utils/targeting';
import { trackEvent } from '../../utils/analytics';
import { useInProgressSession } from '../../hooks/useInProgressSession';
import { ActionButton } from '../ui/Button';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { SessionSavedOverlay } from '../ui/Overlay';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_double_out';

export const DoubleOut = () => {
  const [attempts, setAttempts] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [currentTarget, setCurrentTarget] = useState(null);
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [showSavedOverlay, setShowSavedOverlay] = useState(false);
  
  const addSession = useSessionStore(state => state.addSession);
  const showStatus = useAppStore(state => state.showStatus);

  useInProgressSession({
    storageKey: STORAGE_KEY,
    onLoad: (data) => {
      if (data) {
        setAttempts(data.attempts || []);
        setSessionStart(data.sessionStart ? new Date(data.sessionStart) : null);
        setConsecutiveFails(data.consecutiveFails || 0);
        setCurrentTarget(data.currentTarget || generateDoubleOutTarget(data.consecutiveFails || 0));
      } else {
        setCurrentTarget(generateDoubleOutTarget(0));
      }
    },
    getState: () => ({
      attempts,
      sessionStart: sessionStart?.toISOString(),
      consecutiveFails,
      currentTarget,
    }),
    isActive: attempts.length > 0,
    deps: [attempts, sessionStart, consecutiveFails, currentTarget],
  });

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
    setShowSavedOverlay(true);
  };

  // Format display: DB shows as "DB", numbers show as "D16" etc
  const displayTarget = currentTarget === 'DB' ? 'DB' : `D${currentTarget}`;

  return (
    <>
      <SessionSavedOverlay
        isOpen={showSavedOverlay}
        onContinue={() => setShowSavedOverlay(false)}
      />

      {/* Target Display - no box */}
      <div className="mb-8 min-h-16 flex items-center justify-center">
        <div className="text-6xl font-black" style={GOLD_GRADIENT}>
          {currentTarget ? `Hit ${displayTarget}` : '...'}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
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
      </div>

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
            <span className="text-slate-400 text-xs">{a.timestamp}</span>
          </>
        )}
      />
    </>
  );
};