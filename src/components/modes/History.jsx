import React, { useState } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { Button } from '../ui/Button';
import { GOLD_GRADIENT } from '../../utils/constants';

// Calculate total darts thrown across all sessions
const calculateTotalDarts = (sessions) => {
  return sessions.reduce((total, s) => {
    switch (s.mode) {
      case 'solo-501':
        return total + (s.darts || 0);
      case 'cricket':
        return total + (s.throws || 0);
      case 'first-9':
        return total + ((s.totalAttempts || 0) * 9);
      case 'triples':
      case 'double-in':
      case 'double-out':
        return total + ((s.totalAttempts || 0) * 3);
      default:
        return total;
    }
  }, 0);
};

// Calculate unified metrics from sessions
const calculateUnifiedMetrics = (sessions) => {
  // Double-In %
  const diSessions = sessions.filter(s => s.mode === 'double-in');
  const diTotal = diSessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const diSuccesses = diSessions.reduce((sum, s) => sum + s.successes, 0);
  const doubleInPct = diTotal > 0 ? Math.round((diSuccesses / diTotal) * 100) : '-';

  // Double-Out %
  const doSessions = sessions.filter(s => s.mode === 'double-out');
  const doTotal = doSessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const doSuccesses = doSessions.reduce((sum, s) => sum + s.successes, 0);
  const doubleOutPct = doTotal > 0 ? Math.round((doSuccesses / doTotal) * 100) : '-';

  // Unified 3DA (from Solo 501 + First 9)
  const solo501Sessions = sessions.filter(s => s.mode === 'solo-501' && s.avg3DA);
  const first9Sessions = sessions.filter(s => s.mode === 'first-9' && s.avg3DA);
  const all3DASessions = [...solo501Sessions, ...first9Sessions];
  const unified3DA = all3DASessions.length > 0
    ? (all3DASessions.reduce((sum, s) => sum + s.avg3DA, 0) / all3DASessions.length).toFixed(1)
    : '-';

  // Unified MPR (from Trips + Cricket)
  const tripsSessions = sessions.filter(s => s.mode === 'triples');
  const tripsMarks = tripsSessions.reduce((sum, s) => sum + (parseFloat(s.avgRounds) * s.totalAttempts), 0);
  const tripsRounds = tripsSessions.reduce((sum, s) => sum + s.totalAttempts, 0);

  const cricketSessions = sessions.filter(s => s.mode === 'cricket');
  // Use totalMarks if available (new data), otherwise fall back to 21 (old data)
  const cricketMarks = cricketSessions.reduce((sum, s) => sum + (s.totalMarks || 21), 0);
  const cricketRounds = cricketSessions.reduce((sum, s) => sum + (s.throws / 3), 0);

  const totalMarks = tripsMarks + cricketMarks;
  const totalRounds = tripsRounds + cricketRounds;
  const unifiedMPR = totalRounds > 0 ? (totalMarks / totalRounds).toFixed(2) : '-';

  return { doubleInPct, doubleOutPct, unified3DA, unifiedMPR };
};

export const History = ({ onBack }) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const sessions = useSessionStore(state => state.sessions);
  const clearSessions = useSessionStore(state => state.clearSessions);
  const showStatus = useAppStore(state => state.showStatus);

  const metrics = calculateUnifiedMetrics(sessions);
  const totalDarts = calculateTotalDarts(sessions);

  const handleClearAll = () => {
    clearSessions();
    setConfirmClear(false);
    showStatus('🧹 All data cleared');
  };

  const modeColors = {
    'double-in': 'bg-blue-600',
    'double-out': 'bg-green-600',
    'triples': 'bg-purple-600',
    'first-9': 'bg-orange-600',
    'solo-501': 'bg-yellow-600',
    'cricket': 'bg-pink-600'
  };

  const modeLabels = {
    'double-in': 'DOUBLE-IN',
    'double-out': 'DOUBLE-OUT',
    'triples': 'TRIPLES',
    'first-9': 'FIRST 9',
    'solo-501': 'SOLO 501',
    'cricket': 'CRICKET'
  };

  return (
    <>
      {/* Session Counts */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-800">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-bold text-pink-400">📊 SESSIONS</h3>
          <span className="text-xs text-gray-500">{totalDarts.toLocaleString()} darts</span>
        </div>
        <div className="grid grid-cols-6 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-blue-400">
              {sessions.filter(s => s.mode === 'double-in').length}
            </div>
            <div className="text-xs text-gray-400">DI</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">
              {sessions.filter(s => s.mode === 'double-out').length}
            </div>
            <div className="text-xs text-gray-400">DO</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-400">
              {sessions.filter(s => s.mode === 'triples').length}
            </div>
            <div className="text-xs text-gray-400">TR</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-400">
              {sessions.filter(s => s.mode === 'first-9').length}
            </div>
            <div className="text-xs text-gray-400">F9</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">
              {sessions.filter(s => s.mode === 'solo-501').length}
            </div>
            <div className="text-xs text-gray-400">S01</div>
          </div>
          <div>
            <div className="text-xl font-bold text-pink-400">
              {sessions.filter(s => s.mode === 'cricket').length}
            </div>
            <div className="text-xs text-gray-400">SC</div>
          </div>
        </div>
      </div>

      {/* Universal Metrics */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 border-2 border-yellow-500">
        <h3 className="text-lg font-bold mb-4 text-pink-400">🎯 YOUR METRICS</h3>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div>
            <div className="text-xs text-gray-300 font-medium mb-1">DI %</div>
            <div className="text-2xl font-black" style={GOLD_GRADIENT}>
              {metrics.doubleInPct}{metrics.doubleInPct !== '-' && '%'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-300 font-medium mb-1">CO %</div>
            <div className="text-2xl font-black" style={GOLD_GRADIENT}>
              {metrics.doubleOutPct}{metrics.doubleOutPct !== '-' && '%'}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-300 font-medium mb-1">3DA</div>
            <div className="text-2xl font-black" style={GOLD_GRADIENT}>
              {metrics.unified3DA}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-300 font-medium mb-1">MPR</div>
            <div className="text-2xl font-black" style={GOLD_GRADIENT}>
              {metrics.unifiedMPR}
            </div>
          </div>
        </div>
      </div>

      {/* Session History */}
      {sessions.length > 0 ? (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 text-pink-400">📈 RECENT SESSIONS</h3>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {sessions.map((s) => {
              const endDateTime = new Date(s.endTime);
              const dateStr = endDateTime.toLocaleDateString([], { month: 'short', day: 'numeric' });
              const timeStr = endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              
              let statStr = '';
              if (s.mode === 'cricket') statStr = `${s.mpr || (63 / s.throws).toFixed(2)} MPR`;
              else if (s.mode === 'solo-501') statStr = `${s.avg3DA} 3DA`;
              else if (s.mode === 'triples') statStr = `${s.avgRounds} MPR`;
              else if (s.mode === 'first-9') statStr = `${s.avg3DA} 3DA`;
              else statStr = `${s.successRate}%`;
              
              return (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-gray-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${modeColors[s.mode]}`}></div>
                    <span className="text-gray-300 text-sm">{modeLabels[s.mode]}</span>
                    <span className="text-gray-600 text-xs">{dateStr} {timeStr}</span>
                  </div>
                  <div className="text-yellow-400 text-sm font-bold">
                    {statStr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg p-8 text-center mb-6 border border-gray-800">
          <p className="text-gray-400 text-sm">
            No sessions yet. Complete a training session to see it here!
          </p>
        </div>
      )}

      {/* Clear Data */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-800">
        <div className="flex items-start mb-3">
          <input 
            type="checkbox" 
            id="confirmClear" 
            checked={confirmClear} 
            onChange={(e) => setConfirmClear(e.target.checked)} 
            className="mt-1 mr-3 w-5 h-5 cursor-pointer" 
          />
          <label htmlFor="confirmClear" className="text-sm text-gray-300 cursor-pointer">
            Delete all session history and start again.
          </label>
        </div>
        <button 
          onClick={handleClearAll} 
          disabled={!confirmClear}
          className={`w-full font-black py-3 px-6 rounded-lg transition-all border-2 shadow-lg ${
            confirmClear 
              ? 'bg-pink-600 hover:bg-pink-700 text-white border-pink-500 transform hover:scale-105 cursor-pointer' 
              : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed opacity-50'
          }`}
          style={confirmClear ? { textShadow: '2px 2px 4px rgba(0,0,0,0.8)' } : {}}
        >
          🧹 CLEAR ALL DATA
        </button>
      </div>

      {/* Back Button */}
      <Button 
        onClick={onBack}
        className="w-full mb-8"
        size="lg"
        style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
      >
        ← BACK TO MENU
      </Button>
    </>
  );
};