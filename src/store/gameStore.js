import { create } from 'zustand';

const LEGACY_KEY = 'wb4UnifiedSessionHistory';
const REPS_KEY = 'wb4RepsSessions';
const SOLO_KEY = 'wb4SoloSessions';
const MAX_PER_BUCKET = 100;

// Mode classification
const SOLO_MODES = new Set(['solo-501', 'cricket']);
const isSoloMode = (mode) => SOLO_MODES.has(mode);

/**
 * Central store for session history
 * 
 * Sessions are stored in two buckets:
 * - Reps: double-in, double-out, triples, first-9
 * - Solo: solo-501, cricket
 * Each bucket retains up to 100 sessions (200 total).
 * Unified metrics are calculated from both buckets combined.
 */
export const useSessionStore = create((set, get) => ({
  repsSessions: [],
  soloSessions: [],
  
  // Combined getter for unified metrics
  get sessions() {
    // Note: Zustand doesn't support native getters this way.
    // Use getAllSessions() instead, or access via the selector pattern.
  },
  
  getAllSessions: () => {
    const state = get();
    return [...state.repsSessions, ...state.soloSessions];
  },
  
  // Load sessions from localStorage (with migration from legacy key)
  loadSessions: () => {
    try {
      const legacyData = localStorage.getItem(LEGACY_KEY);
      
      if (legacyData) {
        // One-time migration: split legacy sessions into buckets
        const legacy = JSON.parse(legacyData);
        const reps = legacy.filter(s => !isSoloMode(s.mode)).slice(0, MAX_PER_BUCKET);
        const solo = legacy.filter(s => isSoloMode(s.mode)).slice(0, MAX_PER_BUCKET);
        
        localStorage.setItem(REPS_KEY, JSON.stringify(reps));
        localStorage.setItem(SOLO_KEY, JSON.stringify(solo));
        localStorage.removeItem(LEGACY_KEY);
        
        set({ repsSessions: reps, soloSessions: solo });
        return;
      }
      
      const savedReps = localStorage.getItem(REPS_KEY);
      const savedSolo = localStorage.getItem(SOLO_KEY);
      
      set({
        repsSessions: savedReps ? JSON.parse(savedReps) : [],
        soloSessions: savedSolo ? JSON.parse(savedSolo) : [],
      });
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  },
  
  // Add a new session (routed to correct bucket by mode)
  addSession: (sessionData) => {
    set(state => {
      if (isSoloMode(sessionData.mode)) {
        const updated = [sessionData, ...state.soloSessions].slice(0, MAX_PER_BUCKET);
        localStorage.setItem(SOLO_KEY, JSON.stringify(updated));
        return { soloSessions: updated };
      } else {
        const updated = [sessionData, ...state.repsSessions].slice(0, MAX_PER_BUCKET);
        localStorage.setItem(REPS_KEY, JSON.stringify(updated));
        return { repsSessions: updated };
      }
    });
  },
  
  // Clear all sessions
  clearSessions: () => {
    localStorage.removeItem(REPS_KEY);
    localStorage.removeItem(SOLO_KEY);
    localStorage.removeItem(LEGACY_KEY); // clean up if somehow still present
    set({ repsSessions: [], soloSessions: [] });
  },
  
  // Get sessions by mode (searches correct bucket)
  getSessionsByMode: (mode) => {
    const state = get();
    const bucket = isSoloMode(mode) ? state.soloSessions : state.repsSessions;
    return bucket.filter(s => s.mode === mode);
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