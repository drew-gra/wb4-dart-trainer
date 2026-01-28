import React, { useState, useMemo } from 'react';
import { HotRow } from './HotRow';
import { isValidThreeDartScore } from '../../utils/scoring';
import { GOLD_GRADIENT } from '../../utils/constants';

// Parse display string to get total
const parseDisplay = (display) => {
  if (!display) return 0;
  const parts = display.split('+').map(p => parseInt(p.trim()) || 0);
  return parts.reduce((sum, n) => sum + n, 0);
};

export const ScoreInput = ({ 
  onScore,
  onBust,
  onMiss,
  onHotRowScore,
  hotRowScores = [],
  checkout = null,
  mode = 'first9',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('');

  const currentTotal = useMemo(() => parseDisplay(display), [display]);
  const hasInput = display.length > 0;
  const isValid = hasInput && isValidThreeDartScore(currentTotal);

  // Mode-specific: what does the right button do when there's no input?
  const showBust = mode === 'solo501' && onBust;
  const showMiss = (mode === 'double-in' || mode === 'double-out') && onMiss;

  const handleOpen = () => {
    if (!disabled) setIsOpen(true);
  };

  const handleBack = () => {
    setIsOpen(false);
    setDisplay('');
  };

  const handleUndo = () => {
    if (!display) return;
    // Remove last character (digit or +)
    setDisplay(prev => prev.slice(0, -1));
  };

  const handleNumberPress = (num) => {
    if (display.length >= 11) return;
    
    const newDisplay = display + String(num);
    const newTotal = parseDisplay(newDisplay);
    
    // Block if it would exceed 180
    if (newTotal > 180) return;
    
    setDisplay(newDisplay);
  };

  const handlePlus = () => {
    if (!display || display.endsWith('+')) return;
    setDisplay(prev => prev + '+');
  };

  const handleEnter = () => {
    if (!isValid) return;
    onScore(currentTotal);
    setDisplay('');
  };

  const handleMissOrBust = () => {
    if (showBust && onBust) {
      onBust();
    } else if (showMiss && onMiss) {
      onMiss();
    }
    setDisplay('');
  };

  const handleHotRowSelect = (score, isCheckout) => {
    if (onHotRowScore) {
      onHotRowScore(score, isCheckout);
      setDisplay('');
      setIsOpen(false);
    }
  };

  // Collapsed state — minimal prompt
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full py-4 flex items-center justify-center gap-2 transition-all ${
          disabled 
            ? 'text-gray-600 cursor-not-allowed'
            : 'text-yellow-400 hover:text-yellow-300'
        }`}
      >
        <span className="text-2xl">▼</span>
        <span className="text-sm font-medium">Score</span>
      </button>
    );
  }

  // Validation state
  const isInvalid = hasInput && !isValidThreeDartScore(currentTotal);

  // Expanded state
  return (
    <div className="bg-gray-900 rounded-t-xl border border-gray-700 border-b-0 overflow-hidden">
      {/* Header Row: BACK/UNDO | Display | MISS/ENTER */}
      <div className="flex items-center border-b border-gray-700">
        {/* Left button: BACK or UNDO */}
        <button
          onClick={hasInput ? handleUndo : handleBack}
          className="w-20 py-3 text-center font-bold text-sm bg-yellow-500 text-black"
        >
          {hasInput ? 'UNDO' : 'BACK'}
        </button>

        {/* Center: Score display */}
        <div className="flex-1 py-3 text-center">
          <div 
            className="text-2xl font-black"
            style={hasInput && isValid ? GOLD_GRADIENT : { color: isInvalid ? '#ef4444' : '#666' }}
          >
            {hasInput ? currentTotal : '0'}
          </div>
          {hasInput && display.includes('+') && (
            <div className="text-xs text-gray-500">{display}</div>
          )}
          {isInvalid && (
            <div className="text-xs text-red-400">Not possible</div>
          )}
        </div>

        {/* Right button: MISS/BUST or ENTER */}
        {hasInput ? (
          <button
            onClick={handleEnter}
            disabled={!isValid}
            className={`w-20 py-3 text-center font-bold text-sm ${
              isValid 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            ENTER
          </button>
        ) : (showBust || showMiss) ? (
          <button
            onClick={handleMissOrBust}
            className="w-20 py-3 text-center font-bold text-sm bg-red-600 text-white"
          >
            {showBust ? 'BUST' : 'MISS'}
          </button>
        ) : (
          <div className="w-20 py-3 bg-gray-800" />
        )}
      </div>

      {/* Number Pad */}
      <div className="grid grid-cols-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberPress(num)}
            className="py-5 text-xl font-bold text-white bg-gray-800 border-b border-r border-gray-700 active:bg-gray-700 transition-colors"
          >
            {num}
          </button>
        ))}
        
        {/* Bottom row: +, 0, C */}
        <button
          onClick={handlePlus}
          className="py-5 text-xl font-bold text-blue-400 bg-gray-800 border-b border-r border-gray-700 active:bg-gray-700 transition-colors"
        >
          +
        </button>
        <button
          onClick={() => handleNumberPress(0)}
          className="py-5 text-xl font-bold text-white bg-gray-800 border-b border-r border-gray-700 active:bg-gray-700 transition-colors"
        >
          0
        </button>
        <button
          onClick={() => setDisplay('')}
          className="py-5 text-xl font-bold text-red-400 bg-gray-800 border-b border-gray-700 active:bg-gray-700 transition-colors"
        >
          C
        </button>
      </div>

      {/* Hot Row */}
      <div className="p-3 bg-gray-900">
        <HotRow 
          scores={hotRowScores} 
          onSelect={handleHotRowSelect}
          checkout={checkout}
        />
      </div>
    </div>
  );
};
