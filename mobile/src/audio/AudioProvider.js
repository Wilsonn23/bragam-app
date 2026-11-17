import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import { createGuideController, shouldEnableMediaSession } from './guideController';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [state, setState] = useState({ currentId: null, pending: false, intent: false, error: null });
  // Expo Go's Android binary may not contain the service declared by this project's plugin.
  const enableMediaSession = shouldEnableMediaSession({ platform: Platform.OS, isExpoGo: isRunningInExpoGo() });
  const controller = useMemo(() => createGuideController({ player, setMode: setAudioModeAsync, onChange: setState, enableMediaSession }), [player, enableMediaSession]);
  useEffect(() => () => controller.dispose(), [controller]);
  return <AudioContext.Provider value={{ ...state, status, toggle: controller.toggle }}>{children}</AudioContext.Provider>;
}
export function useGuideAudio() { return useContext(AudioContext); }
