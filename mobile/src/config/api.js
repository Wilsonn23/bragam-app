import Constants from 'expo-constants';

const BACKEND_PORT = '5000';

const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  const debuggerHost =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;
  const hostIp = debuggerHost?.split(':')[0];

  if (hostIp) {
    return `http://${hostIp}:${BACKEND_PORT}`;
  }

  return 'http://localhost:5000';
};

export const API_URL = getApiUrl();

// Keep the existing exported name for callers in this app.
export const API_BASE_URL = API_URL;
