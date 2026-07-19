import { useState } from 'react';
import ShaderBackground from './ShaderBackground';
import IdleView from './phases/IdleView';
import QuestionView from './phases/QuestionView';
import GapView from './phases/GapView';
import ResultsView from './phases/ResultsView';
import ScoreboardView from './phases/ScoreboardView';

const PHASES = ['IDLE', 'QUESTION', 'GAP', 'RESULTS', 'SCOREBOARD'];

const PHASE_MAP = {
  IDLE: IdleView,
  QUESTION: QuestionView,
  GAP: GapView,
  RESULTS: ResultsView,
  SCOREBOARD: ScoreboardView,
};

export default function DisplayShell() {
  const [phase, setPhase] = useState('IDLE');
  const PhaseView = PHASE_MAP[phase];

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#0A0E29]">
      <ShaderBackground />

      <div className="relative z-10 w-full h-full flex flex-col">
        <div className="flex-1 min-h-0">
          {PhaseView && <PhaseView />}
        </div>

        {/* Hardcoded phase switcher — dev only, remove in production */}
        <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-3 bg-surface-container-lowest/80 backdrop-blur-sm border-t border-outline-variant/30">
          {PHASES.map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              className={`font-label-caps text-[11px] tracking-widest px-4 py-2 rounded transition-all ${
                phase === p
                  ? 'bg-secondary text-on-secondary'
                  : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
