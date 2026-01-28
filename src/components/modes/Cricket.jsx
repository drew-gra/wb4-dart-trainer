import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { calculateCricketStats } from '../../utils/statistics';
import { trackEvent } from '../../utils/analytics';
import { Button } from '../ui/Button';
import { StatsCard, StatItem, RecentList } from '../ui/StatCard';
import { SessionSavedOverlay } from '../ui/Overlay';
import { GOLD_GRADIENT } from '../../utils/constants';

const BASE_NUMBERS = [20, 19, 18, 17, 16, 15, 'Bull'];
const TOTAL_MARKS_TO_CLOSE = 21;
const STORAGE_KEY = 'wb4_inprogress_cricket';

// Point values for scoring
const getPointValue = (number) => number === 'Bull' ? 25 : number;

export const Cricket = () => {
  const [hits, setHits] = useState({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, Bull: 0 });
  const [totalThrows, setTotalThrows] = useState(0);
  const [missCount, setMissCount] = useState(0);
  const [score, setScore] = useState(0);
  const [totalMarks, setTotalMarks] = useState(0);
  const [gameStart, setGameStart] = useState(null);
  const [completedGames, setCompletedGames] = useState([]);
  const [pendingSelections, setPendingSelections] = useState([]);
  const [targetData, setTargetData] = useState({});
  const [showSavedOverlay, setShowSavedOverlay] = useState(false);
  
  const addSession = useSessionStore(state => state.addSession);
  const showStatus = useAppStore(state => state.showStatus);

  // Load in-progress game on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        setHits(data.hits || { 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, Bull: 0 });
        setTotalThrows(data.totalThrows || 0);
        setMissCount(data.missCount || 0);
        setScore(data.score || 0);
        setTotalMarks(data.totalMarks || 0);
        setGameStart(data.gameStart ? new Date(data.gameStart) : null);
        setCompletedGames(data.completedGames || []);
        setTargetData(data.targetData || {});
      }
    } catch (e) {
      console.error('Error loading in-progress game:', e);
    }
  }, []);

  // Save in-progress game whenever state changes
  useEffect(() => {
    if (totalThrows > 0 || completedGames.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        hits,
        totalThrows,
        missCount,
        score,
        totalMarks,
        gameStart: gameStart?.toISOString(),
        completedGames,
        targetData
      }));
    }
  }, [hits, totalThrows, missCount, score, totalMarks, gameStart, completedGames, targetData]);

  // Calculate closing marks (capped at 3 per number)
  const closingMarks = Object.values(hits).reduce((sum, count) => sum + Math.min(count, 3), 0);
  const isComplete = closingMarks >= TOTAL_MARKS_TO_CLOSE;
  
  // Calculate MPR based on total marks thrown (not just closing marks)
  const currentMPR = totalThrows > 0 ? ((totalMarks / totalThrows) * 3).toFixed(2) : '0.00';
  
  // Reorder numbers: open first, closed last (but all stay active)
  const numbers = useMemo(() => {
    const open = BASE_NUMBERS.filter(num => hits[num] < 3);
    const closed = BASE_NUMBERS.filter(num => hits[num] >= 3);
    return [...open, ...closed];
  }, [hits]);

  // Handle game completion
  useEffect(() => {
    if (isComplete && gameStart && totalThrows > 0) {
      const now = new Date();
      const residualMarks = totalMarks - TOTAL_MARKS_TO_CLOSE;
      const mpr = (totalMarks / totalThrows) * 3;
      
      const game = {
        throws: totalThrows,
        score,
        totalMarks,
        residualMarks,
        mpr: parseFloat(mpr.toFixed(2)),
        timestamp: now.toLocaleTimeString(),
        date: now.toLocaleDateString()
      };
      
      setCompletedGames(prev => [game, ...prev]);
      
      const duration = Math.round((now - gameStart) / 60000) || 1;
      const missRate = totalThrows > 0 ? Math.round((missCount / totalThrows) * 100) : 0;
      
      addSession({
        id: Date.now(),
        mode: 'cricket',
        startTime: gameStart.toISOString(),
        endTime: now.toISOString(),
        duration,
        throws: totalThrows,
        score,
        totalMarks,
        closingMarks: TOTAL_MARKS_TO_CLOSE,
        residualMarks,
        mpr: parseFloat(mpr.toFixed(2)),
        missRate,
        targetData
      });
      
      // Reset game state
      setHits({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, Bull: 0 });
      setTotalThrows(0);
      setMissCount(0);
      setScore(0);
      setTotalMarks(0);
      setGameStart(null);
      setPendingSelections([]);
      setTargetData({});
      setShowSavedOverlay(true);
    }
  }, [isComplete, gameStart, totalThrows]);

  const handlePendingHit = (number, marksThrown) => {
    if (pendingSelections.length >= 3) return;
    if (isComplete) return;
    
    // Calculate what hits would look like after this selection
    const simulatedHits = { ...hits };
    pendingSelections.forEach(s => {
      if (s.type === 'hit') {
        simulatedHits[s.number] = Math.min(3, simulatedHits[s.number] + s.marksThrown);
      }
    });
    
    // Check if game would already be complete with pending selections
    const simulatedClosingMarks = Object.values(simulatedHits).reduce((sum, count) => sum + Math.min(count, 3), 0);
    if (simulatedClosingMarks >= TOTAL_MARKS_TO_CLOSE) return; // Already closed out with pending
    
    // Check if this dart would close out the game
    simulatedHits[number] = Math.min(3, simulatedHits[number] + marksThrown);
    const newClosingMarks = Object.values(simulatedHits).reduce((sum, count) => sum + Math.min(count, 3), 0);
    
    if (newClosingMarks >= TOTAL_MARKS_TO_CLOSE) {
      // This dart closes the game - add it and lock further input
      setPendingSelections(prev => [...prev, { number, marksThrown, type: 'hit', closesGame: true }]);
    } else {
      setPendingSelections(prev => [...prev, { number, marksThrown, type: 'hit' }]);
    }
  };

  const handlePendingMiss = () => {
    if (pendingSelections.length >= 3) return;
    if (isComplete) return;
    
    // Check if game already closed with pending selections
    const simulatedHits = { ...hits };
    pendingSelections.forEach(s => {
      if (s.type === 'hit') {
        simulatedHits[s.number] = Math.min(3, simulatedHits[s.number] + s.marksThrown);
      }
    });
    const simulatedClosingMarks = Object.values(simulatedHits).reduce((sum, count) => sum + Math.min(count, 3), 0);
    if (simulatedClosingMarks >= TOTAL_MARKS_TO_CLOSE) return;
    
    setPendingSelections(prev => [...prev, { type: 'miss' }]);
  };

  const handleSubmit = () => {
    if (pendingSelections.length === 0) return;
    if (!gameStart) setGameStart(new Date());
    
    const newHits = { ...hits };
    const newTargetData = { ...targetData };
    let newMissCount = 0;
    let marksToAdd = 0;
    let scoreToAdd = 0;
    
    pendingSelections.forEach(selection => {
      if (selection.type === 'miss') {
        newMissCount++;
      } else if (selection.type === 'hit') {
        const { number, marksThrown } = selection;
        const pointValue = getPointValue(number);
        const currentHits = newHits[number];
        const marksNeededToClose = Math.max(0, 3 - currentHits);
        
        // Calculate closing marks vs residual marks
        const closingMarksFromThrow = Math.min(marksThrown, marksNeededToClose);
        const residualMarksFromThrow = marksThrown - closingMarksFromThrow;
        
        // Update hits (capped at 3 for closing purposes)
        newHits[number] = Math.min(3, currentHits + marksThrown);
        
        // Track all marks thrown
        marksToAdd += marksThrown;
        
        // Score from residual marks only
        scoreToAdd += residualMarksFromThrow * pointValue;
        
        // Update target data
        if (!newTargetData[number]) {
          newTargetData[number] = { singles: 0, doubles: 0, triples: 0, residualMarks: 0, points: 0 };
        }
        
        if (marksThrown === 1) newTargetData[number].singles++;
        else if (marksThrown === 2) newTargetData[number].doubles++;
        else if (marksThrown === 3) newTargetData[number].triples++;
        
        newTargetData[number].residualMarks = (newTargetData[number].residualMarks || 0) + residualMarksFromThrow;
        newTargetData[number].points = (newTargetData[number].points || 0) + (residualMarksFromThrow * pointValue);
      }
    });
    
    setHits(newHits);
    setTargetData(newTargetData);
    setTotalThrows(prev => prev + pendingSelections.length);
    setMissCount(prev => prev + newMissCount);
    setTotalMarks(prev => prev + marksToAdd);
    setScore(prev => prev + scoreToAdd);
    setPendingSelections([]);
    showStatus('✓ Saved', 800);
  };

  const handleClear = () => setPendingSelections([]);

  const handleNewGame = () => {
    setHits({ 20: 0, 19: 0, 18: 0, 17: 0, 16: 0, 15: 0, Bull: 0 });
    setTotalThrows(0);
    setMissCount(0);
    setScore(0);
    setTotalMarks(0);
    setGameStart(null);
    setPendingSelections([]);
    setTargetData({});
    if (completedGames.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ completedGames }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    showStatus('🎯 New game started', 1000);
  };

  const isPending = (number, count) => pendingSelections.some(s => s.type === 'hit' && s.number === number && s.marksThrown === count);
  const isMissPending = pendingSelections.some(s => s.type === 'miss');
  const isLocked = pendingSelections.length >= 3;

  const stats = calculateCricketStats(completedGames);

  // Find the first open number for miss/submit placement
  const priorityOrder = [20, 19, 18, 17, 16, 15, 'Bull'];
  const firstOpenNumber = priorityOrder.find(n => hits[n] < 3);

  const HitButton = ({ number, marksThrown, label, colorClass, activeColorClass }) => {
    const isActive = isPending(number, marksThrown);
    
    return (
      <button
        onClick={() => handlePendingHit(number, marksThrown)}
        disabled={isLocked}
        className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all border ${
          isLocked
            ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
            : isActive
            ? `${activeColorClass} text-white scale-105 shadow-lg`
            : `bg-gray-800 ${colorClass} border-gray-700 hover:bg-gray-700 hover:border-gray-600 hover:scale-105`
        }`}
      >
        {label}
      </button>
    );
  };

  const MissSubmitRow = () => (
    <div className="flex items-center gap-3">
      <div className="flex gap-3 flex-1">
        <button
          onClick={handlePendingMiss}
          disabled={isLocked}
          className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all border ${
            isLocked
              ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed'
              : isMissPending
              ? 'bg-red-600 text-white border-red-500 scale-105 shadow-lg'
              : 'bg-gray-800 text-red-400 border-gray-700 hover:bg-gray-700 hover:border-gray-600 hover:scale-105'
          }`}
        >
          ❌ MISS
        </button>
        <button
          onClick={handleSubmit}
          disabled={pendingSelections.length === 0}
          className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all border ${
            pendingSelections.length === 0
              ? 'bg-gray-800 text-gray-600 border-gray-700 cursor-not-allowed opacity-50'
              : 'bg-green-600 text-white border-2 border-green-400 shadow-lg hover:scale-105'
          }`}
        >
          ✓ SUBMIT {pendingSelections.length > 0 && `(${pendingSelections.length})`}
        </button>
      </div>
      <div className="w-20"></div>
    </div>
  );

  const MarksDisplay = ({ number }) => {
    const hitCount = hits[number];
    const isClosed = hitCount >= 3;
    
    if (isClosed) {
      return (
        <div className="w-20 text-right">
          <span className="text-gray-500 text-xs font-medium">Closed</span>
        </div>
      );
    }
    
    return (
      <div className="flex gap-1 w-20 justify-end">
        {[0, 1, 2].map(idx => (
          <span key={idx} className="text-sm">
            {idx < hitCount ? '🎯' : ''}
          </span>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Session Saved Overlay */}
      <SessionSavedOverlay 
        isOpen={showSavedOverlay} 
        onContinue={() => setShowSavedOverlay(false)} 
      />

      {/* Score Display - like 501 */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-6">
          <div className="text-6xl font-black" style={GOLD_GRADIENT}>
            {score}
          </div>
          <div className="text-left">
            <div className="text-gray-400 text-xs">
              Darts: <span className="text-white font-semibold">{totalThrows}</span>
            </div>
            <div className="text-gray-400 text-xs">
              MPR: <span className="text-white font-semibold">{currentMPR}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-800">
        <div className="space-y-3">
          {numbers.map((num) => {
            const shouldShowMissSubmit = num === firstOpenNumber;
            
            if (num === 'Bull') {
              return (
                <Fragment key={num}>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-3 flex-1">
                      <HitButton number="Bull" marksThrown={1} label="BULL" colorClass="text-yellow-400" activeColorClass="bg-yellow-600 border-yellow-500" />
                      <HitButton number="Bull" marksThrown={2} label="D-BULL" colorClass="text-red-400" activeColorClass="bg-red-600 border-red-500" />
                    </div>
                    <MarksDisplay number="Bull" />
                  </div>
                  {shouldShowMissSubmit && <MissSubmitRow />}
                </Fragment>
              );
            }
            
            return (
              <Fragment key={num}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-3 flex-1">
                    <HitButton number={num} marksThrown={1} label={String(num)} colorClass="text-blue-400" activeColorClass="bg-blue-600 border-blue-500" />
                    <HitButton number={num} marksThrown={2} label={`D${num}`} colorClass="text-green-400" activeColorClass="bg-green-600 border-green-500" />
                    <HitButton number={num} marksThrown={3} label={`T${num}`} colorClass="text-purple-400" activeColorClass="bg-purple-600 border-purple-500" />
                  </div>
                  <MarksDisplay number={num} />
                </div>
                {shouldShowMissSubmit && <MissSubmitRow />}
              </Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        <Button 
          onClick={handleClear}
          disabled={pendingSelections.length === 0}
          size="md"
        >
          ↺ CLEAR
        </Button>
        <Button onClick={handleNewGame} size="md">
          🔄 NEW
        </Button>
      </div>

      <StatsCard title="📊 STATS">
        <StatItem value={stats.total} label="GAMES" color="yellow" />
        <StatItem value={stats.avgMPR || '-'} label="AVG MPR" useGradient />
      </StatsCard>

      <RecentList 
        title="🎯 RECENT GAMES"
        items={completedGames}
        renderItem={(game, i) => (
          <>
            <span className="text-yellow-400 font-semibold">Game #{completedGames.length - i}</span>
            <span className="text-white font-semibold">{game.mpr || (63 / game.throws).toFixed(2)} MPR</span>
            <span className="text-green-400 font-semibold">{game.score || 0} pts</span>
          </>
        )}
      />
    </>
  );
};
