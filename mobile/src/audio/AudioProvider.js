import React, { createContext, useContext, useRef, useState } from 'react';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';

const AudioContext = createContext(null);

export function AudioProvider({ children }) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [currentId, setCurrentId] = useState(null);
  const [error, setError] = useState(null);
  const operation = useRef(0);
  const current = useRef(null);

  async function toggle(poi) {
    const token = ++operation.current;
    setError(null);
    try {
      if (current.current === poi.id && status.playing) { player.pause(); return; }
      await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
      if (token !== operation.current) return;
      if (current.current !== poi.id) {
        player.pause();
        player.setActiveForLockScreen(false);
        player.replace(poi.audioUrl);
        current.current = poi.id;
        setCurrentId(poi.id);
      } else if (status.didJustFinish) {
        await player.seekTo(0);
        if (token !== operation.current) return;
      }
      player.setActiveForLockScreen(true, { title: poi.name, artist: 'BRAGAm' });
      player.play();
    } catch {
      setError('Audio tidak dapat diputar. Periksa koneksi atau coba lagi.');
    }
  }
  return <AudioContext.Provider value={{ toggle, currentId, status, error }}>{children}</AudioContext.Provider>;
}
export function useGuideAudio() { return useContext(AudioContext); }
