import React, { useState } from 'react';
import { MENU_CATEGORIES, GOLD_GRADIENT } from '../../utils/constants';

const MainMenu = ({ onModeChange }) => {
  const [aboutOpen, setAboutOpen] = useState(false);

  const handleCategoryClick = (category) => {
    if (category.disabled) return;
    onModeChange(category.defaultMode);
  };

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2" style={GOLD_GRADIENT}>
          WB4 Darts Practice App
        </h1>
      </div>

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
              {category.comingSoon && <span className="text-sm font-normal text-slate-400 ml-2">(Coming soon)</span>}
            </div>
          </button>
        ))}

        {/* About Section */}
        <div>
          <div className="flex justify-center">
            <button
              onClick={() => setAboutOpen(!aboutOpen)}
              className="py-3 px-6 text-yellow-400 flex flex-col items-center"
            >
              <span className="text-sm font-bold">ABOUT</span>
              <span className="text-3xl">{aboutOpen ? '↑' : '↓'}</span>
            </button>
          </div>

          {aboutOpen && (
            <div className="bg-[#1c1f2e] rounded-lg border border-[#2a2f42] p-5">
              <div className="text-sm text-gray-300 leading-relaxed space-y-4">
                <p>
                  This is a free darts practice app for solo play. It saves and provides analytics on your last 200 solo practice sessions across six modes:
                </p>
                <div className="text-yellow-400 font-semibold text-center space-y-2">
                  <p>Reps: double-in (DI) | double-out (DO) | triples (trips) | 501 first nine (F9)</p>
                  <p>Solo play: cricket | 501 straight-in</p>
                </div>
                <p>
                  No account is needed to use the app and all data is exportable. But if you switch devices or clear the browser memory, it will reset your session history.
                </p>
                <p>
                  Created at The Westbury Inn of the Park Slope Darts League.
                </p>
                <p>
                  business enquiries: wb4(at)breadandlaw(dot)com
                </p>
              </div>
            </div>
          )}
        </div>

        {/* History & Insights */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => onModeChange('history')}
            className="w-full py-4 px-6 rounded-lg font-bold text-base transition-all transform hover:scale-105 shadow-lg border-2 border-gray-300"
            style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
          >
            📊 HISTORY
          </button>
          <button
            onClick={() => onModeChange('insights')}
            className="w-full py-4 px-6 rounded-lg font-bold text-base transition-all transform hover:scale-105 shadow-lg border-2 border-gray-300"
            style={{ background: 'linear-gradient(145deg, #7c3aed, #5b21b6)' }}
          >
            💡 INSIGHTS
          </button>
        </div>
      </div>
    </>
  );
};

export default MainMenu;