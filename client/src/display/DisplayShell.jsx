import ShaderBackground from './ShaderBackground';
import IdleView from './phases/IdleView';
import QuestionView from './phases/QuestionView';
import GapView from './phases/GapView';
import ResultsView from './phases/ResultsView';
import ScoreboardView from './phases/ScoreboardView';
import { DisplayGameProvider, useDisplayGame } from './DisplayGameContext';

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
  const { phase, gameState } = useDisplayGame();
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
