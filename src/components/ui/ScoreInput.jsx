import React, { useState } from 'react';

const GOLD_GRADIENT_BG = {
  background: 'linear-gradient(135deg, #f59e0b, #fcd34d)'
};

// Parse display as a sum of terms. Each term is either "N" or "N×M".
// Examples: "60"=60, "20+5"=25, "20×3"=60, "20×3+20×2+20"=120.
// Incomplete terms (trailing operator or pending ×) contribute 0.
const parseDisplay = (display) => {
  if (!display) return 0;
  return display.split('+').reduce((sum, term) => {
    if (!term) return sum;
    if (term.includes('×')) {
      const [a, b] = term.split('×');
      return sum + (parseInt(a) || 0) * (parseInt(b) || 0);
    }
    return sum + (parseInt(term) || 0);
  }, 0);
};

/**
 * ScoreInput - Unified calculator keypad for DI, F9, and 501.
 *
 * Two visual states, same footprint:
 *   Empty  : [Undo] [display] [Miss]  / 1-9 / [ ] [0] [ ]
 *   Active : [Undo] [display] [Score] / 1-9 / [×] [0] [+]
 *
 * The Undo button is a char-backspace when there is input, and undoes the
 * last committed turn (via onBack) when the display is empty.
 *
 * When isOpen is false, only the toggle arrow renders; the calc unmounts so
 * elements below (e.g. HotRow) slide up into the freed space.
 */
export const ScoreInput = ({
  isOpen,
  onToggle,
  onScore,
  onMiss,
  onBack,
  canUndo = false
}) => {
  const [display, setDisplay] = useState('');

  const currentTotal = parseDisplay(display);
  const hasInput = display.length > 0;
  const lastChar = display.slice(-1);
  const endsWithDigit = /\d/.test(lastChar);
  const currentTerm = display.split('+').pop();
  const canScore = hasInput && endsWithDigit && currentTotal > 0;

  const handleNumber = (num) => {
    const newDisplay = display + String(num);
    if (parseDisplay(newDisplay) > 180) return;
    setDisplay(newDisplay);
  };

  const handlePlus = () => {
    if (!endsWithDigit) return;
    setDisplay(prev => prev + '+');
  };

  const handleTimes = () => {
    if (!endsWithDigit || currentTerm.includes('×')) return;
    setDisplay(prev => prev + '×');
  };

  const handleUndo = () => {
    if (hasInput) {
      setDisplay(prev => prev.slice(0, -1));
    } else if (canUndo) {
      onBack();
    }
  };

  const handleScore = () => {
    if (!canScore) return;
    onScore(currentTotal);
    setDisplay('');
  };

  const handleMiss = () => {
    if (onMiss) {
      onMiss();
      setDisplay('');
    }
  };

  const btnBase = "py-4 text-xl font-bold text-white";
  const grayBg = "bg-[#252a3a] active:bg-[#2a2f42]";
  const undoEnabled = hasInput || canUndo;

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

      {/* Calculator — only rendered when open, so content below slides up when closed */}
      {isOpen && (
      <div className="bg-[#1c1f2e] rounded-lg border border-[#2a2f42]">
        {/* Header Row: Undo | Display | Miss or Score */}
        <div className="grid grid-cols-3 text-center border-b border-[#2a2f42]">
          <button
            onClick={handleUndo}
            disabled={!undoEnabled}
            className={`${btnBase} ${grayBg} ${!undoEnabled ? 'text-gray-600' : ''}`}
          >
            Undo
          </button>
          <div className={`py-4 ${grayBg} flex items-center justify-center`}>
            <span className="text-xl font-bold text-white">
              {display || '0'}
            </span>
            {hasInput && (display.includes('+') || display.includes('×')) && (
              <span className="text-sm text-slate-400 ml-1">={currentTotal}</span>
            )}
          </div>
          {hasInput ? (
            <button
              onClick={handleScore}
              disabled={!canScore}
              className={`${btnBase} ${canScore ? 'text-black' : grayBg + ' text-gray-600'}`}
              style={canScore ? GOLD_GRADIENT_BG : {}}
            >
              Score
            </button>
          ) : (
            <button
              onClick={handleMiss}
              className={`${btnBase} ${grayBg}`}
            >
              Miss
            </button>
          )}
        </div>

        {/* Number Pad 1-9 */}
        <div className="grid grid-cols-3 text-center">
          {[1,2,3,4,5,6,7,8,9].map(n => (
            <button
              key={n}
              onClick={() => handleNumber(n)}
              className={`${btnBase} ${grayBg} border-b border-r border-[#2a2f42]`}
            >
              {n}
            </button>
          ))}

          {/* Bottom Row: ×/blank | 0 | +/blank */}
          {hasInput ? (
            <button onClick={handleTimes} className={`${btnBase} ${grayBg} border-r border-[#2a2f42]`}>×</button>
          ) : (
            <div className={`${btnBase} ${grayBg} border-r border-[#2a2f42]`}>&nbsp;</div>
          )}
          <button
            onClick={() => handleNumber(0)}
            className={`${btnBase} ${grayBg} border-r border-[#2a2f42]`}
          >
            0
          </button>
          {hasInput ? (
            <button onClick={handlePlus} className={`${btnBase} ${grayBg}`}>+</button>
          ) : (
            <div className={`${btnBase} ${grayBg}`}>&nbsp;</div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
