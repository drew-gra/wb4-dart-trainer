import React, { useState, useEffect, useMemo } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { trackEvent } from '../../utils/analytics';
import { isValidThreeDartScore } from '../../utils/scoring';
import { getHotRowScores } from '../../utils/hotrow';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { SessionSavedOverlay } from '../ui/Overlay';
import { ScoreInput } from '../ui/ScoreInput';
import { HotRow } from '../ui/HotRow';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_first9';

export const First9 = () => {
  // Current instance state (resets after 3 turns)
  const [currentInstanceScore, setCurrentInstanceScore] = useState(0);
  const [currentInstanceTurns, setCurrentInstanceTurns] = useState(0);
  
  // Session state (persists until Save)
  const [completedInstances, setCompletedInstances] = useState([]); // Array of 3DA values
  const [sessionTurnScores, setSessionTurnScores] = useState([]); // All turn scores this session
  const [sessionStart, setSessionStart] = useState(null);
  
  // UI state
  const [showScoreInput, setShowScoreInput] = useState(false);
  const [showSavedOverlay, setShowSavedOverlay] = useState(false);

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
        setCurrentInstanceScore(data.currentInstanceScore || 0);
        setCurrentInstanceTurns(data.currentInstanceTurns || 0);
        setCompletedInstances(data.completedInstances || []);
        setSessionTurnScores(data.sessionTurnScores || []);
        setSessionStart(data.sessionStart ? new Date(data.sessionStart) : null);
      }
    } catch (e) {
      console.error('Error loading in-progress session:', e);
    }
  }, []);

  // Save in-progress session whenever state changes
  useEffect(() => {
    if (currentInstanceTurns > 0 || completedInstances.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        currentInstanceScore,
        currentInstanceTurns,
        completedInstances,
        sessionTurnScores,
        sessionStart: sessionStart?.toISOString()
      }));
    }
  }, [currentInstanceScore, currentInstanceTurns, completedInstances, sessionTurnScores, sessionStart]);

  const handleScore = (turnScore) => {
    // Validate: must be a possible 3-dart score
    if (!isValidThreeDartScore(turnScore)) {
      showStatus('⚠️ Invalid score', 2000);
      return;
    }

    const now = new Date();
    if (!sessionStart) setSessionStart(now);

    // Track this turn score for Hot Row
    setSessionTurnScores(prev => [...prev, turnScore]);

    const newInstanceScore = currentInstanceScore + turnScore;
    const newInstanceTurns = currentInstanceTurns + 1;

    if (newInstanceTurns === 3) {
      // Instance complete - calculate 3DA and add to completed instances
      const instance3DA = newInstanceScore / 3;
      setCompletedInstances(prev => [...prev, instance3DA]);
      setCurrentInstanceScore(0);
      setCurrentInstanceTurns(0);
      showStatus('🎯 First 9 complete!', 1500);
      trackEvent('F9 Instance Completed', { avg3DA: instance3DA.toFixed(1) });
    } else {
      setCurrentInstanceScore(newInstanceScore);
      setCurrentInstanceTurns(newInstanceTurns);
      showStatus('💾 Saved', 1000);
    }

    trackEvent('Attempt Recorded', { mode: 'first-9', score: turnScore });
  };

  const handleUndo = () => {
    if (sessionTurnScores.length === 0) return;
    
    const lastScore = sessionTurnScores[sessionTurnScores.length - 1];
    
    if (currentInstanceTurns === 0) {
      // We just completed an instance, need to restore it
      if (completedInstances.length > 0) {
        const lastInstance3DA = completedInstances[completedInstances.length - 1];
        // Restore to turn 2 of 3
        setCurrentInstanceTurns(2);
        // Calculate what the score was before the last turn
        // lastInstance3DA * 3 = total, minus last turn score = previous score
        const totalInstanceScore = lastInstance3DA * 3;
        setCurrentInstanceScore(totalInstanceScore - lastScore);
        setCompletedInstances(prev => prev.slice(0, -1));
      }
    } else {
      // Mid-instance, just subtract the score
      setCurrentInstanceScore(prev => prev - lastScore);
      setCurrentInstanceTurns(prev => prev - 1);
    }
    
    setSessionTurnScores(prev => prev.slice(0, -1));
    showStatus('↩️ Undone', 800);
  };

  const handleHotRowScore = (score) => {
    handleScore(score);
  };

  const handleSaveSession = () => {
    if (completedInstances.length === 0) return;

    const duration = Math.round((new Date() - sessionStart) / 60000);
    const avgOfAvgs = completedInstances.reduce((sum, avg) => sum + avg, 0) / completedInstances.length;

    addSession({
      id: Date.now(),
      mode: 'first-9',
      startTime: sessionStart.toISOString(),
      endTime: new Date().toISOString(),
      duration,
      totalAttempts: completedInstances.length,
      avg3DA: parseFloat(avgOfAvgs.toFixed(1)),
      instances: completedInstances,
      turnScores: sessionTurnScores
    });

    trackEvent('Training Session Completed', {
      mode: 'first-9',
      instances: completedInstances.length,
      avg3DA: avgOfAvgs.toFixed(1),
      duration
    });

    // Clear in-progress data
    localStorage.removeItem(STORAGE_KEY);
    setCurrentInstanceScore(0);
    setCurrentInstanceTurns(0);
    setCompletedInstances([]);
    setSessionTurnScores([]);
    setSessionStart(null);
    setShowSavedOverlay(true);
  };

  // Current instance 3DA (rolling)
  const currentInstance3DA = currentInstanceTurns > 0 
    ? (currentInstanceScore / currentInstanceTurns).toFixed(1) 
    : '0';

  // Session average (average of completed instance 3DAs)
  const sessionAvg3DA = completedInstances.length > 0
    ? (completedInstances.reduce((sum, avg) => sum + avg, 0) / completedInstances.length).toFixed(1)
    : '0.0';

  return (
    <>
      {/* Session Saved Overlay */}
      <SessionSavedOverlay 
        isOpen={showSavedOverlay} 
        onContinue={() => setShowSavedOverlay(false)} 
      />

      {/* Running 3DA Display */}
      <div className="text-center mb-6">
        <div className="text-6xl font-black mb-1" style={GOLD_GRADIENT}>
          {currentInstanceTurns > 0 ? currentInstance3DA : '0'}
          {currentInstanceTurns > 0 && (
            <span className="text-2xl font-bold text-gray-400 ml-2">(3DA)</span>
          )}
        </div>
        <p className="text-gray-400 text-sm mt-4">
          You're playing 501 straight-in. These are your first nine.
        </p>
        {currentInstanceTurns > 0 && (
          <p className="text-yellow-400 text-xs mt-2 font-semibold">
            Turn {currentInstanceTurns} of 3 • Running total: {currentInstanceScore}
          </p>
        )}
      </div>

      {/* Score Input + Hot Row */}
      <div className="mb-6">
        <ScoreInput
          isOpen={showScoreInput}
          onToggle={() => setShowScoreInput(!showScoreInput)}
          onScore={handleScore}
          onBack={handleUndo}
          canUndo={sessionTurnScores.length > 0}
          mode="first9"
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
      <div className="mb-6">
        <button
          onClick={handleSaveSession}
          disabled={completedInstances.length === 0}
          className={`w-full py-4 rounded-lg font-bold transition-all border-2 ${
            completedInstances.length === 0
              ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
              : 'bg-gray-700 text-white border-gray-600 hover:bg-gray-600'
          }`}
        >
          💾 SAVE SESSION
        </button>
      </div>

      {/* Stats Section */}
      <StatsCard title="📊 STATS">
        <StatItem value={completedInstances.length} label="ATTEMPTS" color="yellow" />
        <StatItem value={sessionAvg3DA} label="AVG 3DA" useGradient />
      </StatsCard>

      <RecentList 
        title="🔁 RECENT F9s"
        items={[...completedInstances].reverse().map((avg, i) => ({ avg, index: completedInstances.length - i }))}
        renderItem={(item, i) => (
          <>
            <span className="text-yellow-400 font-semibold">F9 #{item.index}</span>
            <span className="text-white font-semibold">{item.avg.toFixed(1)} 3DA</span>
          </>
        )}
      />
    </>
  );
};
