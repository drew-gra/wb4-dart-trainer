import React from 'react';
import { DEFAULT_HOT_SCORES, buildHotRowDisplay } from '../../utils/hotrow';

/**
 * HotRow - Quick-tap score entry shortcuts
 * 
 * @param {number[]} scores - 5 scores from getHotRowScores()
 * @param {function} onSelect - Callback: (score, isCheckout) => void
 * @param {number|null} checkout - Remaining score if valid checkout
 */
export const HotRow = ({ 
  scores = DEFAULT_HOT_SCORES, 
  onSelect,
  checkout = null,
}) => {
  const displayScores = buildHotRowDisplay(scores, checkout);

  return (
    <div className="flex justify-between items-center px-2 py-1">
      {displayScores.map((score, i) => {
        const isCheckoutButton = checkout && i === 2;
        
        return (
          <button
            key={i}
            onClick={() => onSelect(score, isCheckoutButton)}
            className={`font-bold text-lg transition-all py-2 px-3 min-w-[44px] rounded-lg ${
              isCheckoutButton
                ? 'bg-gradient-to-r from-yellow-500 to-yellow-400 text-black shadow-lg'
                : 'text-yellow-400 hover:text-yellow-200 active:scale-95'
            }`}
          >
            {score}
          </button>
        );
      })}
    </div>
  );
};
