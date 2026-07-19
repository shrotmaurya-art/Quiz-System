import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { createSocket } from '../shared/socket';
import InvalidLinkScreen from './InvalidLinkScreen';

/**
 * Candidate tablet entry point — route /play/:candidateId?token=...
 *
 * Token validation is delegated entirely to the Socket.IO layer (Section 15 /
 * Task 2.5): the server's `io.use` middleware rejects a candidate socket unless
 * the candidateId + joinToken pair matches an active candidate. We do NOT add a
 * second REST validation call — the socket layer is the single source of truth.
 *
 * - Missing token in the URL  -> show the friendly error screen immediately
 *   (no point attempting a connection we know will fail).
 * - Socket `connect_error`     -> server rejected the pair -> error screen.
 * - Socket `connect`           -> valid -> render the idle/waiting shell.
 *   (The real interactive idle screen is Task 5.6; this is a placeholder.)
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

    const onConnect = () => setStatus('valid');
    const onConnectError = () => setStatus('invalid');

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

  // status === 'valid' — placeholder idle/waiting shell (real idle screen: Task 5.6)
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-background text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(circle at center, #1a2026 0%, #080f14 100%)' }}
      />
      <div className="glass-panel relative z-10 flex flex-col items-center rounded-2xl p-12">
        <span className="material-symbols-outlined mb-6 block text-[64px] text-secondary">sports_esports</span>
        <h1 className="mb-4 font-display-lg text-display-lg text-secondary">THE HOT SEAT</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">Waiting for the quiz to start…</p>
      </div>
    </div>
  );
}