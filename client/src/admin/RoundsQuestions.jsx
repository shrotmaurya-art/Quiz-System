import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuth';
import { apiFetch } from '../shared/api';
import RoundForm from './RoundForm';
import QuestionList from './QuestionList';
import QuestionForm from './QuestionForm';

export default function RoundsQuestions() {
  const { token } = useAdminAuth();
  const [rounds, setRounds] = useState([]);
  const [expandedRoundId, setExpandedRoundId] = useState(null);
  const [editingRound, setEditingRound] = useState(null);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [questionFormRoundId, setQuestionFormRoundId] = useState(null);
  const [questionRefreshKey, setQuestionRefreshKey] = useState(0);

  const fetchRounds = useCallback(async () => {
    const res = await apiFetch('/api/rounds');
    if (res.ok) setRounds(await res.json());
  }, []);

  useEffect(() => { fetchRounds(); }, [fetchRounds]);

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

    try {
      let res;
      if (editingQuestion) {
        res = await apiFetch(`/api/questions/${editingQuestion.id}`, {
          method: 'PUT',
          body: payload,
        });
      } else {
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

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end pb-4 border-b border-secondary/20">
        <h2 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.4)]">
          ROUNDS &amp; QUESTIONS
        </h2>
        <button
          onClick={() => { setEditingRound(null); setShowRoundForm(true); }}
          className="clip-diamond bg-secondary/10 border border-secondary text-secondary px-8 py-3 font-label-caps text-label-caps flex items-center gap-2 hover:bg-secondary/20 transition-all"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          ADD ROUND
        </button>
      </header>

      {/* Round form modal */}
      {showRoundForm && (
        <RoundForm
          round={editingRound}
          onSave={handleSaveRound}
          onCancel={() => { setShowRoundForm(false); setEditingRound(null); }}
        />
      )}

      {/* Question form modal */}
      {showQuestionForm && (
        <QuestionForm
          question={editingQuestion}
          roundId={questionFormRoundId}
          rounds={rounds}
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
          {expandedRound && (
            <div className="glass-panel rounded-lg flex flex-col overflow-hidden border border-secondary/50">
              <div className="p-6 border-b border-secondary/30 bg-primary-container/40 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-headline-md text-headline-md text-secondary">{expandedRound.name}</h3>
                    <span className="bg-primary-container text-primary text-xs px-2 py-1 rounded border border-primary/30 font-label-caps tracking-widest">
                      {expandedRound.answerMode} MODE
                    </span>
                  </div>
                  <p className="text-on-surface-variant text-sm font-body-md">
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
                onEdit={(q) => { setEditingQuestion(q); setShowQuestionForm(true); }}
                onDelete={(qId) => handleDeleteQuestion(qId, expandedRound.id)}
                onAddQuestion={() => { setEditingQuestion(null); setQuestionFormRoundId(expandedRound.id); setShowQuestionForm(true); }}
              />
            </div>
          )}
        </div>

        {/* Side column: round cards */}
        <div className="flex flex-col gap-stack-md">
          {rounds.filter((r) => r.id !== expandedRoundId).map((round) => (
            <div
              key={round.id}
              onClick={() => setExpandedRoundId(round.id)}
              className="glass-panel rounded-lg p-5 flex flex-col gap-4 hover:border-secondary/50 transition-colors cursor-pointer group"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-headline-md text-lg text-on-surface group-hover:text-secondary transition-colors">{round.name}</h3>
                  <p className="text-on-surface-variant text-sm mt-1">Round {round.order} · {round.questionCount} Question{round.questionCount !== 1 ? 's' : ''}</p>
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
            </div>
          ))}

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
