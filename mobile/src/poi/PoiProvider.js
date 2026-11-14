import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { createPoiStore } from './store';
import { adaptPois } from './adapter';
const fixtures = __DEV__ ? adaptPois(require('../dev/fixtures').testPois) : [];
const PoiContext = createContext(null);
export function PoiProvider({ children }) {
  const [store] = useState(() => createPoiStore());
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [simulation, setSimulation] = useState(false);
  useEffect(() => { store.load(); return () => store.dispose(); }, [store]);
  const simulated = __DEV__ && simulation;
  return <PoiContext.Provider value={{ ...data,
    records: simulated ? fixtures : data.records,
    status: simulated ? 'ready' : data.status,
    error: simulated ? null : data.error,
    retry: () => store.load(), simulation: simulated,
    setSimulation: value => { if (__DEV__) setSimulation(value); },
  }}>{children}</PoiContext.Provider>;
}
export function usePois() { return useContext(PoiContext); }
