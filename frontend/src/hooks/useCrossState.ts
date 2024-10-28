import {
  useEffect,
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";

/**
 * Hook for managing state that syncs across browser tabs
 * @param stateKey - Unique key for storing the state in localStorage
 * @param defaultValue - Default value to use if no stored state exists
 * @returns Tuple of [state, setState] similar to useState
 */
export default function useCrossTabState<T>(
  stateKey: string,
  defaultValue: T,
): [T, Dispatch<SetStateAction<T>>] {
  // Initialize state with a function to avoid unnecessary localStorage reads
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(stateKey);
      if (stored !== null) {
        return JSON.parse(stored) as T;
      }
      return defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const isInitialized = useRef(false);

  // Sync to localStorage whenever state changes
  useEffect(() => {
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }

    try {
      if (state === undefined) {
        localStorage.removeItem(stateKey);
      } else {
        localStorage.setItem(stateKey, JSON.stringify(state));
      }
    } catch (error) {
      console.warn(
        `Failed to save state to localStorage for key "${stateKey}":`,
        error,
      );
    }
  }, [state, stateKey]);

  // Listen for changes from other tabs
  useEffect(() => {
    const onStorageChange = (event: StorageEvent) => {
      if (event.key !== stateKey) return;

      try {
        const newValue = event.newValue;
        if (newValue === null) {
          setState(defaultValue);
        } else {
          setState(JSON.parse(newValue));
        }
      } catch (error) {
        console.warn(
          `Failed to parse storage event value for key "${stateKey}":`,
          error,
        );
      }
    };

    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, [stateKey, defaultValue]);

  return [state, setState];
}

/**
 * Helper function to get current cross-tab state value
 * @param stateKey - Key used to store the state in localStorage
 * @returns The current state value, or undefined if not found
 */
export function getCrossTabState<T>(stateKey: string): T | undefined {
  try {
    const stored = localStorage.getItem(stateKey);
    if (stored === null) return undefined;
    return JSON.parse(stored) as T;
  } catch {
    return undefined;
  }
}
