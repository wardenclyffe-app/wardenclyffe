import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";

const serverSnapshot = () => null;

export const useValidatedLocalStorage = <T>(
  key: string,
  initialValue: T,
  validate: (payload: unknown) => T,
): [T, Dispatch<SetStateAction<T>>] => {
  const subscribe = useCallback(
    (notify: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) notify();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener("local-storage", notify);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener("local-storage", notify);
      };
    },
    [key],
  );
  const snapshot = useCallback(() => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn(`Cannot read local preferences ${key}:`, error);
      return null;
    }
  }, [key]);
  const decode = useCallback(
    (raw: string | null): T => {
      if (raw === null) return initialValue;
      try {
        return validate(JSON.parse(raw));
      } catch (error) {
        console.warn(`Invalid local preferences ${key}:`, error);
        return initialValue;
      }
    },
    [key, initialValue, validate],
  );
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const value = useMemo(() => decode(raw), [raw, decode]);
  const setValue: Dispatch<SetStateAction<T>> = (update) => {
    const next =
      typeof update === "function"
        ? (update as (previous: T) => T)(decode(snapshot()))
        : update;
    try {
      localStorage.setItem(key, JSON.stringify(validate(next)));
      window.dispatchEvent(new Event("local-storage"));
    } catch (error) {
      console.warn(`Cannot save local preferences ${key}:`, error);
    }
  };
  return [value, setValue];
};
