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

let audioUnlocked = false;
let audioCtx = null;
let unlockInProgress = false;

const CtxClass = typeof AudioContext !== 'undefined' ? AudioContext
  : typeof webkitAudioContext !== 'undefined' ? webkitAudioContext : null;

function getAudioCtx() {
  if (!CtxClass) return null;
  if (!audioCtx) {
    try { audioCtx = new CtxClass(); } catch { return null; }
  }
  return audioCtx;
}

/**
 * Unlocks browser autoplay via TWO mechanisms:
 * 1. HTML Audio: plays a real (non-zero) silent clip during a user gesture
 * 2. Web Audio API: resumes an AudioContext during a user gesture
 *
 * Both must succeed so that:
 * - new Audio().play() works from gesture contexts (lockIn, correct, wrong)
 * - AudioContext can play from non-gesture contexts (quizStart, questionAppear, etc.)
 */
export function unlockAudio() {
  if (audioUnlocked || unlockInProgress) return;
  unlockInProgress = true;

  // 1. Web Audio API unlock
  const ctx = getAudioCtx();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  // 2. HTML Audio unlock with a real silent clip (50ms, 22050 Hz mono)
  //    Zero-length clips are NOT counted by browsers as valid audio playback.
  try {
    const silent = new Audio(
      'data:audio/wav;base64,UklGRsAIAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YZwIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
    );
    silent.volume = 0;
    silent.play().then(() => {
      audioUnlocked = true;
      unlockInProgress = false;
    }).catch(() => {
      // If silent clip fails, still mark as unlocked after a short delay
      // (the gesture DID happen, just the clip didn't play)
      setTimeout(() => { audioUnlocked = true; unlockInProgress = false; }, 100);
    });
  } catch {
    audioUnlocked = true;
    unlockInProgress = false;
  }
}

export function isAudioUnlocked() {
  return audioUnlocked;
}

/** Plays a packaged sound effect. Tries HTML Audio first, falls back to Web Audio API. */
export function playSoundEffect(name, enabled = true) {
  if (!enabled || !FILES[name]) return;
  const volume = VOLUMES[name] ?? 0.5;

  // Try HTML Audio first — works in gesture contexts and after unlock
  if (typeof Audio !== 'undefined') {
    const audio = new Audio(FILES[name]);
    audio.volume = volume;
    audio.play().catch(() => {
      // HTML Audio blocked — try Web Audio API fallback
      playViaWebAudio(name, volume, false);
    });
    return;
  }

  // Fallback: Web Audio API
  playViaWebAudio(name, volume, false);
}

function playViaWebAudio(name, volume, loop) {
  const ctx = getAudioCtx();
  if (!ctx || ctx.state !== 'running') return;

  fetch(FILES[name])
    .then((r) => r.arrayBuffer())
    .then((buf) => ctx.decodeAudioData(buf))
    .then((audioBuf) => {
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      source.buffer = audioBuf;
      source.loop = !!loop;
      gain.gain.value = volume;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start(0);
    })
    .catch(() => {});
}

/**
 * Starts a looping sound effect. Returns a stop function that fades out over ~250ms.
 */
export function loopSoundEffect(name, enabled = true) {
  if (!enabled || !FILES[name]) return () => {};
  const volume = VOLUMES[name] ?? 0.5;

  // Try HTML Audio loop
  if (typeof Audio !== 'undefined') {
    const audio = new Audio(FILES[name]);
    audio.volume = volume;
    audio.loop = true;
    audio.play().catch(() => {});

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      const fadeSteps = 5;
      const fadeInterval = 50;
      let step = 0;
      const fade = setInterval(() => {
        step += 1;
        audio.volume = Math.max(0, volume * (1 - step / fadeSteps));
        if (step >= fadeSteps) {
          clearInterval(fade);
          audio.pause();
          audio.src = '';
        }
      }, fadeInterval);
    };
  }

  return () => {};
}
