import React, { useState, useEffect, useMemo } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { trackEvent } from '../../utils/analytics';
import { isValidThreeDartScore } from '../../utils/scoring';
import { getHotRowScores } from '../../utils/hotrow';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { SessionSavedOverlay, CheckoutOverlay } from '../ui/Overlay';
import { HotRow } from '../ui/HotRow';
import { GOLD_GRADIENT } from '../../utils/constants';

const STORAGE_KEY = 'wb4_inprogress_solo501';

// Check if a score is a valid checkout (can be finished with a double)
const isValidCheckout = (remaining) => {
  if (remaining < 2) return false;
  if (remaining > 170) return false;
  const impossibleCheckouts = [159, 162, 163, 165, 166, 168, 169];
  if (impossibleCheckouts.includes(remaining)) return false;
  return true;
};

// Calculate minimum darts needed to checkout
// Single dart checkouts: 2-40 (even), 50 (bull)
// Everything else needs at least 2 darts
const getMinCheckoutDarts = (score) => {
  // Single dart: even numbers 2-40, or 50 (bull)
  if (score === 50) return 1;
  if (score >= 2 && score <= 40 && score % 2 === 0) return 1;
  // Everything else needs at least 2 darts
  return 2;
};

export const Solo501 = () => {
  const [remaining, setRemaining] = useState(501);
  const [turnHistory, setTurnHistory] = useState([]);
  const [gameStart, setGameStart] = useState(null);
  const [completedGames, setCompletedGames] = useState([]);
  const [scoreInput, setScoreInput] = useState('');
  const [showCalc, setShowCalc] = useState(false);
  const [calcDisplay, setCalcDisplay] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const [showSavedOverlay, setShowSavedOverlay] = useState(false);

  const addSession = useSessionStore(state => state.addSession);
  const sessions = useSessionStore(state => state.sessions);
  const showStatus = useAppStore(state => state.showStatus);

  // Compute dynamic hot row scores from session history
  const hotRowScores = useMemo(() => getHotRowScores(sessions), [sessions]);

  // Load in-progress game on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setRemaining(data.remaining || 501);
        setTurnHistory(data.turnHistory || []);
        setGameStart(data.gameStart ? new Date(data.gameStart) : null);
        setCompletedGames(data.completedGames || []);
      }
    } catch (e) {
      console.error('Error loading in-progress game:', e);
    }
  }, []);

  // Save in-progress game whenever state changes
  useEffect(() => {
    if (turnHistory.length > 0 || completedGames.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        remaining,
        turnHistory,
        gameStart: gameStart?.toISOString(),
        completedGames
      }));
    }
  }, [remaining, turnHistory, gameStart, completedGames]);

  const handleCalcToggle = () => {
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
    } else {
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
      return;
    }

    if (!scoreInput) return;
    const turnScore = parseInt(scoreInput) || 0;

    if (!isValidThreeDartScore(turnScore)) {
      showStatus('⚠️ Invalid score', 2000);
      return;
    }

    processScore(turnScore);
    setScoreInput('');
  };

  const processScore = (turnScore) => {
    if (!gameStart) setGameStart(new Date());
    
    const newRemaining = remaining - turnScore;

    // Check for bust conditions
    if (newRemaining < 0 || newRemaining === 1 || (newRemaining === 0 && turnScore < 2)) {
      setTurnHistory(prev => [{ score: 0, remaining: remaining, bust: true, darts: 3 }, ...prev]);
      showStatus('💥 Bust!', 1000);
      trackEvent('Attempt Recorded', { mode: 'solo-501', bust: true });
      return;
    }

    // Check for checkout (game complete)
    if (newRemaining === 0) {
      setPendingCheckout({ turnScore, remaining });
      setShowCheckoutModal(true);
      return;
    }

    // Valid score, game continues
    setRemaining(newRemaining);
    setTurnHistory(prev => [{ score: turnScore, remaining: newRemaining, bust: false, darts: 3 }, ...prev]);
    showStatus('💾 Saved', 800);
    trackEvent('Attempt Recorded', { mode: 'solo-501', score: turnScore });
  };

  const handleCheckoutConfirm = (darts) => {
    const turnScore = pendingCheckout.turnScore;
    const previousDarts = turnHistory.reduce((sum, t) => sum + t.darts, 0);
    const totalDarts = previousDarts + darts;
    const totalTurns = turnHistory.length + 1;
    const avg3DA = 501 / totalTurns;

    const game = {
      darts: totalDarts,
      turns: totalTurns,
      avg3DA: parseFloat(avg3DA.toFixed(1)),
      timestamp: new Date().toLocaleTimeString()
    };

    setCompletedGames(prev => [game, ...prev]);

    // Auto-save session when game completes
    const now = new Date();
    const duration = Math.round((now - gameStart) / 60000) || 1;

    // Collect all turn scores (including final checkout turn)
    // turnHistory is newest-first, so reverse it and add the final turn
    const turnScores = [...turnHistory]
      .reverse()
      .map(t => t.score)
      .filter(s => s > 0); // Exclude busts (score: 0)
    turnScores.push(turnScore); // Add the checkout turn

    addSession({
      id: Date.now(),
      mode: 'solo-501',
      startTime: gameStart.toISOString(),
      endTime: now.toISOString(),
      duration,
      darts: totalDarts,
      turns: totalTurns,
      avg3DA: parseFloat(avg3DA.toFixed(1)),
      turnScores
    });

    trackEvent('Training Session Completed', {
      mode: 'solo-501',
      darts: totalDarts,
      turns: totalTurns,
      avg3DA: avg3DA.toFixed(1)
    });

    // Reset for new game
    setRemaining(501);
    setTurnHistory([]);
    setGameStart(null);
    setShowCheckoutModal(false);
    setPendingCheckout(null);
    setShowSavedOverlay(true);
  };

  const handleHotRowScore = (score, isCheckout) => {
    if (!gameStart) setGameStart(new Date());
    
    // If this is the checkout button being tapped, go straight to checkout flow
    if (isCheckout) {
      setPendingCheckout({ turnScore: score, remaining });
      setShowCheckoutModal(true);
      return;
    }
    
    const newRemaining = remaining - score;

    if (newRemaining < 0 || newRemaining === 1) {
      setTurnHistory(prev => [{ score: 0, remaining: remaining, bust: true, darts: 3 }, ...prev]);
      showStatus('💥 Bust!', 1000);
      trackEvent('Attempt Recorded', { mode: 'solo-501', bust: true });
    } else if (newRemaining === 0) {
      setPendingCheckout({ turnScore: score, remaining });
      setShowCheckoutModal(true);
    } else {
      setRemaining(newRemaining);
      setTurnHistory(prev => [{ score, remaining: newRemaining, bust: false, darts: 3 }, ...prev]);
      showStatus('💾 Saved', 800);
      trackEvent('Attempt Recorded', { mode: 'solo-501', score });
    }
  };

  const handleBust = () => {
    if (!gameStart) setGameStart(new Date());
    setTurnHistory(prev => [{ score: 0, remaining: remaining, bust: true, darts: 3 }, ...prev]);
    showStatus('💥 Bust!', 1000);
    trackEvent('Attempt Recorded', { mode: 'solo-501', bust: true });
  };

  const handleNewGame = () => {
    setRemaining(501);
    setTurnHistory([]);
    setGameStart(null);
    setScoreInput('');
    setCalcDisplay('');
    setShowCalc(false);
    
    if (completedGames.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedGames }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    showStatus('🎯 New game started', 1000);
  };

  const current3DA = turnHistory.length > 0 
    ? ((501 - remaining) / turnHistory.length).toFixed(1)
    : '—';

  const avgDarts = completedGames.length > 0
    ? (completedGames.reduce((sum, g) => sum + g.darts, 0) / completedGames.length).toFixed(1)
    : '0';

  const isCheckoutRange = remaining <= 170 && isValidCheckout(remaining);

  return (
    <>
      {/* Session Saved Overlay */}
      <SessionSavedOverlay 
        isOpen={showSavedOverlay} 
        onContinue={() => setShowSavedOverlay(false)} 
      />

      {/* Checkout Modal */}
      <CheckoutOverlay
        isOpen={showCheckoutModal}
        onSelect={handleCheckoutConfirm}
        minDarts={pendingCheckout ? getMinCheckoutDarts(pendingCheckout.remaining) : 1}
      />

      {/* Remaining Score Display */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-6">
          <div className="text-6xl font-black" style={GOLD_GRADIENT}>
            {remaining}
          </div>
          <div className="text-left">
            <div className="text-gray-400 text-xs">
              Turn: <span className="text-white font-semibold">{turnHistory.length + 1}</span>
            </div>
            <div className="text-gray-400 text-xs">
              3DA: <span className="text-white font-semibold">{current3DA}</span>
            </div>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-2">
          Straight-in, double-out. Enter your score each turn.
        </p>
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
            <div className="grid grid-cols-6 gap-2">
              {[
                { label: '20', value: 20 },
                { label: '19', value: 19 },
                { label: '18', value: 18 },
                { label: 'T20', value: 60 },
                { label: 'T19', value: 57 },
                { label: 'T18', value: 54 },
              ].map((qs) => (
                <button
                  key={qs.label}
                  onClick={() => handleQuickScore(qs.value)}
                  className="py-2 px-1 rounded-lg font-bold text-sm bg-gray-700 text-white hover:bg-gray-600 transition-all"
                >
                  {qs.label}
                </button>
              ))}
            </div>
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
        <div className="mb-8 mt-8">
          <HotRow 
            scores={hotRowScores} 
            onSelect={handleHotRowScore}
            checkout={isCheckoutRange ? remaining : null}
          />
        </div>

        {/* Score, Bust, New Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={handleScore}
            disabled={!scoreInput && !showCalc}
            className="py-4 rounded-lg font-bold transition-all disabled:opacity-50 bg-gray-700 text-white hover:bg-gray-600 border border-gray-600"
          >
            <span className="text-lg mr-1">✅</span>
            <span className="text-sm">SCORE</span>
          </button>
          <button
            onClick={handleBust}
            className="py-4 rounded-lg font-bold transition-all bg-gray-700 text-white hover:bg-gray-600 border border-gray-600"
          >
            <span className="text-lg mr-1">💥</span>
            <span className="text-sm">BUST</span>
          </button>
          <button
            onClick={handleNewGame}
            className="py-4 rounded-lg font-bold transition-all bg-gray-700 text-white hover:bg-gray-600 border border-gray-600"
          >
            <span className="text-lg mr-1">🔄</span>
            <span className="text-sm">NEW</span>
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <StatsCard title="📊 STATS">
        <StatItem value={completedGames.length} label="GAMES" color="yellow" />
        <StatItem value={avgDarts} label="AVG DARTS" useGradient />
      </StatsCard>

      {/* Recent Turns */}
      {turnHistory.length > 0 && (
        <RecentList
          title="📝 RECENT TURNS"
          items={turnHistory.slice(0, 10)}
          renderItem={(turn, i) => (
            <>
              <span className={`font-semibold ${turn.bust ? 'text-red-400' : 'text-yellow-400'}`}>
                {turn.bust ? '💥 BUST' : `+${turn.score}`}
              </span>
              <span className="text-white font-semibold">→ {turn.remaining}</span>
            </>
          )}
        />
      )}

      {/* Completed Games */}
      {completedGames.length > 0 && (
        <RecentList
          title="🏆 COMPLETED GAMES"
          items={completedGames}
          renderItem={(game, i) => (
            <>
              <span className="text-yellow-400 font-semibold">Game #{completedGames.length - i}</span>
              <span className="text-white font-semibold">{game.darts} darts</span>
              <span className="text-green-400 font-semibold">{game.avg3DA} 3DA</span>
            </>
          )}
        />
      )}
    </>
  );
};