const FILES = {
  lockIn: '/audio/quiz-sfx/lock-in.wav',
  reveal: '/audio/quiz-sfx/answer-reveal.mp3',
  correct: '/audio/quiz-sfx/correct.wav',
  wrong: '/audio/quiz-sfx/wrong.wav',
  quizStart: '/audio/quiz-sfx/quiz-start.mp3',
  quizEnd: '/audio/quiz-sfx/quiz-end.wav',
  questionAppear: '/audio/quiz-sfx/question-appear.mp3',
  gapSuspense: '/audio/quiz-sfx/gap-suspense.mp3',
  timerTick: '/audio/quiz-sfx/timer-tick.mp3',
};

const VOLUMES = {
  lockIn: 0.18,
  reveal: 0.52,
  correct: 0.5,
  wrong: 0.46,
  quizStart: 0.5,
  quizEnd: 0.5,
  questionAppear: 0.5,
  gapSuspense: 0.45,
  timerTick: 0.4,
};

const CtxClass = typeof AudioContext !== 'undefined' ? AudioContext
  : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null;

let audioCtx = null;
let audioUnlocked = false;
const decodeCache = {};

function getCtx() {
  if (!CtxClass) return null;
  if (!audioCtx) audioCtx = new CtxClass();
  return audioCtx;
}

/**
 * Unlocks browser autoplay by resuming an AudioContext during a user gesture.
 * Must be called from a user-gesture event handler (click/tap/keydown).
 * Safe to call multiple times — only unlocks once.
 */
export function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = getCtx();
  if (!ctx) { audioUnlocked = true; return; }
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => { audioUnlocked = true; }).catch(() => {});
  } else {
    audioUnlocked = true;
  }
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

async function fetchAndDecode(name) {
  if (decodeCache[name]) return decodeCache[name];
  const url = FILES[name];
  if (!url) return null;
  const ctx = getCtx();
  if (!ctx) return null;
  const res = await fetch(url);
  const arrayBuf = await res.arrayBuffer();
  const audioBuf = await ctx.decodeAudioData(arrayBuf);
  decodeCache[name] = audioBuf;
  return audioBuf;
}

function schedulePlayback(audioBuf, volume, loop, onEnd) {
  const ctx = getCtx();
  if (!ctx) return null;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  source.buffer = audioBuf;
  source.loop = !!loop;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(ctx.destination);
  source.onended = onEnd || null;
  source.start(0);
  return { source, gain };
}

/** Plays a packaged sound effect using Web Audio API (no autoplay issues). */
export function playSoundEffect(name, enabled = true) {
  if (!enabled || !FILES[name]) return;
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return;

  fetchAndDecode(name).then((audioBuf) => {
    if (!audioBuf) return;
    schedulePlayback(audioBuf, VOLUMES[name] ?? 0.5, false);
  }).catch(() => {});
}

/**
 * Starts a looping sound effect via Web Audio API.
 * Returns a stop function that fades out over ~250ms.
 */
export function loopSoundEffect(name, enabled = true) {
  if (!enabled || !FILES[name]) return () => {};
  const ctx = getCtx();
  if (!ctx || ctx.state !== 'running') return () => {};

  let stopped = false;
  let playback = null;

  fetchAndDecode(name).then((audioBuf) => {
    if (stopped || !audioBuf) return;
    playback = schedulePlayback(audioBuf, VOLUMES[name] ?? 0.5, true);
  }).catch(() => {});

  return () => {
    if (stopped) return;
    stopped = true;
    if (!playback) return;
    const { source, gain } = playback;
    const fadeSteps = 5;
    const fadeInterval = 50;
    let step = 0;
    const fade = setInterval(() => {
      step += 1;
      gain.gain.value = Math.max(0, (VOLUMES[name] ?? 0.5) * (1 - step / fadeSteps));
      if (step >= fadeSteps) {
        clearInterval(fade);
        try { source.stop(); } catch {}
      }
    }, fadeInterval);
  };
}
