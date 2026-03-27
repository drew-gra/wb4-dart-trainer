const ModeTabBar = ({ modes, currentMode, onModeChange, onHome }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2">
      <div className="flex gap-1 bg-[#1c1f2e] p-1 rounded-lg border border-[#2a2f42] flex-1">
        {modes.map((mode) => (
          <button
            key={mode.id}
            onClick={() => onModeChange(mode.id)}
            className={`flex-1 py-3 px-2 rounded-full text-xs font-bold transition-all duration-300 ${
              currentMode === mode.id
                ? 'text-[#111114] shadow-lg transform scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={currentMode === mode.id
              ? { background: 'linear-gradient(135deg, #f59e0b, #fcd34d)' }
              : { background: 'transparent' }
            }
          >
            {mode.label}
          </button>
        ))}
      </div>
      <button
        onClick={onHome}
        className="p-3 rounded-lg text-slate-400 hover:text-gray-200 bg-[#1c1f2e] border border-[#2a2f42] transition-all"
      >
        ⌂
      </button>
    </div>
  </div>
);

export default ModeTabBar;
