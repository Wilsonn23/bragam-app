// Current weather for the Braga corridor from Open-Meteo (free, no API key).
// The corridor is ~1 km long, so one fixed point is accurate enough and avoids
// sending the user's own GPS position to a third party.

const BRAGA_CENTER = Object.freeze({ latitude: -6.9175, longitude: 107.6091 });
const CACHE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 8000;

/**
 * @typedef {'clear'|'cloudy'|'fog'|'drizzle'|'rain'|'storm'} WeatherCondition
 * @typedef {{condition:WeatherCondition, label:string, icon:string, temperature:number|null,
 *   isDay:boolean, wet:boolean, hot:boolean, fetchedAt:number}} Weather
 */

/** Map a WMO weather code to a condition the recommender understands.
 * @param {number} code @param {number|null} temperature @param {boolean} isDay @returns {Weather}
 */
function describeWeather(code, temperature, isDay, fetchedAt = Date.now()) {
  /** @type {[WeatherCondition, string, string]} */
  let entry;
  if (code === 0) entry = ['clear', 'Cerah', isDay ? 'sunny' : 'moon'];
  else if (code <= 2) entry = ['clear', 'Cerah berawan', isDay ? 'partly-sunny' : 'cloudy-night'];
  else if (code === 3) entry = ['cloudy', 'Berawan', 'cloudy'];
  else if (code === 45 || code === 48) entry = ['fog', 'Berkabut', 'cloudy'];
  else if (code >= 51 && code <= 57) entry = ['drizzle', 'Gerimis', 'rainy'];
  else if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) entry = ['rain', code === 61 || code === 80 ? 'Hujan ringan' : 'Hujan', 'rainy'];
  else if (code >= 95) entry = ['storm', 'Badai petir', 'thunderstorm'];
  else entry = ['cloudy', 'Berawan', 'cloudy'];
  const [condition, label, icon] = entry;
  const temp = Number.isFinite(temperature) ? Math.round(temperature) : null;
  return {
    condition, label, icon, temperature: temp, isDay,
    wet: condition === 'drizzle' || condition === 'rain' || condition === 'storm',
    hot: temp !== null && temp >= 30 && isDay && condition === 'clear',
    fetchedAt,
  };
}

let cache = null;

/** @param {{fetchImpl?: typeof fetch, force?: boolean, now?: number}} [options] @returns {Promise<Weather>} */
async function fetchWeather({ fetchImpl = fetch, force = false, now = Date.now() } = {}) {
  if (!force && cache && now - cache.fetchedAt < CACHE_MS) return cache;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const url = 'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${BRAGA_CENTER.latitude}&longitude=${BRAGA_CENTER.longitude}` +
      '&current=temperature_2m,weather_code,is_day&timezone=Asia%2FJakarta';
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Cuaca tidak tersedia (${response.status}).`);
    const data = await response.json();
    const current = data?.current;
    if (!current || !Number.isFinite(current.weather_code)) throw new Error('Data cuaca tidak valid.');
    cache = describeWeather(current.weather_code, current.temperature_2m, current.is_day === 1, now);
    return cache;
  } finally {
    clearTimeout(timer);
  }
}

function clearWeatherCache() { cache = null; }

module.exports = { BRAGA_CENTER, describeWeather, fetchWeather, clearWeatherCache };
