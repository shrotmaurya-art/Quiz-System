import { useEffect, useRef } from 'react';
import { useCandidateGame } from './CandidateGameContext';
import { useBranding } from '../shared/BrandingContext';
import { playSoundEffect, loopSoundEffect } from '../shared/soundEffects';

/**
 * CandidateSoundEffects — handles all non-lockIn, non-correct/wrong sounds
 * for the candidate tablet. Must be mounted inside CandidateGameProvider so it
 * has access to game phase and state. Runs persistently across phase changes
 * (CandidateContent remounts on phase change, but this component stays mounted
 * via CandidateTablet).
 *
 * Sounds handled:
 *   - quizStart: IDLE → QUESTION_SHOWN (first connection only, not on reconnect)
 *   - questionAppear: question.id changes (new question visible)
 *   - gapSuspense: enters GAP phase, loops for gap.gapSeconds, fades on exit
 *   - reveal (answer-reveal): results arrive
 *
 * NOT handled here (kept exactly as-is):
 *   - lockIn: triggered by user tap in McqQuestionView / OpenQuestionView
 *   - correct/wrong: triggered per-candidate in ResultsView
 */
export default function CandidateSoundEffects() {
  const { phase, gameState, gap, results } = useCandidateGame();
  const { soundEffectsEnabled } = useBranding();

  const previousPhaseRef = useRef(phase);
  const previousQuestionIdRef = useRef(null);
  const gapSoundStopRef = useRef(null);
  const playedResultsRef = useRef(null);

  // ── quiz-start: IDLE → QUESTION_SHOWN ──
  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;
    if (previousPhase === 'IDLE' && phase === 'QUESTION_SHOWN') {
      playSoundEffect('quizStart', soundEffectsEnabled);
    }
  }, [phase, soundEffectsEnabled]);

  // ── question-appear: fires when question.id changes ──
  useEffect(() => {
    const questionId = gameState?.question?.id;
    if (questionId && previousQuestionIdRef.current !== questionId) {
      playSoundEffect('questionAppear', soundEffectsEnabled);
    }
    previousQuestionIdRef.current = questionId;
  }, [gameState?.question?.id, soundEffectsEnabled]);

  // ── gap-suspense: loop on enter GAP, fade-out on exit ──
  useEffect(() => {
    if (phase === 'GAP') {
      gapSoundStopRef.current = loopSoundEffect('gapSuspense', soundEffectsEnabled);
    } else if (gapSoundStopRef.current) {
      gapSoundStopRef.current();
      gapSoundStopRef.current = null;
    }
    return () => {
      if (gapSoundStopRef.current) {
        gapSoundStopRef.current();
        gapSoundStopRef.current = null;
      }
    };
  }, [phase, soundEffectsEnabled]);

  // ── answer-reveal: fires when results arrive ──
  useEffect(() => {
    if (!results || playedResultsRef.current === results) return;
    playedResultsRef.current = results;
    playSoundEffect('reveal', soundEffectsEnabled);
  }, [results, soundEffectsEnabled]);

  return null;
}
