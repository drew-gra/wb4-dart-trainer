import React from 'react';
import { GOLD_GRADIENT } from '../../utils/constants';

/**
 * Large target display shown during training modes
 */
export const TargetDisplay = ({ target, prefix = '', subtitle }) => (
  <div 
    className="bg-gray-900 rounded-lg p-8 text-center mb-8 shadow-2xl border-2 border-yellow-500"
    style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}
  >
    <div className="text-6xl font-black mb-4" style={GOLD_GRADIENT}>
      {target ? `${prefix}${target}` : '...'}
    </div>
    {subtitle && <p className="text-gray-400 text-sm">{subtitle}</p>}
  </div>
);

/**
 * Score input variant for Double-In mode
 */
export const ScoreInputDisplay = ({ value, onChange }) => (
  <div 
    className="bg-gray-900 rounded-lg p-8 text-center mb-8 shadow-2xl border-2 border-yellow-500"
    style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}
  >
    <div className="text-5xl font-black mb-6" style={GOLD_GRADIENT}>GET IN</div>
    <p className="text-gray-400 text-sm mb-6">
      You have three darts to get in. Hit any double and enter your score.
    </p>
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-3xl font-bold text-center bg-gray-800 text-yellow-400 rounded p-3 w-32 border-2 border-yellow-500 focus:border-yellow-300 focus:outline-none"
      min="2"
      max="170"
      inputMode="numeric"
    />
  </div>
);
