import React, { useState, useEffect } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { calculateStats } from '../../utils/statistics';
import { trackEvent } from '../../utils/analytics';
import { ActionButton } from '../ui/Button';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_double_in';

export const DoubleIn = () => {
  const [attempts, setAttempts] = useState([]);
  const [sessionStart, setSessionStart] = useState(null);
  const [scoreInput, setScoreInput] = useState('');
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');
  
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

  const handleCalcToggle = () => {
    if (showCalc) {
      // Closing calc - convert to sum
      try {
        const parts = calcDisplay.split('+').map(p => parseInt(p.trim()) || 0);
        const total = parts.reduce((sum, n) => sum + n, 0);
        setScoreInput(String(Math.min(total, 170)));
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

  const recordAttempt = (outcome) => {
    // Close calculator if open
    if (showCalc) {
      try {
        const parts = calcDisplay.split('+').map(p => parseInt(p.trim()) || 0);
        const total = parts.reduce((sum, n) => sum + n, 0);
        setScoreInput(String(Math.min(total, 170)));
      } catch {
        setScoreInput('');
      }
      setShowCalc(false);
      setCalcDisplay('');
    }

    const now = new Date();
    const start = attempts.length === 0 ? now : sessionStart;
    if (attempts.length === 0) setSessionStart(now);

    let score = null;
    if (outcome === 'success' && scoreInput) {
      const val = parseInt(scoreInput);
      if (val >= 2 && val <= 170) {
        score = val;
        setScoreInput('');
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
      {/* Score Input Section */}
      <div className="text-center mb-8">
        <div className="text-4xl font-black mb-4" style={GOLD_GRADIENT}>
          GET IN
        </div>
        <p className="text-gray-400 text-sm mb-4">
          You have three darts to get in. Hit any double and enter your score.
        </p>
        <div className="relative flex items-center justify-center">
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
          <div className="mt-4">
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
      </div>

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
        title="📝 RECENT INS"
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