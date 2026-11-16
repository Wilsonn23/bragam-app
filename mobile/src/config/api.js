import Constants from 'expo-constants';

const BACKEND_PORT = '5000';
const debuggerHost =
  Constants.expoConfig?.hostUri ||
  Constants.manifest2?.extra?.expoGo?.debuggerHost ||
  Constants.manifest?.debuggerHost;
const localIp = debuggerHost ? debuggerHost.split(':')[0] : '10.0.2.2';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || `http://${localIp}:${BACKEND_PORT}`;
