import { useCallback, useEffect, useMemo, useState } from 'react';
import { recommend } from './engine';
import { fetchWeather } from './weather';

const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const CLOCK_TICK_MS = 60 * 1000;

/** @typedef {import('./weather').Weather} Weather */

/**
 * Live weather + clock context for the recommendation engine.
 * Weather failures degrade gracefully: the weather factor is simply left out.
 */
export function useRecommendationContext() {
  const [weather, setWeather] = useState(/** @type {Weather|null} */ (null));
  const [weatherStatus, setWeatherStatus] = useState('loading');
  const [now, setNow] = useState(() => new Date());
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const load = force => fetchWeather({ force }).then(data => {
      if (!active) return;
      setWeather(data);
      setWeatherStatus('ready');
    }).catch(() => {
      if (active) setWeatherStatus('error');
    });
    load(attempt > 0);
    const timer = setInterval(() => load(true), WEATHER_REFRESH_MS);
    return () => { active = false; clearInterval(timer); };
  }, [attempt]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);

  const refreshWeather = useCallback(() => {
    setWeatherStatus('loading');
    setAttempt(n => n + 1);
  }, []);

  return { weather, weatherStatus, now, refreshWeather };
}

/** Rank `pois` for the given preferences and live context. */
export function useRecommendations(pois, preferences, userCoord, context) {
  const latitude = userCoord?.latitude;
  const longitude = userCoord?.longitude;
  const result = useMemo(() => recommend(pois, preferences, {
    now: context.now,
    weather: context.weather,
    userCoord: Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null,
  }), [pois, preferences, context.now, context.weather, latitude, longitude]);
  return result;
}
