import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { createSocket } from '../shared/socket';
import InvalidLinkScreen from './InvalidLinkScreen';
import { CandidateGameProvider, useCandidateGame } from './CandidateGameContext';
import McqQuestionView from './McqQuestionView';
import OpenQuestionView from './OpenQuestionView';
import ResultsView from './ResultsView';
import WaitingRoom from './WaitingRoom';

/**
 * Candidate tablet entry point — route /play/:candidateId?token=...
 *
 * Token validation is delegated entirely to the Socket.IO layer (Section 15 /
 * Task 2.5): the server's `io.use` middleware rejects a candidate socket unless
 * the candidateId + joinToken pair matches an active candidate. We do NOT add a
 * second REST validation call — the socket layer is the single source of truth.
 *
 * RECONNECT SAFETY (NFR5 / Section 15):
 * Socket.IO fires 'connect' on every reconnect after a Wi-Fi blip. On the
 * server side the connection handler re-sends `game:state:public` immediately,
 * so the CandidateGameContext replaces ALL local state with the fresh snapshot.
 * This means a tablet that drops Wi-Fi mid-question and reconnects 5 seconds
 * later correctly shows: the current question, whether THIS candidate already
 * locked in, and the correct remaining time — not stale data.
 *
 * SECURITY (Section 12 / AGENTS.md §4):
 * This component and CandidateGameContext subscribe ONLY to:
 *   game:state:public, timer:tick, time:up, gap:started, gap:tick, results:revealed
 * They NEVER subscribe to game:state (unredacted) or candidates:updated.
 */
export default function CandidateTablet() {
  const { candidateId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('connecting'); // 'connecting' | 'valid' | 'invalid'
  const socketRef = useRef(null);

  useEffect(() => {
    // No token -> cannot possibly be valid; show the error screen at once.
    if (!token) {
      setStatus('invalid');
      return;
    }

    const socket = createSocket({
      query: {
        role: 'candidate',
        candidateId,
        joinToken: token,
      },
    });
    socketRef.current = socket;

    // Socket.IO fires 'connect' on initial connection AND on every reconnect.
    // We use it solely for auth gating — actual game-state handling lives in
    // CandidateGameContext which listens on the same socket.
    const onConnect = () => setStatus('valid');
    const onConnectError = (err) => {
      if (err && /authentication|credentials|missing/i.test(err.message)) {
        setStatus('invalid');
      } else {
        console.warn('[Socket] Candidate connection error (retrying):', err?.message);
      }
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);

    return () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [candidateId, token]);

  if (status === 'invalid') {
    return <InvalidLinkScreen />;
  }

  if (status === 'connecting') {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-background text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at center, #1a2026 0%, #080f14 100%)' }}
        />
        <span className="material-symbols-outlined text-[48px] text-secondary animate-spin">progress_activity</span>
        <p className="mt-4 font-label-caps text-label-caps text-on-surface-variant tracking-[0.2em]">
          CONNECTING…
        </p>
      </div>
    );
  }

  // status === 'valid' — wrap content in the game context provider
  return (
    <CandidateGameProvider socket={socketRef.current} candidateId={candidateId}>
      <CandidateContent candidateId={candidateId} />
    </CandidateGameProvider>
  );
}

/**
 * Inner component — consumes CandidateGameContext to render the correct phase.
 * Placeholder for now; full phase-based views (MCQ options, lock-in, results,
 * etc.) will be built as sub-components in subsequent tasks.
 */
function CandidateContent({ candidateId }) {
  const { phase, gameState, timer, isLockedIn, gap } = useCandidateGame();

  // IDLE / QUIZ_ENDED — waiting shell (Task 5.6)
  if (phase === 'IDLE' || phase === 'QUIZ_ENDED') {
    return <WaitingRoom candidateId={candidateId} />;
  }

  // If MCQ, render MCQ question screen during active phases (including TIME_UP and GAP)
  if (gameState?.answerMode === 'MCQ' && (phase === 'QUESTION_SHOWN' || phase === 'TIME_UP' || phase === 'GAP')) {
    return <McqQuestionView />;
  }

  // If OPEN (Rapid Fire), render OPEN question screen during active phases
  // (including TIME_UP, JUDGING, and GAP — locked view stays on-screen; no separate Gap screen)
  if (gameState?.answerMode === 'OPEN' && (phase === 'QUESTION_SHOWN' || phase === 'TIME_UP' || phase === 'JUDGING' || phase === 'GAP')) {
    return <OpenQuestionView />;
  }

  // GAP phase — suspense screen
  if (phase === 'GAP') {
    return (
      <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(circle at center, #1a2026 0%, #080f14 100%)' }}
        />
        <div className="glass-panel relative z-10 flex flex-col items-center rounded-2xl p-12">
          <span className="material-symbols-outlined mb-4 block text-[48px] text-secondary animate-spin">hourglass_top</span>
          <h2 className="mb-2 font-display-lg text-display-lg text-secondary">Calculating results…</h2>
          {gap?.remainingSeconds != null && (
            <p className="font-body-lg text-body-lg text-on-surface-variant">
              {gap.remainingSeconds}s
            </p>
          )}
        </div>
      </div>
    );
  }

  // RESULTS phase — show this candidate's own results/feedback (Task 5.5)
  if (phase === 'RESULTS') {
    return <ResultsView />;
  }

  // QUESTION_SHOWN / TIME_UP / JUDGING — question + timer + lock status (placeholder)
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at center, #1a2026 0%, #080f14 100%)' }}
      />
      <div className="glass-panel relative z-10 flex flex-col items-center rounded-2xl p-12 max-w-lg w-full">
        {/* Timer */}
        {timer && (
          <div className="mb-4 text-center">
            <span className="font-display-lg text-display-lg text-secondary">
              {timer.remainingSeconds}s
            </span>
          </div>
        )}

        {/* Question text */}
        {gameState?.question && (
          <p className="mb-6 font-body-lg text-body-lg text-on-surface">
            {gameState.question.text}
          </p>
        )}

        {/* Lock status */}
        {isLockedIn && (
          <div className="mb-4 flex items-center gap-2 text-secondary">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            <span className="font-label-caps text-label-caps tracking-[0.15em]">LOCKED IN</span>
          </div>
        )}

        {/* Phase indicator for TIME_UP / JUDGING */}
        {phase === 'TIME_UP' && (
          <p className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.15em]">TIME'S UP</p>
        )}
        {phase === 'JUDGING' && (
          <p className="font-label-caps text-label-caps text-on-surface-variant tracking-[0.15em]">JUDGING…</p>
        )}
      </div>
    </div>
  );
}