import React, { useState } from 'react';

const PURPLE_GRADIENT = {
  background: 'linear-gradient(145deg, #7c3aed, #5b21b6)'
};

/**
 * Parse calculator display into total
 * Supports: "60", "60+45", "20×3"
 */
const parseDisplay = (display) => {
  if (!display) return 0;
  if (display.includes('×')) {
    const parts = display.split('×');
    if (parts.length === 2 && parts[0] && parts[1]) {
      return parseInt(parts[0]) * parseInt(parts[1]);
    }
    return parseInt(parts[0]) || 0;
  }
  const parts = display.split('+').map(p => parseInt(p.trim()) || 0);
  return parts.reduce((sum, n) => sum + n, 0);
};

/**
 * ScoreInput - Collapsible calculator for score entry
 * 
 * @param {boolean} isOpen - Whether calculator is expanded
 * @param {function} onToggle - Toggle open/closed
 * @param {function} onScore - Callback when score is submitted: (score) => void
 * @param {function} onBust - Callback when bust/missed is pressed
 * @param {function} onBack - Callback for back/undo functionality
 * @param {boolean} canUndo - Whether there's history to undo
 * @param {string} mode - 'solo501' | 'first9' | 'double-in'
 */
export const ScoreInput = ({ 
  isOpen, 
  onToggle, 
  onScore, 
  onBust,
  onBack,
  canUndo = false,
  mode = 'solo501'
}) => {
  const [display, setDisplay] = useState('');

  const currentTotal = parseDisplay(display);
  const hasInput = display.length > 0;

  const handleNumber = (num) => {
    const newDisplay = display + String(num);
    if (parseDisplay(newDisplay) > 180) return;
    setDisplay(newDisplay);
  };

  const handlePlus = () => {
    if (!display || display.endsWith('+') || display.includes('×')) return;
    setDisplay(prev => prev + '+');
  };

  const handleTimes = () => {
    if (!display || display.includes('+') || display.includes('×')) return;
    setDisplay(prev => prev + '×');
  };

  const handleBack = () => {
    if (display) {
      setDisplay(prev => prev.slice(0, -1));
    } else if (canUndo) {
      onBack();
    }
  };

  const handleScore = (value) => {
    const score = value || currentTotal;
    if (score === 0) return;
    onScore(score);
    setDisplay('');
  };

  const handleBust = () => {
    if (onBust) {
      onBust();
      setDisplay('');
    }
  };

  const handleZero = () => {
    handleNumber(0);
  };

  const btnBase = "py-4 text-xl font-bold text-white";
  const grayBg = "bg-gray-800 active:bg-gray-700";

  // Mode checks
  const isSolo501 = mode === 'solo501';
  const isDoubleIn = mode === 'double-in';
  const showBustButton = isSolo501 || isDoubleIn;
  const bustLabel = isDoubleIn ? 'Missed' : 'Bust';

  return (
    <div>
      {/* Collapse Toggle */}
      <div className="flex justify-center">
        <button 
          onClick={onToggle}
          className="py-3 px-6 text-yellow-400"
        >
          <span className="text-3xl">{isOpen ? '↑' : '↓'}</span>
        </button>
      </div>

      {/* Calculator (collapsible) */}
      {isOpen && (
        <div className="bg-gray-900 rounded-lg border border-gray-800">
          {/* Header Row: Back | Display | Score */}
          <div className="grid grid-cols-3 text-center border-b border-gray-700">
            <button 
              onClick={handleBack} 
              className={`${btnBase} ${grayBg}`}
            >
              Back
            </button>
            <div className={`py-4 ${grayBg} flex items-center justify-center`}>
              <span className="text-xl font-bold text-white">
                {display || '0'}
              </span>
              {hasInput && (display.includes('+') || display.includes('×')) && (
                <span className="text-sm text-gray-400 ml-1">={currentTotal}</span>
              )}
            </div>
            <button 
              onClick={() => handleScore()} 
              disabled={!hasInput}
              className={`${btnBase} ${!hasInput ? grayBg + ' text-gray-600' : ''}`}
              style={hasInput ? PURPLE_GRADIENT : {}}
            >
              Score
            </button>
          </div>
          
          {/* Number Pad */}
          <div className="grid grid-cols-3 text-center">
            {[1,2,3,4,5,6,7,8,9].map(n => (
              <button 
                key={n} 
                onClick={() => handleNumber(n)} 
                className={`${btnBase} ${grayBg} border-b border-r border-gray-700`}
              >
                {n}
              </button>
            ))}
            
            {/* Dynamic Bottom Row */}
            {hasInput ? (
              <>
                <button onClick={handleTimes} className={`${btnBase} ${grayBg} border-r border-gray-700`}>×</button>
                <button onClick={handleZero} className={`${btnBase} ${grayBg} border-r border-gray-700`}>0</button>
                <button onClick={handlePlus} className={`${btnBase} ${grayBg}`}>+</button>
              </>
            ) : (
              <>
                <button className={`${btnBase} ${grayBg} border-r border-gray-700 cursor-default`}>🤜</button>
                {showBustButton ? (
                  <button onClick={handleBust} className={`${btnBase} ${grayBg} border-r border-gray-700`}>{bustLabel}</button>
                ) : (
                  <button onClick={handleZero} className={`${btnBase} ${grayBg} border-r border-gray-700`}>0</button>
                )}
                <button className={`${btnBase} ${grayBg} cursor-default`}>👈</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};