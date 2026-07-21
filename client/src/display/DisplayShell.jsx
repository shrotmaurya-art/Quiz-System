import ShaderBackground from './ShaderBackground';
import IdleView from './phases/IdleView';
import QuestionView from './phases/QuestionView';
import GapView from './phases/GapView';
import ResultsView from './phases/ResultsView';
import ScoreboardView from './phases/ScoreboardView';
import { DisplayGameProvider, useDisplayGame } from './DisplayGameContext';
import { useEffect, useRef } from 'react';
import { useBranding } from '../shared/BrandingContext';
import { playSoundEffect, loopSoundEffect } from '../shared/soundEffects';

const PHASE_MAP = {
  IDLE: IdleView,
  QUESTION_SHOWN: QuestionView,
  TIME_UP: QuestionView,
  JUDGING: QuestionView,
  GAP: GapView,
  RESULTS: ResultsView,
  QUIZ_ENDED: ScoreboardView,
};

function DisplayContent() {
  const { phase, gameState, timer, results } = useDisplayGame();
  const { soundEffectsEnabled } = useBranding();
  const previousPhaseRef = useRef(phase);
  const previousQuestionIdRef = useRef(null);
  const gapSoundStopRef = useRef(null);
  const playedResultsRef = useRef(null);
  const lastTickRef = useRef(null);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    previousPhaseRef.current = phase;
    if (previousPhase === 'IDLE' && phase === 'QUESTION_SHOWN') playSoundEffect('quizStart', soundEffectsEnabled);
    if (previousPhase !== 'QUIZ_ENDED' && phase === 'QUIZ_ENDED') playSoundEffect('quizEnd', soundEffectsEnabled);
  }, [phase, soundEffectsEnabled]);

  useEffect(() => {
    const questionId = gameState?.question?.id;
    if (questionId && previousQuestionIdRef.current !== questionId) {
      playSoundEffect('questionAppear', soundEffectsEnabled);
    }
    previousQuestionIdRef.current = questionId;
  }, [gameState?.question?.id, soundEffectsEnabled]);

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

  // timer-tick: only last 5 seconds, Display only
  useEffect(() => {
    const remaining = timer?.remainingSeconds;
    if (phase === 'QUESTION_SHOWN' && remaining != null && remaining <= 5 && remaining > 0 && lastTickRef.current !== remaining) {
      playSoundEffect('timerTick', soundEffectsEnabled);
    }
    lastTickRef.current = remaining;
  }, [timer?.remainingSeconds, phase, soundEffectsEnabled]);

  useEffect(() => {
    if (!results || playedResultsRef.current === results) return undefined;
    playedResultsRef.current = results;
    playSoundEffect('reveal', soundEffectsEnabled);
    const hasCorrectAnswer = results.rankings?.some((entry) => entry.status === 'correct');
    const timer = window.setTimeout(() => {
      playSoundEffect(hasCorrectAnswer ? 'correct' : 'wrong', soundEffectsEnabled);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [results, soundEffectsEnabled]);
  const PhaseView = PHASE_MAP[phase] ?? IdleView;

  // Use shader_2 for GAP phase or OPEN rounds, and shader_1 for others
  const shaderVariant = (phase === 'GAP' || gameState?.answerMode === 'OPEN') ? 'shader_2' : 'shader_1';

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden">
      <ShaderBackground variant={shaderVariant} />
      <div className="relative z-10 h-full w-full">
        <PhaseView />
      </div>
    </div>
  );
}

export default function DisplayShell() {
  return (
    <DisplayGameProvider>
      <DisplayContent />
    </DisplayGameProvider>
  );
}
