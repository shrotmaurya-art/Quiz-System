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
  JUDGING: GapView,
  GAP: GapView,
  RESULTS: ResultsView,
  QUIZ_ENDED: ScoreboardView,
};

function DisplayContent() {
  const { phase } = useDisplayGame();
  const PhaseView = PHASE_MAP[phase] ?? IdleView;

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-[#0A0E29]">
      <ShaderBackground />
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
