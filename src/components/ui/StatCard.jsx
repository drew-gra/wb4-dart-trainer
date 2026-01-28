import React from 'react';
import { GOLD_GRADIENT } from '../../utils/constants';

/**
 * Individual stat display
 */
export const StatItem = ({ value, label, color = 'yellow', useGradient = false }) => {
  const colors = {
    yellow: 'text-yellow-400',
    green: 'text-green-400',
    red: 'text-red-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    pink: 'text-pink-400',
    white: 'text-white'
  };

  return (
    <div className="text-center">
      <div 
        className={`text-2xl font-bold ${useGradient ? '' : colors[color]}`}
        style={useGradient ? GOLD_GRADIENT : {}}
      >
        {value}
      </div>
      <div className="text-xs text-gray-300 font-medium">{label}</div>
    </div>
  );
};

/**
 * Stats container card
 */
export const StatsCard = ({ title, children }) => (
  <div className="bg-gray-900 rounded-lg p-4 mb-8 border border-gray-800">
    <h3 className="text-lg font-bold mb-3 text-pink-400">{title}</h3>
    <div className="grid grid-cols-2 gap-4">
      {children}
    </div>
  </div>
);

/**
 * Recent attempts/games list
 */
export const RecentList = ({ title, items, renderItem }) => {
  if (!items || items.length === 0) return null;
  
  return (
    <div className="bg-gray-900 rounded-lg p-4 mb-8 border border-gray-800">
      <h3 className="text-lg font-bold mb-3 text-pink-400">{title}</h3>
      <div className="space-y-2 max-h-40 overflow-y-auto">
        {items.slice(0, 10).map((item, i) => (
          <div key={i} className="flex justify-between items-center text-sm bg-gray-800 p-2 rounded">
            {renderItem(item, i)}
          </div>
        ))}
      </div>
    </div>
  );
};
