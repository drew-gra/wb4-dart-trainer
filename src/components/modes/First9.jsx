import React, { useState, useEffect, useMemo } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { trackEvent } from '../../utils/analytics';
import { isValidThreeDartScore } from '../../utils/scoring';
import { getHotRowScores } from '../../utils/hotrow';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { ActionButton } from '../ui/Button';
import { SessionSavedOverlay } from '../ui/Overlay';
import { HotRow } from '../ui/HotRow';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_first9';

// Quick score buttons for F9 calculator
const QUICK_SCORES = [
  { label: '20', value: 20 },
  { label: '19', value: 19 },
  { label: '18', value: 18 },
  { label: 'T20', value: 60 },
  { label: 'T19', value: 57 },
  { label: 'T18', value: 54 },
];

export const First9 = () => {
  // Current instance state (resets after 3 turns)
  const [currentInstanceScore, setCurrentInstanceScore] = useState(0);
  const [currentInstanceTurns, setCurrentInstanceTurns] = useState(0);
  
  // Session state (persists until Save)
  const [completedInstances, setCompletedInstances] = useState([]); // Array of 3DA values
  const [sessionTurnScores, setSessionTurnScores] = useState([]); // All turn scores this session
  const [sessionStart, setSessionStart] = useState(null);
  
  // Input state
  const [scoreInput, setScoreInput] = useState('');
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');
  
  // Overlay state
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

  const handleCalcToggle = () => {
    if (showCalc) {
      // Closing calc - convert to sum
      try {
        const parts = calcDisplay.split('+').map(p => parseInt(p.trim()) || 0);
        const total = parts.reduce((sum, n) => sum + n, 0);
        setScoreInput(String(Math.min(total, 180)));
      } catch {
        setScoreInput('');
      }
      setShowCalc(false);
      setCalcDisplay('');
    } else {
      // Opening calc
      setShowCalc(true);
      setCalcDisplay('');
    }
  };

  const handleQuickScore = (value) => {
    if (calcDisplay === '') {
      setCalcDisplay(String(value));
    } else {
      setCalcDisplay(prev => prev + '+' + value);
    }
  };

  const handleCalcInput = (btn) => {
    if (btn === 'C') {
      setCalcDisplay('');
    } else if (btn === '+') {
      if (calcDisplay && !calcDisplay.endsWith('+')) {
        setCalcDisplay(prev => prev + '+');
      }
    } else {
      setCalcDisplay(prev => prev + btn);
    }
  };

  const handleScore = () => {
    // Close calculator if open
    if (showCalc) {
      try {
        const parts = calcDisplay.split('+').map(p => parseInt(p.trim()) || 0);
        const total = parts.reduce((sum, n) => sum + n, 0);
        setScoreInput(String(Math.min(total, 180)));
      } catch {
        setScoreInput('');
      }
      setShowCalc(false);
      setCalcDisplay('');
      return; // Let user see the score first, then submit
    }

    if (!scoreInput) return;

    const turnScore = parseInt(scoreInput) || 0;

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

    setScoreInput('');
    trackEvent('Attempt Recorded', { mode: 'first-9', score: turnScore });
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
    setScoreInput('');
    setCalcDisplay('');
    setShowCalc(false);
    setShowSavedOverlay(true);
  };

  // Handle Hot Row score selection
  const handleHotRowScore = (score) => {
    // Validate: must be a possible 3-dart score
    if (!isValidThreeDartScore(score)) {
      showStatus('⚠️ Invalid score', 2000);
      return;
    }

    const now = new Date();
    if (!sessionStart) setSessionStart(now);

    // Track this turn score for Hot Row
    setSessionTurnScores(prev => [...prev, score]);

    const newInstanceScore = currentInstanceScore + score;
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

    trackEvent('Attempt Recorded', { mode: 'first-9', score });
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
      <div className="text-center mb-8">
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
            Turn {currentInstanceTurns} of 3
          </p>
        )}
      </div>

      {/* Score Input with Calculator Toggle */}
      <div className="mb-6">
        <div className="relative flex items-center justify-center mb-4">
          <input
            type="text"
            value={showCalc ? calcDisplay : scoreInput}
            onChange={(e) => !showCalc && setScoreInput(e.target.value)}
            readOnly={showCalc}
            className={`text-center bg-transparent text-yellow-400 border-b-2 border-yellow-500 focus:border-yellow-300 focus:outline-none transition-all ${
              showCalc 
                ? 'text-xl font-bold w-48 pb-2' 
                : 'text-3xl font-bold w-28 pb-2'
            }`}
            placeholder="0"
            inputMode="numeric"
            maxLength={showCalc ? 20 : 3}
          />
          <button
            onClick={handleCalcToggle}
            className={`absolute left-1/2 ml-28 p-4 rounded-lg transition-all text-xl ${
              showCalc 
                ? 'bg-yellow-500 text-black' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {showCalc ? '✓' : '🧮'}
          </button>
        </div>

        {/* Calculator Panel */}
        {showCalc && (
          <div className="mt-4 space-y-3">
            {/* Quick Score Buttons */}
            <div className="grid grid-cols-6 gap-2">
              {QUICK_SCORES.map((qs) => (
                <button
                  key={qs.label}
                  onClick={() => handleQuickScore(qs.value)}
                  className="py-2 px-1 rounded-lg font-bold text-sm bg-gray-700 text-white hover:bg-gray-600 transition-all"
                >
                  {qs.label}
                </button>
              ))}
            </div>

            {/* Number Pad */}
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'C', 0, '+'].map((btn, i) => (
                <button
                  key={i}
                  onClick={() => handleCalcInput(String(btn))}
                  className={`py-3 rounded-lg font-bold text-lg transition-all ${
                    btn === '+' 
                      ? 'bg-blue-600 text-white hover:bg-blue-500'
                      : btn === 'C'
                      ? 'bg-red-600 text-white hover:bg-red-500'
                      : 'bg-gray-700 text-white hover:bg-gray-600'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Hot Row */}
        <div className="mb-4 mt-4">
          <HotRow 
            scores={hotRowScores} 
            onSelect={handleHotRowScore}
          />
        </div>

        {/* Score and Save Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-8">
          <ActionButton
            icon="✅"
            label="SCORE"
            onClick={handleScore}
            disabled={!scoreInput && !showCalc}
          />
          <ActionButton
            icon="💾"
            label="SAVE"
            onClick={handleSaveSession}
            disabled={completedInstances.length === 0}
          />
        </div>
      </div>

      {/* Stats Section */}
      <StatsCard title="📊 STATS">
        <StatItem value={completedInstances.length} label="ATTEMPTS" color="yellow" />
        <StatItem value={sessionAvg3DA} label="AVG 3DA" useGradient />
      </StatsCard>

      <RecentList 
        title="📝 RECENT F9s"
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
