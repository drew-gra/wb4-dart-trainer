import { useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useSessionStore, useAppStore } from './store/gameStore';
import { trackEvent } from './utils/analytics';
import { REPS_MODES, SOLO_MODES } from './utils/constants';
import { DoubleIn, DoubleOut, Triples, First9, Cricket, Solo501, History, Insights } from './components/modes';
import MainMenu from './components/ui/MainMenu';
import ModeTabBar from './components/ui/ModeTabBar';
import ErrorBoundary from './components/ui/ErrorBoundary';

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

  const tabModes = isRepsMode ? REPS_MODES : isSoloMode ? SOLO_MODES : null;

  return (
    <div
      className="min-h-screen flex flex-col text-white p-4"
      style={{ background: 'linear-gradient(135deg, #111114 0%, #1c1f2e 100%)' }}
    >
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        {/* Main Menu */}
        {currentMode === null && (
          <MainMenu onModeChange={handleModeChange} />
        )}

        {/* Tab Navigation for Reps/Solo modes */}
        {tabModes && (
          <ModeTabBar
            modes={tabModes}
            currentMode={currentMode}
            onModeChange={handleModeChange}
            onHome={() => handleModeChange(null)}
          />
        )}

        {/* Mode Content */}
        <ErrorBoundary onReset={() => handleModeChange(null)}>
          {renderModeContent()}
        </ErrorBoundary>

        {/* Save Status */}
        {saveStatus && (
          <div className="bg-[#1c1f2e] rounded-lg p-4 mb-8 border border-[#2a2f42]">
            <div className="text-xs text-center text-yellow-300 font-semibold">
              {saveStatus}
            </div>
          </div>
        )}

        {/* Footer - home screen only, anchored to bottom */}
        {currentMode === null && (
          <div className="text-center text-yellow-400 text-xs font-semibold leading-tight mt-auto pt-12">
            <p>© Bread & Law, LLC 2026. All rights reserved.</p>
          </div>
        )}
      </div>
      <Analytics />
    </div>
  );
};

export default App;