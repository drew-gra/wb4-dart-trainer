import { create } from 'zustand';

const STORAGE_KEY = 'wb4UnifiedSessionHistory';
const MAX_SESSIONS = 100;

/**
 * Central store for session history
 * Uses Zustand for simple, scalable state management
 * 
 * Why Zustand over useState:
 * - Single source of truth accessible from any component
 * - No prop drilling
 * - Easy to extend with new state (e.g., voice settings)
 * - Built-in persistence patterns
 */
export const useSessionStore = create((set, get) => ({
  sessions: [],
  
  // Load sessions from localStorage
  loadSessions: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        set({ sessions: JSON.parse(saved) });
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  },
  
  // Add a new session
  addSession: (sessionData) => {
    set(state => {
      const updated = [sessionData, ...state.sessions].slice(0, MAX_SESSIONS);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return { sessions: updated };
    });
  },
  
  // Clear all sessions
  clearSessions: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ sessions: [] });
  },
  
  // Get sessions by mode
  getSessionsByMode: (mode) => {
    return get().sessions.filter(s => s.mode === mode);
  }
}));

/**
 * Store for current app state (mode, UI state)
 */
export const useAppStore = create((set) => ({
  currentMode: null,
  saveStatus: '',
  
  setMode: (mode) => set({ currentMode: mode }),
  
  showStatus: (message, timeout = 2000) => {
    set({ saveStatus: message });
    setTimeout(() => set({ saveStatus: '' }), timeout);
  }
}));
