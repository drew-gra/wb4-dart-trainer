import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useSessionStore, useAppStore } from '../../store/gameStore';
import { GOLD_GRADIENT } from '../../utils/constants';
import { NamePromptOverlay } from '../ui/Overlay';
import { ShareButton, SharePreviewOverlay } from '../ui/ShareTile';

// Static lookup tables (defined outside component to avoid recreation)
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

// Home icon SVG component
const HomeIcon = ({ size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

// Gear icon SVG component
const GearIcon = ({ size = 20 }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

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

  // CO% — Unified from Double-Out reps AND Solo 501 checkouts
  const doSessions = sessions.filter(s => s.mode === 'double-out');
  const doTotal = doSessions.reduce((sum, s) => sum + s.totalAttempts, 0);
  const doSuccesses = doSessions.reduce((sum, s) => sum + s.successes, 0);

  const s501Sessions = sessions.filter(s => s.mode === 'solo-501' && s.checkoutAttempts);
  const s501Total = s501Sessions.reduce((sum, s) => sum + s.checkoutAttempts, 0);
  const s501Successes = s501Sessions.reduce((sum, s) => sum + s.checkoutSuccesses, 0);

  const coTotal = doTotal + s501Total;
  const coSuccesses = doSuccesses + s501Successes;
  const checkoutPct = coTotal > 0 ? Math.round((coSuccesses / coTotal) * 100) : '-';

  // 3DA: Solo 501 only, weighted by darts thrown
  const solo501Sessions = sessions.filter(s => s.mode === 'solo-501' && s.darts > 0);
  const s501TotalDarts = solo501Sessions.reduce((sum, s) => sum + s.darts, 0);
  const unified3DA = s501TotalDarts > 0
    ? ((501 * solo501Sessions.length / s501TotalDarts) * 3).toFixed(1)
    : '-';

  // Unified MPR (from Trips + Cricket)
  const tripsSessions = sessions.filter(s => s.mode === 'triples');
  const tripsMarks = tripsSessions.reduce((sum, s) => sum + (parseFloat(s.avgRounds) * s.totalAttempts), 0);
  const tripsRounds = tripsSessions.reduce((sum, s) => sum + s.totalAttempts, 0);

  const cricketSessions = sessions.filter(s => s.mode === 'cricket');
  const cricketMarks = cricketSessions.reduce((sum, s) => sum + (s.totalMarks || 21), 0);
  const cricketRounds = cricketSessions.reduce((sum, s) => sum + (s.throws / 3), 0);

  const totalMarks = tripsMarks + cricketMarks;
  const totalRounds = tripsRounds + cricketRounds;
  const unifiedMPR = totalRounds > 0 ? (totalMarks / totalRounds).toFixed(2) : '-';

  return { doubleInPct, checkoutPct, unified3DA, unifiedMPR };
};

// Calculate session counts by mode (single pass)
const calculateSessionCounts = (sessions) => {
  const counts = {
    'double-in': 0,
    'double-out': 0,
    'triples': 0,
    'first-9': 0,
    'solo-501': 0,
    'cricket': 0
  };
  
  for (const s of sessions) {
    if (counts.hasOwnProperty(s.mode)) {
      counts[s.mode]++;
    }
  }
  
  return counts;
};

// Render a session row
const SessionRow = ({ s }) => {
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
    <div className="flex items-center justify-between py-2 border-b border-gray-800">
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
};

export const History = ({ onBack }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmStep, setConfirmStep] = useState(false);
  const [namePromptOpen, setNamePromptOpen] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const settingsRef = useRef(null);
  const fileInputRef = useRef(null);
  const repsSessions = useSessionStore(state => state.repsSessions);
  const soloSessions = useSessionStore(state => state.soloSessions);
  const clearSessions = useSessionStore(state => state.clearSessions);
  const importSessions = useSessionStore(state => state.importSessions);
  const showStatus = useAppStore(state => state.showStatus);
  const playerName = useAppStore(state => state.playerName);
  const playerTeam = useAppStore(state => state.playerTeam);
  const nameDeclined = useAppStore(state => state.nameDeclined);
  const setPlayerInfo = useAppStore(state => state.setPlayerInfo);
  const declineName = useAppStore(state => state.declineName);

  // Close settings dropdown on outside tap
  useEffect(() => {
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsOpen(false);
        setConfirmStep(false);
      }
    };
    if (settingsOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [settingsOpen]);

  // Combined sessions for unified metrics
  const allSessions = useMemo(() => [...repsSessions, ...soloSessions], [repsSessions, soloSessions]);

  // Memoized calculations (from combined data)
  const metrics = useMemo(() => calculateUnifiedMetrics(allSessions), [allSessions]);
  const totalDarts = useMemo(() => calculateTotalDarts(allSessions), [allSessions]);
  const sessionCounts = useMemo(() => calculateSessionCounts(allSessions), [allSessions]);

  // Share flow
  const handleShareTap = () => {
    if (!playerName && !nameDeclined) {
      setNamePromptOpen(true);
    } else {
      setSharePreviewOpen(true);
    }
  };

  const handleNameSubmit = (name, team) => {
    setPlayerInfo(name, team || null);
    setNamePromptOpen(false);
    setSharePreviewOpen(true);
  };

  const handleNameSkip = () => {
    declineName();
    setNamePromptOpen(false);
    setSharePreviewOpen(true);
  };

  const handleClearAll = () => {
    clearSessions();
    setSettingsOpen(false);
    setConfirmStep(false);
    showStatus('🧹 All data cleared');
  };

  const handleExport = () => {
    const exportData = {
      version: '1.0',
      app: 'wb4darts',
      exportDate: new Date().toISOString(),
      sessions: {
        reps: repsSessions,
        solo: soloSessions
      }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wb4darts-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSettingsOpen(false);
    showStatus('📦 Data exported');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.app !== 'wb4darts' || !data.sessions) {
          showStatus('❌ Invalid file format');
          return;
        }
        const reps = Array.isArray(data.sessions.reps) ? data.sessions.reps : [];
        const solo = Array.isArray(data.sessions.solo) ? data.sessions.solo : [];
        if (reps.length === 0 && solo.length === 0) {
          showStatus('❌ No session data found');
          return;
        }
        importSessions(reps, solo);
        setSettingsOpen(false);
        showStatus(`✅ Imported ${reps.length + solo.length} sessions`);
      } catch {
        showStatus('❌ Could not read file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      {/* History Header with Gear */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-pink-400">HISTORY</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={onBack}
            className="p-2 rounded-lg transition-all text-gray-500 hover:text-gray-300"
          >
            <HomeIcon size={22} />
          </button>
          <div className="relative" ref={settingsRef}>
          <button
            onClick={() => {
              setSettingsOpen(!settingsOpen);
              setConfirmStep(false);
            }}
            className={`p-2 rounded-lg transition-all ${
              settingsOpen ? 'text-pink-400 bg-gray-800' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <GearIcon size={22} />
          </button>

          {/* Settings Dropdown */}
          {settingsOpen && (
            <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-50"
              style={{ minWidth: '200px' }}
            >
              {!confirmStep ? (
                <div>
                  <button
                    onClick={handleExport}
                    className="w-full text-left px-4 py-3 text-gray-300 text-sm font-semibold hover:bg-gray-800 rounded-t-lg transition-colors"
                  >
                    Export data
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full text-left px-4 py-3 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors"
                  >
                    Import data
                  </button>
                  <button
                    onClick={() => setConfirmStep(true)}
                    className="w-full text-left px-4 py-3 text-red-400 text-sm font-semibold hover:bg-gray-800 rounded-b-lg transition-colors border-t border-gray-800"
                  >
                    Clear all data
                  </button>
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-gray-300 text-sm mb-3">Delete all session history?</p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearAll}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2 rounded-md transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmStep(false)}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-semibold py-2 rounded-md transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Session Counts */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-gray-800">
        <div className="flex items-baseline justify-between mb-3">
          <h3 className="text-lg font-bold text-pink-400">SESSIONS</h3>
          <span className="text-xs text-gray-500">{totalDarts.toLocaleString()} darts</span>
        </div>
        <div className="grid grid-cols-6 gap-2 text-center">
          <div>
            <div className="text-xl font-bold text-blue-400">
              {sessionCounts['double-in']}
            </div>
            <div className="text-xs text-gray-400">DI</div>
          </div>
          <div>
            <div className="text-xl font-bold text-green-400">
              {sessionCounts['double-out']}
            </div>
            <div className="text-xs text-gray-400">DO</div>
          </div>
          <div>
            <div className="text-xl font-bold text-purple-400">
              {sessionCounts['triples']}
            </div>
            <div className="text-xs text-gray-400">TR</div>
          </div>
          <div>
            <div className="text-xl font-bold text-orange-400">
              {sessionCounts['first-9']}
            </div>
            <div className="text-xs text-gray-400">F9</div>
          </div>
          <div>
            <div className="text-xl font-bold text-yellow-400">
              {sessionCounts['solo-501']}
            </div>
            <div className="text-xs text-gray-400">S01</div>
          </div>
          <div>
            <div className="text-xl font-bold text-pink-400">
              {sessionCounts['cricket']}
            </div>
            <div className="text-xs text-gray-400">SC</div>
          </div>
        </div>
      </div>

      {/* Universal Metrics — with Share button */}
      <div className="bg-gray-900 rounded-lg p-4 mb-6 border-2 border-yellow-500">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-pink-400">YOUR METRICS</h3>
          <ShareButton onClick={handleShareTap} />
        </div>
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
              {metrics.checkoutPct}{metrics.checkoutPct !== '-' && '%'}
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

      {/* Reps Session History */}
      {repsSessions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 text-pink-400">REPS SESSIONS</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {repsSessions.map((s) => <SessionRow key={s.id} s={s} />)}
          </div>
        </div>
      )}

      {/* Solo Session History */}
      {soloSessions.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3 text-pink-400">SOLO SESSIONS</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {soloSessions.map((s) => <SessionRow key={s.id} s={s} />)}
          </div>
        </div>
      )}

      {/* Empty state (only if both are empty) */}
      {repsSessions.length === 0 && soloSessions.length === 0 && (
        <div className="bg-gray-900 rounded-lg p-8 text-center mb-6 border border-gray-800">
          <p className="text-gray-400 text-sm">
            No sessions yet. Complete a training session to see it here!
          </p>
        </div>
      )}

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />

      {/* Share flow overlays */}
      <NamePromptOverlay
        isOpen={namePromptOpen}
        onSubmit={handleNameSubmit}
        onSkip={handleNameSkip}
      />

      <SharePreviewOverlay
        isOpen={sharePreviewOpen}
        onClose={() => setSharePreviewOpen(false)}
        metrics={metrics}
        playerName={playerName}
        playerTeam={playerTeam}
        totalDarts={totalDarts}
      />
    </>
  );
};
