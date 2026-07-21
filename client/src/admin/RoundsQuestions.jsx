import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuth';
import { apiFetch } from '../shared/api';
import RoundForm from './RoundForm';
import QuestionList from './QuestionList';
import QuestionForm from './QuestionForm';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoundsQuestions() {
  const { token } = useAdminAuth();
  const [rounds, setRounds] = useState([]);
  const [matches, setMatches] = useState([]);
  const [expandedRoundId, setExpandedRoundId] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionFormRoundId, setQuestionFormRoundId] = useState(null);
  const [questionRefreshKey, setQuestionRefreshKey] = useState(0);
  const [filterMatchId, setFilterMatchId] = useState('');

  const fetchRounds = useCallback(async () => {
    const url = filterMatchId ? `/api/rounds?matchId=${encodeURIComponent(filterMatchId)}` : '/api/rounds';
    const res = await apiFetch(url);
    if (res.ok) {
      const data = await res.json();
      setRounds(data);
      if (data.length > 0 && expandedRoundId === null) {
        setExpandedRoundId(data[0].id);
      }
    }
  }, [expandedRoundId, filterMatchId]);

  const fetchMatches = useCallback(async () => {
    const res = await apiFetch('/api/matches');
    if (res.ok) setMatches(await res.json());
  }, []);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);
  useEffect(() => { fetchMatches(); }, [fetchMatches]);

  async function handleDeleteRound(id) {
    if (!confirm('Delete this round and all its questions?')) return;
    const res = await apiFetch(`/api/rounds/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setRounds((prev) => prev.filter((r) => r.id !== id));
      if (expandedRoundId === id) setExpandedRoundId(null);
    }
  }

  async function handleSaveRound(data) {
    if (editingRound) {
      const res = await apiFetch(`/api/rounds/${editingRound.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) { setEditingRound(null); setShowRoundForm(false); fetchRounds(); }
    } else {
      const maxOrder = rounds.reduce((max, r) => Math.max(max, r.order || 0), 0);
      const res = await apiFetch('/api/rounds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, order: maxOrder + 1 }),
      });
      if (res.ok) { setShowRoundForm(false); fetchRounds(); }
    }
  }

  async function handleDeleteQuestion(id, roundId) {
    if (!confirm('Delete this question?')) return;
    const res = await apiFetch(`/api/questions/${id}`, { method: 'DELETE' });
    if (res.ok) { fetchRounds(); setQuestionRefreshKey((k) => k + 1); }
  }

  async function handleSaveQuestion(data) {
    try {
      let res;
      if (editingQuestion) {
        const body = {
          roundId: data.roundId,
          text: data.text,
          mediaType: data.mediaType,
          options: data.options,
          correctOptionKey: data.correctOptionKey,
          pointsOverride: data.pointsOverride,
          timeLimitOverrideSeconds: data.timeLimitOverrideSeconds,
          gapEnabledOverride: data.gapEnabledOverride,
          gapSecondsOverride: data.gapSecondsOverride,
        };
        res = await apiFetch(`/api/questions/${editingQuestion.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        const payload = new FormData();
        for (const [key, value] of Object.entries(data)) {
          if (key === 'media' && value) {
            payload.append('media', value);
          } else if (key === 'options') {
            payload.append('options', JSON.stringify(value));
          } else if (key === 'gapEnabledOverride' && value !== undefined && value !== null) {
            payload.append(key, String(value));
          } else if (value !== undefined && value !== null) {
            payload.append(key, value);
          }
        }
        res = await apiFetch('/api/questions', {
          method: 'POST',
          body: payload,
        });
      }

      if (res.ok) {
        setEditingQuestion(null);
        setShowQuestionForm(false);
        fetchRounds();
        setQuestionRefreshKey((k) => k + 1);
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert(err.error || `Error ${res.status}`);
      }
    } catch (e) {
      alert('Network error: ' + e.message);
    }
  }

  const expandedRound = rounds.find((r) => r.id === expandedRoundId);
  const questionFormRound = questionFormRoundId ? rounds.find((r) => r.id === questionFormRoundId) : null;

  const getMatchName = (matchId) => {
    if (!matchId) return null;
    const m = matches.find((m) => m.id === matchId);
    return m ? m.name : null;
  };

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 pb-4 border-b border-secondary/20">
        <div>
          <h2 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.4)]">
            ROUNDS &amp; QUESTIONS
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {matches.length > 0 && (
            <label className="flex items-center gap-2 text-sm text-on-surface-variant">
              <span className="font-label-caps text-xs tracking-widest">FILTER</span>
              <select
                value={filterMatchId}
                onChange={(e) => { setFilterMatchId(e.target.value); setExpandedRoundId(null); }}
                className="bg-surface-container-highest border border-outline/30 text-on-surface p-2 rounded text-sm focus:border-secondary focus:ring-0"
              >
                <option value="">All Matches</option>
                {matches.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
          )}
          <button
            onClick={() => { setEditingRound(null); setShowRoundForm(true); }}
            className="clip-diamond bg-secondary/10 border border-secondary text-secondary px-8 py-3 font-label-caps text-label-caps flex items-center gap-2 hover:bg-secondary/20 transition-all"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            ADD ROUND
          </button>
        </div>
      </header>

      {/* Round form modal */}
      {showRoundForm && (
        <RoundForm
          round={editingRound}
          matches={matches}
          onSave={handleSaveRound}
          onCancel={() => { setShowRoundForm(false); setEditingRound(null); }}
        />
      )}

      {/* Question form modal */}
      {showQuestionForm && (
        <QuestionForm
          question={editingQuestion}
          roundId={questionFormRoundId}
          round={questionFormRound}
          onSave={handleSaveQuestion}
          onCancel={() => { setShowQuestionForm(false); setEditingQuestion(null); }}
        />
      )}

      {/* Rounds grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-gutter items-start">
        {/* Main column: expanded round */}
        <div className="xl:col-span-2 flex flex-col gap-stack-md">
          {rounds.length === 0 && (
            <div className="glass-panel rounded-xl p-12 text-center">
              <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4 block">quiz</span>
              <p className="text-on-surface-variant font-body-lg">No rounds yet. Click "Add Round" to get started.</p>
            </div>
          )}
          <AnimatePresence mode="wait">
            {expandedRound && (
              <motion.div 
                key={expandedRound.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="glass-panel-active rounded-lg flex flex-col overflow-hidden"
              >
                <div className="p-6 border-b border-secondary/30 bg-primary-container/40 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-headline-md text-headline-md text-secondary">{expandedRound.name}</h3>
                      <span className="bg-primary-container text-primary text-xs px-2 py-1 rounded border border-primary/30 font-label-caps tracking-widest">
                        {expandedRound.answerMode} MODE
                      </span>
                    </div>
                    <p className="text-on-surface-variant text-sm font-body-md">
                      {getMatchName(expandedRound.matchId) && (
                        <span className="text-secondary">{getMatchName(expandedRound.matchId)}</span>
                      )}
                      {getMatchName(expandedRound.matchId) && ' · '}
                      Round {expandedRound.order} · {expandedRound.questionCount} Question{expandedRound.questionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditingRound(expandedRound); setShowRoundForm(true); }}
                      className="p-2 text-secondary hover:bg-secondary/10 rounded transition-colors"
                    >
                      <span className="material-symbols-outlined">edit</span>
                    </button>
                  </div>
                </div>
                <QuestionList
                  roundId={expandedRound.id}
                  answerMode={expandedRound.answerMode}
                  refreshKey={questionRefreshKey}
                  onEdit={(q) => { setEditingQuestion(q); setQuestionFormRoundId(q.roundId); setShowQuestionForm(true); }}
                  onDelete={(qId) => handleDeleteQuestion(qId, expandedRound.id)}
                  onAddQuestion={() => { setEditingQuestion(null); setQuestionFormRoundId(expandedRound.id); setShowQuestionForm(true); }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Side column: round cards */}
        <div className="flex flex-col gap-stack-md">
          <AnimatePresence>
            {rounds.filter((r) => r.id !== expandedRoundId).map((round) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                key={round.id}
                onClick={() => setExpandedRoundId(round.id)}
                className="glass-panel rounded-lg p-5 flex flex-col gap-4 hover:border-secondary/50 transition-colors cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-headline-md text-lg text-on-surface group-hover:text-secondary transition-colors">{round.name}</h3>
                    <p className="text-on-surface-variant text-sm mt-1">
                      {getMatchName(round.matchId) && (
                        <span className="text-secondary">{getMatchName(round.matchId)}</span>
                      )}
                      {getMatchName(round.matchId) && ' · '}
                      Round {round.order} · {round.questionCount} Question{round.questionCount !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteRound(round.id); }}
                    className="text-outline hover:text-error transition-colors"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`${round.answerMode === 'MCQ' ? 'bg-primary-container text-primary border-primary/30' : 'bg-tertiary-container/50 text-tertiary border-tertiary/30'} text-[10px] px-2 py-1 rounded border font-label-caps tracking-widest`}>
                    {round.answerMode === 'MCQ' ? 'MCQ MODE' : 'OPEN ENDED'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add round card */}
          <div
            onClick={() => { setEditingRound(null); setShowRoundForm(true); }}
            className="glass-panel border-dashed border-outline-variant/50 rounded-lg p-5 flex flex-col items-center justify-center gap-2 hover:border-secondary/50 hover:bg-secondary/5 transition-colors cursor-pointer min-h-[120px]"
          >
            <span className="material-symbols-outlined text-outline text-3xl">add_circle</span>
            <span className="font-label-caps text-outline text-xs tracking-widest">NEW ROUND</span>
          </div>
        </div>
      </div>
    </div>
  );
}
