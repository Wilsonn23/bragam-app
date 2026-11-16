const AUDIO_ERROR = 'Audio tidak dapat diputar. Periksa koneksi dan coba lagi.';

function shouldEnableMediaSession({ platform, isExpoGo }) {
  return !(platform === 'android' && isExpoGo);
}

function audioUrlFor(poi) {
  const value = typeof poi?.audioUrl === 'string' ? poi.audioUrl.trim() : '';
  return /^https:\/\/[^\s/]+(?:[/?#][^\s]*)?$/i.test(value) ? value : null;
}

function audioSourceFor(poi) {
  const remote = audioUrlFor(poi);
  if (remote) return remote;
  return Number.isInteger(poi?.audioAsset) && poi.audioAsset >= 0 ? poi.audioAsset : null;
}

function bundledAudioFor(poi, assets) {
  const asset = assets?.[poi?.id];
  if (typeof poi?.name !== 'string' || typeof asset?.name !== 'string') return null;
  return poi.name.trim().toLowerCase() === asset.name.trim().toLowerCase() ? asset.source : null;
}

// Owns commands and cancellation; expo-audio owns the native player's lifecycle.
function createGuideController({ player, setMode, onChange, enableMediaSession = true }) {
  let operation = 0;
  let loadedId = null;
  let loadedUrl = null;
  let state = { currentId: null, pending: false, intent: false, error: null };
  const publish = patch => { state = { ...state, ...patch }; onChange(state); };
  const deactivate = () => { if (enableMediaSession) player.setActiveForLockScreen(false); };

  async function toggle(poi) {
    const url = audioSourceFor(poi);
    if (!poi?.id || url === null) return false;
    const token = ++operation;
    const previousId = state.currentId;
    const status = player.currentStatus || {};
    try {
      if (previousId === poi.id && (state.pending || status.playing || (state.intent && status.isBuffering))) {
        player.pause();
        publish({ pending: false, intent: false, error: null });
        return true;
      }
      if (previousId !== poi.id) {
        player.pause();
        deactivate();
      }
      publish({ currentId: poi.id, pending: true, intent: true, error: null });
      await setMode({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: 'doNotMix' });
      if (token !== operation) return false;
      if (loadedId !== poi.id || loadedUrl !== url || status.error) {
        player.replace(url);
        loadedId = poi.id;
        loadedUrl = url;
      } else if (status.didJustFinish) {
        await player.seekTo(0);
        if (token !== operation) return false;
      }
      if (enableMediaSession) player.setActiveForLockScreen(true, { title: poi.name, artist: 'BRAGAm' });
      player.play();
      publish({ pending: false });
      return true;
    } catch {
      if (token === operation) {
        try { player.pause(); } catch { /* player may already be unavailable */ }
        try { deactivate(); } catch { /* no active native session */ }
        loadedId = null;
        loadedUrl = null;
        publish({ pending: false, intent: false, error: AUDIO_ERROR });
      }
      return false;
    }
  }

  function dispose() {
    ++operation;
    loadedId = null;
    loadedUrl = null;
    state = { currentId: null, pending: false, intent: false, error: null };
    try { player.pause(); } catch { /* player may already be released */ }
    try { deactivate(); } catch { /* native session may already be gone */ }
  }
  return { toggle, dispose };
}

module.exports = { createGuideController, audioUrlFor, audioSourceFor, bundledAudioFor, shouldEnableMediaSession, AUDIO_ERROR };
