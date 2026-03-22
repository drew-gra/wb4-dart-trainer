import React, { useState } from 'react';
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
      <div className="bg-[#1c1f2e] rounded-2xl p-6 border-2 border-amber-500 max-w-sm mx-4">
        <h2 className="text-2xl font-black text-center mb-2" style={GOLD_GRADIENT}>
          {icon} {title}
        </h2>
        {subtitle && (
          <p className="text-slate-400 text-center text-sm mb-6">
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
      className="w-full py-4 rounded-lg font-bold text-lg bg-[#2a2f42] text-white hover:bg-[#323850] border border-gray-600 transition-all"
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
              ? 'bg-[#252a3a] text-gray-600 cursor-not-allowed'
              : 'bg-[#2a2f42] text-white hover:bg-[#323850] border border-gray-600'
          }`}
        >
          {darts}
        </button>
      ))}
    </div>
  </Overlay>
);

/**
 * Name Prompt Overlay - shown on first share if no name is set
 */
export const NamePromptOverlay = ({ isOpen, onSubmit, onSkip, initialName = '', initialTeam = '' }) => {
  const [nameVal, setNameVal] = useState(initialName);
  const [teamVal, setTeamVal] = useState(initialTeam);

  if (!isOpen) return null;

  const hasName = nameVal.trim().length > 0;

  return (
    <Overlay
      isOpen={isOpen}
      icon="🎯"
      title="ADD YOUR INFO"
      subtitle="Shown on your share tile. You can change these later in Settings."
    >
      <input
        value={nameVal}
        onChange={(e) => setNameVal(e.target.value)}
        placeholder="Your name"
        autoFocus
        className="w-full bg-[#252a3a] border border-[#2a2f42] rounded-lg px-4 py-3 text-white text-base outline-none mb-3"
      />
      <input
        value={teamVal}
        onChange={(e) => setTeamVal(e.target.value)}
        placeholder="Your team (optional)"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && hasName) onSubmit(nameVal.trim(), teamVal.trim());
        }}
        className="w-full bg-[#252a3a] border border-[#2a2f42] rounded-lg px-4 py-3 text-white text-base outline-none mb-4"
      />
      <button
        onClick={() => {
          if (hasName) onSubmit(nameVal.trim(), teamVal.trim());
        }}
        disabled={!hasName}
        className={`w-full py-4 rounded-lg font-bold text-lg transition-all mb-2 ${
          hasName
            ? 'bg-[#2a2f42] text-white hover:bg-[#323850] border border-gray-600'
            : 'bg-[#252a3a] text-gray-600 cursor-not-allowed border border-[#2a2f42]'
        }`}
      >
        Continue
      </button>
      <button
        onClick={onSkip}
        className="w-full py-2 rounded-lg font-semibold text-sm text-gray-500 hover:text-slate-400 transition-all"
      >
        No thanks
      </button>
    </Overlay>
  );
};