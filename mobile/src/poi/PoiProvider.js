import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { createPoiStore } from './store';
const PoiContext = createContext(null);
export function PoiProvider({ children }) {
  const [store] = useState(() => createPoiStore());
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot);
  useEffect(() => { store.load(); return () => store.dispose(); }, [store]);
  return <PoiContext.Provider value={{ ...data,
    retry: () => store.load(),
  }}>{children}</PoiContext.Provider>;
}
export function usePois() { return useContext(PoiContext); }
