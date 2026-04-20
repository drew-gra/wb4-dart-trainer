import { useEffect } from 'react';

/**
 * Persist in-progress session state to localStorage so a mode can recover
 * a partial session after a reload / crash / browser close.
 *
 * On mount, the hook reads `storageKey` and invokes `onLoad(parsedData)` —
 * or `onLoad(null)` if there's no saved data. Whenever any value in `deps`
 * changes, the hook calls `getState()` and writes the result, but only
 * while `isActive` is true.
 *
 * Centralizes the try/catch/JSON boilerplate that was duplicated across
 * every active-play mode.
 */
export const useInProgressSession = ({
  storageKey,
  onLoad,
  getState,
  isActive,
  deps,
}) => {
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      onLoad(saved ? JSON.parse(saved) : null);
    } catch (e) {
      console.error(`Error loading in-progress session (${storageKey}):`, e);
      onLoad(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isActive) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(getState()));
    } catch (e) {
      console.error(`Error saving in-progress session (${storageKey}):`, e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
