import React from 'react';
import { GOLD_GRADIENT } from '../../utils/constants';

/**
 * Reusable Overlay component for modals and prompts
 */
export const Overlay = ({ 
  isOpen, 
  onClose, 
  icon, 
  title, 
  subtitle, 
  children 
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg p-6 border-2 border-yellow-500 max-w-sm mx-4">
        <h2 className="text-2xl font-black text-center mb-2" style={GOLD_GRADIENT}>
          {icon} {title}
        </h2>
        {subtitle && (
          <p className="text-gray-400 text-center text-sm mb-6">
            {subtitle}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};

/**
 * Session Saved Overlay - shown after saving a session
 */
export const SessionSavedOverlay = ({ isOpen, onContinue }) => (
  <Overlay
    isOpen={isOpen}
    icon="🎯"
    title="SESSION SAVED"
    subtitle="Nice work. Take a breather if you need one."
  >
    <button
      onClick={onContinue}
      className="w-full py-4 rounded-lg font-bold text-lg bg-gray-700 text-white hover:bg-gray-600 border border-gray-600 transition-all"
    >
      Keep Practicing
    </button>
  </Overlay>
);

/**
 * Checkout Overlay - shown when player checks out in 501
 */
export const CheckoutOverlay = ({ isOpen, onSelect, minDarts = 1 }) => (
  <Overlay
    isOpen={isOpen}
    icon="🎯"
    title="YOU'RE OUT!"
    subtitle="Darts on final turn?"
  >
    <div className="grid grid-cols-3 gap-4">
      {[1, 2, 3].map((darts) => (
        <button
          key={darts}
          onClick={() => onSelect(darts)}
          disabled={darts < minDarts}
          className={`py-4 rounded-lg font-bold text-2xl transition-all ${
            darts < minDarts
              ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
              : 'bg-gray-700 text-white hover:bg-gray-600 border border-gray-600'
          }`}
        >
          {darts}
        </button>
      ))}
    </div>
  </Overlay>
);
