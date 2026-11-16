const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createGuideController, audioUrlFor, audioSourceFor, bundledAudioFor, shouldEnableMediaSession, AUDIO_ERROR } = require('../src/audio/guideController');

const a = { id: 'P01', name: 'A', audioUrl: 'https://example.org/a.mp3' };
const b = { id: 'P02', name: 'B', audioUrl: 'https://example.org/b.mp3' };
function setup(mode = async () => {}, enableMediaSession = true) {
  const calls = [];
  const states = [];
  const player = {
    currentStatus: { playing: false, didJustFinish: false, error: null },
    pause() { calls.push('pause'); this.currentStatus.playing = false; },
    play() { calls.push('play'); this.currentStatus.playing = true; },
    replace(url) { calls.push(['replace', url]); },
    setActiveForLockScreen(active, metadata) { calls.push(['session', active, metadata?.title]); },
    async seekTo(seconds) { calls.push(['seek', seconds]); },
  };
  const controller = createGuideController({ player, setMode: mode, onChange: s => states.push(s), enableMediaSession });
  return { controller, player, calls, states };
}

test('detects Android Expo Go without disabling a development build', () => {
  assert.equal(shouldEnableMediaSession({ platform: 'android', isExpoGo: true }), false);
  assert.equal(shouldEnableMediaSession({ platform: 'android', isExpoGo: false }), true);
  assert.equal(shouldEnableMediaSession({ platform: 'ios', isExpoGo: true }), true);
});

test('playback works without calling the Android media service in Expo Go', async () => {
  const { controller, calls } = setup(async () => {}, false);
  assert.equal(await controller.toggle(a), true);
  await controller.toggle(a);
  controller.dispose();
  assert.ok(calls.includes('play'));
  assert.ok(calls.includes('pause'));
  assert.equal(calls.some(c => Array.isArray(c) && c[0] === 'session'), false);
});

test('only valid HTTPS audio URLs enable playback', async () => {
  const { controller, calls } = setup();
  for (const value of [null, '', 'http://example.org/a', 'https://', 'https://bad host']) {
    assert.equal(audioUrlFor({ audioUrl: value }), null);
    assert.equal(await controller.toggle({ id: 'P01', audioUrl: value }), false);
  }
  assert.deepEqual(calls, []);
});

test('bundled audio plays without an API URL and remote audio retains precedence', async () => {
  const { controller, calls } = setup();
  const local = { id: 'P01', name: 'A', audioAsset: 0 };
  assert.equal(audioSourceFor(local), 0);
  assert.equal(await controller.toggle(local), true);
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'replace' && c[1] === 0));
  assert.equal(audioSourceFor({ ...local, audioUrl: a.audioUrl }), a.audioUrl);
  assert.equal(audioSourceFor({ audioAsset: -1 }), null);
});

test('all 12 POI IDs reference distinct supplied MP3 files', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  const manifest = fs.readFileSync(path.join(root, 'src/audio/guideAssets.js'), 'utf8');
  const entries = [...manifest.matchAll(/\b(P\d{2}): \{ name: '([^']+)', source: require\('\.\.\/\.\.\/assets\/audio\/poi(\d+)\.mp3'\) \}/g)];
  const scripts = require('../../data/pb08-narration-scripts.json').scripts;
  assert.equal(entries.length, 12);
  for (let i = 1; i <= 12; i++) {
    const id = `P${String(i).padStart(2, '0')}`;
    const entry = entries.find(item => item[1] === id);
    assert.equal(entry?.[3], String(i));
    assert.equal(entry?.[2], scripts.find(item => item.poiId === id)?.name);
    assert.ok(fs.statSync(path.join(root, 'assets/audio', `poi${i}.mp3`)).size > 0);
  }
});

test('bundled audio requires both the matching POI ID and name', () => {
  const assets = { P08: { name: 'Tiramisu Bandung', source: 42 } };
  assert.equal(bundledAudioFor({ id: 'P08', name: 'Tiramisu Bandung' }, assets), 42);
  assert.equal(bundledAudioFor({ id: 'P08', name: 'Bandung Kunafe Braga' }, assets), null);
  assert.equal(bundledAudioFor({ id: 'P12', name: 'Tiramisu Bandung' }, assets), null);
});

test('plays the selected POI, pauses and resumes without replacing its source', async () => {
  const { controller, calls, states } = setup();
  await controller.toggle(a);
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'replace' && c[1] === a.audioUrl));
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'session' && c[1] && c[2] === a.name));
  await controller.toggle(a);
  await controller.toggle(a);
  assert.equal(calls.filter(c => Array.isArray(c) && c[0] === 'replace').length, 1);
  assert.equal(calls.filter(c => c === 'play').length, 2);
  assert.equal(states.at(-1).currentId, a.id);
});

test('switching POIs pauses the prior source and activates the new one', async () => {
  const { controller, calls } = setup();
  await controller.toggle(a);
  const before = calls.length;
  await controller.toggle(b);
  const next = calls.slice(before);
  assert.equal(next[0], 'pause');
  assert.ok(next.some(c => Array.isArray(c) && c[0] === 'replace' && c[1] === b.audioUrl));
  assert.ok(next.some(c => Array.isArray(c) && c[0] === 'session' && c[1] && c[2] === b.name));
});

test('a failed command exposes an error and retry can load the source', async () => {
  let fail = true;
  const { controller, calls, states } = setup(async () => { if (fail) throw Error('failed'); });
  assert.equal(await controller.toggle(a), false);
  assert.equal(states.at(-1).error, AUDIO_ERROR);
  fail = false;
  assert.equal(await controller.toggle(a), true);
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'replace' && c[1] === a.audioUrl));
  assert.equal(states.at(-1).error, null);
});

test('a newer selection or cleanup cancels unfinished setup', async () => {
  const waiting = [];
  const { controller, calls } = setup(() => new Promise(resolve => waiting.push(resolve)));
  const first = controller.toggle(a);
  const second = controller.toggle(b);
  waiting[0]();
  await first;
  waiting[1]();
  await second;
  assert.equal(calls.filter(c => Array.isArray(c) && c[0] === 'replace').length, 1);
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'replace' && c[1] === b.audioUrl));
  const third = controller.toggle(a);
  controller.dispose();
  waiting[2]();
  assert.equal(await third, false);
  assert.equal(calls.at(-2), 'pause');
  assert.deepEqual(calls.at(-1), ['session', false, undefined]);
});

test('finished audio seeks to the start before replay', async () => {
  const { controller, player, calls } = setup();
  await controller.toggle(a);
  player.currentStatus.playing = false;
  player.currentStatus.didJustFinish = true;
  await controller.toggle(a);
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'seek' && c[1] === 0));
});

test('cancelling initial loading and resuming still loads the selected audio', async () => {
  const waiting = [];
  const { controller, calls, states } = setup(() => new Promise(resolve => waiting.push(resolve)));
  const initial = controller.toggle(a);
  await controller.toggle(a);
  waiting[0]();
  assert.equal(await initial, false);
  assert.equal(states.at(-1).intent, false);
  const resume = controller.toggle(a);
  waiting[1]();
  assert.equal(await resume, true);
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'replace' && c[1] === a.audioUrl));
});

test('a changed URL for the same POI replaces the old source on resume', async () => {
  const { controller, calls } = setup();
  await controller.toggle(a);
  await controller.toggle(a);
  await controller.toggle({ ...a, audioUrl: 'https://example.org/new.mp3' });
  assert.ok(calls.some(c => Array.isArray(c) && c[0] === 'replace' && c[1] === 'https://example.org/new.mp3'));
});
