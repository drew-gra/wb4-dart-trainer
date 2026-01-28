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
  onScore,           // (score: number) => void - called when score is submitted
  onBust,            // () => void - optional, for Solo501
  onMiss,            // () => void - optional, for Double modes
  onHotRowScore,     // (score: number, isCheckout?: boolean) => void - for hot row selections
  hotRowScores = [], // number[] - scores to show in hot row
  checkout = null,   // number | null - if set, shows checkout button in hot row
  mode = 'first9',   // 'first9' | 'solo501' | 'double-in' | 'double-out'
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [display, setDisplay] = useState('');

  const currentTotal = useMemo(() => parseDisplay(display), [display]);
  const hasInput = display.length > 0;
  const isValid = hasInput && isValidThreeDartScore(currentTotal);

  // Determine which contextual buttons to show
  const showBust = mode === 'solo501' && onBust;
  const showMiss = (mode === 'double-in' || mode === 'double-out') && onMiss;

  const handleOpen = () => {
    if (!disabled) {
      setIsOpen(true);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setDisplay('');
  };

  const handleNumberPress = (num) => {
    if (display.length >= 11) return;
    
    const newDisplay = display + String(num);
    const newTotal = parseDisplay(newDisplay);
    
    // Don't allow input that would make an impossible score
    // But allow partial input (e.g., "1" is fine even though final score might be invalid)
    if (newTotal > 180) return;
    
    setDisplay(newDisplay);
  };

  const handlePlus = () => {
    if (!display || display.endsWith('+')) return;
    setDisplay(prev => prev + '+');
  };

  const handleClear = () => {
    setDisplay('');
  };

  const handleSubmit = () => {
    if (!isValid) return;
    onScore(currentTotal);
    setDisplay('');
    setIsOpen(false);
  };

  const handleBust = () => {
    if (onBust) {
      onBust();
      setDisplay('');
      setIsOpen(false);
    }
  };

  const handleMiss = () => {
    if (onMiss) {
      onMiss();
      setDisplay('');
      setIsOpen(false);
    }
  };

  const handleHotRowSelect = (score, isCheckout) => {
    if (onHotRowScore) {
      onHotRowScore(score, isCheckout);
      setDisplay('');
      setIsOpen(false);
    }
  };

  // Collapsed view - tap to open
  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        disabled={disabled}
        className={`w-full py-6 rounded-xl border-2 border-dashed transition-all ${
          disabled 
            ? 'border-gray-700 text-gray-600 cursor-not-allowed'
            : 'border-yellow-500 text-yellow-400 hover:border-yellow-400 hover:bg-yellow-500/10 active:scale-98'
        }`}
      >
        <span className="text-lg font-bold">🧮 TAP TO SCORE</span>
      </button>
    );
  }

  // Validation message
  const getValidationMessage = () => {
    if (!hasInput) return null;
    if (currentTotal > 180) return 'Max score is 180';
    if (!isValidThreeDartScore(currentTotal)) return `${currentTotal} is not possible with 3 darts`;
    return null;
  };

  const validationMessage = getValidationMessage();

  // Expanded view
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Score Display with Submit/Close buttons */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-white p-2 -ml-2 text-xl"
          >
            ✕
          </button>
          <div className="flex-1 text-center">
            <div 
              className="text-3xl font-black min-h-[40px]"
              style={hasInput && isValid ? GOLD_GRADIENT : { color: hasInput ? '#ef4444' : '#666' }}
            >
              {hasInput ? display : '0'}
            </div>
            {hasInput && display.includes('+') && (
              <div className={`text-sm mt-1 ${isValid ? 'text-gray-400' : 'text-red-400'}`}>
                = {currentTotal}
              </div>
            )}
            {validationMessage && (
              <div className="text-xs text-red-400 mt-1">
                {validationMessage}
              </div>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`p-2 -mr-2 text-xl transition-all ${
              isValid
                ? 'text-green-400 hover:text-green-300'
                : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            ✓
          </button>
        </div>
      </div>

      {/* Number Pad */}
      <div className="p-3 border-b border-gray-800">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberPress(num)}
              className="py-4 rounded-lg font-bold text-xl bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-600 transition-all"
            >
              {num}
            </button>
          ))}
          
          {/* Bottom row: contextual left button, 0, + */}
          {showBust ? (
            <button
              onClick={handleBust}
              className="py-4 rounded-lg font-bold text-sm bg-red-600 text-white hover:bg-red-500 active:bg-red-400 transition-all"
            >
              💥 BUST
            </button>
          ) : showMiss ? (
            <button
              onClick={handleMiss}
              className="py-4 rounded-lg font-bold text-sm bg-red-600 text-white hover:bg-red-500 active:bg-red-400 transition-all"
            >
              ❌ MISS
            </button>
          ) : (
            <button
              onClick={handleClear}
              className="py-4 rounded-lg font-bold text-lg bg-gray-700 text-red-400 hover:bg-gray-600 active:bg-gray-500 transition-all"
            >
              C
            </button>
          )}
          
          <button
            onClick={() => handleNumberPress(0)}
            className="py-4 rounded-lg font-bold text-xl bg-gray-800 text-white hover:bg-gray-700 active:bg-gray-600 transition-all"
          >
            0
          </button>
          
          <button
            onClick={handlePlus}
            className="py-4 rounded-lg font-bold text-xl bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-400 transition-all"
          >
            +
          </button>
        </div>
        
        {/* Clear button when Bust/Miss is shown */}
        {(showBust || showMiss) && (
          <button
            onClick={handleClear}
            className="w-full mt-2 py-2 rounded-lg font-bold text-sm bg-gray-800 text-gray-400 hover:bg-gray-700 active:bg-gray-600 transition-all"
          >
            CLEAR
          </button>
        )}
      </div>

      {/* Hot Row */}
      <div className="p-3">
        <HotRow 
          scores={hotRowScores} 
          onSelect={handleHotRowSelect}
          checkout={checkout}
        />
      </div>
    </div>
  );
};