const FILES = {
  lockIn: '/audio/quiz-sfx/lock-in.wav',
  reveal: '/audio/quiz-sfx/reveal.wav',
  correct: '/audio/quiz-sfx/correct.wav',
  wrong: '/audio/quiz-sfx/wrong.wav',
  quizStart: '/audio/quiz-sfx/quiz-start.wav',
  quizEnd: '/audio/quiz-sfx/quiz-end.wav',
};

const VOLUMES = { lockIn: 0.18, reveal: 0.52, correct: 0.5, wrong: 0.46, quizStart: 0.5, quizEnd: 0.5 };

/** Plays a packaged local WAV only when global SFX are enabled. */
export function playSoundEffect(name, enabled = true) {
  if (!enabled || typeof Audio === 'undefined' || !FILES[name]) return;
  const audio = new Audio(FILES[name]);
  audio.volume = VOLUMES[name] ?? 0.5;
  audio.play().catch(() => {});
}
