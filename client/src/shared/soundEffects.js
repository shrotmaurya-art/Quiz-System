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

/**
 * Unlocks browser autoplay via Web Audio API (AudioContext.resume()) during a
 * user gesture. This is the most reliable cross-browser unlock — once the
 * AudioContext is resumed, subsequent HTML Audio.play() calls also work without
 * gesture context. Safe to call multiple times — only unlocks once.
 */
export function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) { audioUnlocked = true; return; }
    const ctx = new Ctx();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => { audioUnlocked = true; }).catch(() => {});
    } else {
      audioUnlocked = true;
    }
  } catch {
    audioUnlocked = true;
  }
}

/** Returns whether audio has been unlocked by a prior user gesture. */
export function isAudioUnlocked() {
  return audioUnlocked;
}

/** Plays a packaged sound effect only when global SFX are enabled. */
export function playSoundEffect(name, enabled = true) {
  if (!enabled || typeof Audio === 'undefined' || !FILES[name]) return;
  const audio = new Audio(FILES[name]);
  audio.volume = VOLUMES[name] ?? 0.5;
  audio.play().catch(() => {});
}

/**
 * Starts a looping sound effect. Returns a stop function that fades out over ~250ms.
 * Only plays when enabled is true. The audio loops via the 'ended' event.
 */
export function loopSoundEffect(name, enabled = true) {
  if (!enabled || typeof Audio === 'undefined' || !FILES[name]) return () => {};
  const audio = new Audio(FILES[name]);
  audio.volume = VOLUMES[name] ?? 0.5;
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
      audio.volume = Math.max(0, (VOLUMES[name] ?? 0.5) * (1 - step / fadeSteps));
      if (step >= fadeSteps) {
        clearInterval(fade);
        audio.pause();
        audio.src = '';
      }
    }, fadeInterval);
  };
}
