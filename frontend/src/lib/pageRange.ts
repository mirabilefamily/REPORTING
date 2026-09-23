import { useSyncExternalStore } from 'react';
import type { DateRangeValue } from '../components/DateRangePicker';

// Module-level store — survives component unmounts (page navigations).
const store = new Map<string, DateRangeValue>();
const subscribers = new Set<() => void>();

function subscribe(cb: () => void) {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

function emit() {
  subscribers.forEach((fn) => fn());
}

function readSnapshot(key: string): DateRangeValue {
  return store.get(key) ?? 'YTD';
}

/**
 * Per-page persistent date-range selection.
 * Each pageKey holds its own value; unmount/remount keeps the last picked value.
 * Distinct keys stay fully independent.
 */
export function usePageRange(pageKey: string): [DateRangeValue, (v: DateRangeValue) => void] {
  const value = useSyncExternalStore(subscribe, () => readSnapshot(pageKey));
  const setValue = (v: DateRangeValue) => {
    if (store.get(pageKey) === v) return;
    store.set(pageKey, v);
    emit();
  };
  return [value, setValue];
}
