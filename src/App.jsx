import React, { useEffect } from 'react';
import { useSessionStore, useAppStore } from './store/gameStore';
import { trackEvent } from './utils/analytics';
import { MENU_CATEGORIES, REPS_MODES, SOLO_MODES, GOLD_GRADIENT } from './utils/constants';
import { DoubleIn, DoubleOut, Triples, First9, Cricket, Solo501, History, Insights } from './components/modes';
import { Button } from './components/ui/Button';

const App = () => {
  const currentMode = useAppStore(state => state.currentMode);
  const setMode = useAppStore(state => state.setMode);
  const saveStatus = useAppStore(state => state.saveStatus);
  const loadSessions = useSessionStore(state => state.loadSessions);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);



  const handleModeChange = (mode) => {
    setMode(mode);
    trackEvent('Mode Changed', { mode });
  };

  const handleCategoryClick = (category) => {
    if (category.disabled) return;
    handleModeChange(category.defaultMode);
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
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2" style={GOLD_GRADIENT}>
            WB4: A Darts Practice App
          </h1>
        </div>

        {/* Main Menu */}
        {currentMode === null && (
          <div className="space-y-4 mb-8">
            {/* Practice Categories */}
            {MENU_CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => handleCategoryClick(category)}
                disabled={category.disabled}
                className={`w-full py-6 px-6 rounded-lg text-center transition-all shadow-xl border-2 border-pink-400 ${
                  category.disabled 
                    ? 'cursor-not-allowed' 
                    : 'hover:border-pink-300 transform hover:scale-105'
                }`}
                style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}
              >
                <div 
                  className="text-2xl font-black"
                  style={GOLD_GRADIENT}
                >
                  {category.label}
                  {category.comingSoon && <span className="text-sm font-normal text-gray-400 ml-2">(Coming soon)</span>}
                </div>
              </button>
            ))}
            
            {/* Browser Storage Info */}
            <div className="pt-2">
              <p className="text-sm text-gray-300 text-center">
                Your practice history is saved to this device automatically. No account needed.
              </p>
            </div>

            {/* History & Insights */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={() => handleModeChange('history')}
                className="w-full py-4 px-6 rounded-lg font-bold text-base transition-all transform hover:scale-105 shadow-lg border-2 border-gray-300"
                style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
              >
                📊 HISTORY
              </button>
              <button
                onClick={() => handleModeChange('insights')}
                className="w-full py-4 px-6 rounded-lg font-bold text-base transition-all transform hover:scale-105 shadow-lg border-2 border-gray-300"
                style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
              >
                💡 INSIGHTS
              </button>
            </div>
          </div>
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
          <p>Developed at The Westbury Inn of the Park Slope Darts League.</p>
          <p>Flatbush vs. Everybody.</p>
          <p>All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default App;
