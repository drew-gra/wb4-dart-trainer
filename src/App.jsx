import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useSessionStore, useAppStore } from './store/gameStore';
import { trackEvent } from './utils/analytics';
import { REPS_MODES, SOLO_MODES } from './utils/constants';
import { DoubleIn, DoubleOut, Triples, First9, Cricket, Solo501, History, Insights } from './components/modes';
import MainMenu from './components/ui/MainMenu';

const App = () => {
  const currentMode = useAppStore(state => state.currentMode);
  const setMode = useAppStore(state => state.setMode);
  const saveStatus = useAppStore(state => state.saveStatus);
  const loadSessions = useSessionStore(state => state.loadSessions);
  const loadPlayerInfo = useAppStore(state => state.loadPlayerInfo);

  // Load sessions + player info on mount
  useEffect(() => {
    loadSessions();
    loadPlayerInfo();
  }, []);

  const handleModeChange = (mode) => {
    setMode(mode);
    trackEvent('Mode Changed', { mode });
  };

  // Determine which category the current mode belongs to
  const isRepsMode = REPS_MODES.some(m => m.id === currentMode);
  const isSoloMode = SOLO_MODES.some(m => m.id === currentMode);

  const renderModeContent = () => {
    switch (currentMode) {
      case 'double-in': return <DoubleIn />;
      case 'double-out': return <DoubleOut />;
      case 'triples': return <Triples />;
      case 'first-9': return <First9 />;
      case 'cricket': return <Cricket />;
      case 'solo-501': return <Solo501 />;
      case 'history': return <History onBack={() => handleModeChange(null)} />;
      case 'insights': return <Insights onBack={() => handleModeChange(null)} />;
      default: return null;
    }
  };

  const renderTabNavigation = () => {
    if (isRepsMode) {
      return (
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 flex-1">
              {REPS_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={`flex-1 py-3 px-2 rounded-md text-xs font-bold transition-all duration-300 ${
                    currentMode === mode.id 
                      ? 'text-black shadow-lg transform scale-105' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  style={currentMode === mode.id 
                    ? { background: 'linear-gradient(45deg, #ffd700, #ffed4a)' }
                    : { background: 'transparent' }
                  }
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleModeChange(null)}
              className="p-3 rounded-lg text-gray-400 hover:text-gray-200 bg-gray-900 border border-gray-800 transition-all"
            >
              ⌂
            </button>
          </div>
        </div>
      );
    }
    
    if (isSoloMode) {
      return (
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800 flex-1">
              {SOLO_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeChange(mode.id)}
                  className={`flex-1 py-3 px-2 rounded-md text-xs font-bold transition-all duration-300 ${
                    currentMode === mode.id 
                      ? 'text-black shadow-lg transform scale-105' 
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                  style={currentMode === mode.id 
                    ? { background: 'linear-gradient(45deg, #ffd700, #ffed4a)' }
                    : { background: 'transparent' }
                  }
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => handleModeChange(null)}
              className="p-3 rounded-lg text-gray-400 hover:text-gray-200 bg-gray-900 border border-gray-800 transition-all"
            >
              ⌂
            </button>
          </div>
        </div>
      );
    }
    
    return null;
  };

  return (
    <div 
      className="min-h-screen bg-black text-white p-4"
      style={{ background: 'linear-gradient(135deg, #000000 0%, #1a1a1a 100%)' }}
    >
      <div className="max-w-md mx-auto">
        {/* Main Menu */}
        {currentMode === null && (
          <MainMenu onModeChange={handleModeChange} />
        )}

        {/* Tab Navigation for Reps/Solo modes */}
        {renderTabNavigation()}

        {/* Mode Content */}
        {renderModeContent()}

        {/* Save Status */}
        {saveStatus && (
          <div className="bg-gray-900 rounded-lg p-4 mb-8 border border-gray-800">
            <div className="text-xs text-center text-yellow-300 font-semibold">
              {saveStatus}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 mb-12">
          <div className="text-4xl" style={{ letterSpacing: '0.5em' }}>🤜👈</div>
        </div>
        <div className="text-center text-yellow-400 text-xs font-semibold leading-tight">
          <p>All rights reserved.</p>
        </div>
      </div>
      <Analytics />
    </div>
  );
};

export default App;