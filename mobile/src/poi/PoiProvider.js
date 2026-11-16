import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchPois } from './api';
import { adaptPois } from './adapter';
import { poiLoadFailure, poiLoadSuccess } from './source';

// Generated from the PB03 CSV; bundled for offline exploration, without fabricated media.
const offlinePois = adaptPois(require('./pb03.snapshot.json'));

const PoiContext = createContext(null);

export function PoiProvider({ children }) {
  const [state, setState] = useState({ pois: [], loading: true, error: null, source: 'loading' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    fetchPois().then(pois => {
      if (active) setState(poiLoadSuccess(pois));
    }).catch(() => {
      if (active) setState(poiLoadFailure(offlinePois));
    });
    return () => { active = false; };
  }, [attempt]);
  const retry = () => {
    setState(previous => ({ ...previous, loading: true, error: null }));
    setAttempt(n => n + 1);
  };
  return <PoiContext.Provider value={{ ...state, retry }}>{children}</PoiContext.Provider>;
}

export function usePois() { return useContext(PoiContext); }
