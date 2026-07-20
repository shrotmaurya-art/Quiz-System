import { useCallback, useEffect, useState } from 'react';
import { useAdminAuth } from './AdminAuth';
import { apiFetch } from '../shared/api';
import { motion, AnimatePresence } from 'framer-motion';

function MatchForm({ match, candidates, onSave, onCancel }) {
  const [name, setName] = useState(match?.name ?? '');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState(() => {
    if (match?.candidateIds) return new Set(match.candidateIds);
    return new Set();
  });

  function toggleCandidate(id) {
    setSelectedCandidateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || selectedCandidateIds.size === 0) return;

    const payload = {
      name: name.trim(),
      candidateIds: Array.from(selectedCandidateIds),
    };

    let res;
    if (match) {
      res = await apiFetch(`/api/matches/${match.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } else {
      res = await apiFetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      onSave();
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      alert(err.error || `Error ${res.status}`);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 25, stiffness: 250 }}
        className="glass-panel rounded-xl w-full max-w-2xl flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-secondary/50 overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-secondary/30 bg-surface-container/50 flex justify-between items-center">
          <h3 className="font-headline-md text-secondary flex items-center gap-2">
            <span className="material-symbols-outlined">edit_square</span>
            {match ? 'Edit Match' : 'New Match'}
          </h3>
          <button onClick={onCancel} className="text-outline hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[70vh]">
          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-xs text-secondary tracking-widest">MATCH NAME</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-highest border-b border-tertiary focus:border-secondary focus:ring-0 text-on-surface font-headline-md text-xl p-3 rounded-t transition-colors"
              placeholder="e.g. Round of 16 — Match 1"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="font-label-caps text-xs text-secondary tracking-widest">CANDIDATES</label>
            <p className="text-xs text-on-surface-variant">Select which candidates compete in this match.</p>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {candidates.filter((c) => c.isActive).map((candidate) => {
                const isSelected = selectedCandidateIds.has(candidate.id);
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => toggleCandidate(candidate.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? 'border-secondary bg-secondary/10 text-on-surface'
                        : 'border-outline-variant/30 bg-surface-container-highest/30 text-on-surface-variant hover:border-outline'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-secondary border-secondary' : 'border-outline-variant'
                    }`}>
                      {isSelected && <span className="material-symbols-outlined text-[14px] text-on-secondary">check</span>}
                    </div>
                    <span className="font-body-md text-sm truncate">{candidate.name}</span>
                  </button>
                );
              })}
            </div>
            {candidates.filter((c) => c.isActive).length === 0 && (
              <p className="text-xs text-on-surface-variant italic">No active candidates. Add candidates first.</p>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-secondary/30 bg-surface-container-highest flex justify-end gap-4">
          <button onClick={onCancel} className="px-6 py-2 font-label-caps text-sm text-on-surface-variant hover:text-on-surface transition-colors">
            CANCEL
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || selectedCandidateIds.size === 0}
            className="px-8 py-2 font-label-caps text-sm bg-secondary text-on-secondary clip-diamond hover:bg-secondary-fixed transition-colors shadow-[0_0_20px_rgba(240,192,62,0.5)] flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {match ? 'SAVE MATCH' : 'CREATE MATCH'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function MatchesPage() {
  const { token } = useAdminAuth();
  const [matches, setMatches] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMatch, setEditingMatch] = useState(null);

  const fetchMatches = useCallback(async () => {
    const res = await apiFetch('/api/matches');
    if (res.ok) setMatches(await res.json());
  }, []);

  const fetchCandidates = useCallback(async () => {
    const res = await apiFetch('/api/candidates');
    if (res.ok) setCandidates(await res.json());
  }, []);

  useEffect(() => {
    fetchMatches();
    fetchCandidates();
  }, [fetchMatches, fetchCandidates]);

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"? This will also delete all rounds, questions, scores, and score log entries associated with this match.`)) return;
    const res = await apiFetch(`/api/matches/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMatches((prev) => prev.filter((m) => m.id !== id));
    }
  }

  async function handleReset(id, name) {
    if (!confirm(`Reset "${name}"? All current scores for this match will be cleared to 0 and the match status will return to "Not Started". This cannot be undone.`)) return;
    const res = await apiFetch(`/api/matches/${id}/reset`, { method: 'POST' });
    if (res.ok) {
      fetchMatches();
    } else {
      const err = await res.json().catch(() => ({ error: 'Unknown error' }));
      alert(err.error || `Error ${res.status}`);
    }
  }

  function handleFormSave() {
    setShowForm(false);
    setEditingMatch(null);
    fetchMatches();
  }

  const getCandidateName = (id) => {
    const cand = candidates.find((c) => c.id === id);
    return cand ? cand.name : id;
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'in_progress': return { text: 'IN PROGRESS', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' };
      case 'completed': return { text: 'COMPLETED', color: 'text-outline bg-surface-container-highest border-outline-variant/30' };
      default: return { text: 'NOT STARTED', color: 'text-secondary bg-secondary/10 border-secondary/30' };
    }
  };

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex justify-between items-end pb-4 border-b border-secondary/20">
        <div>
          <h2 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.4)]">
            MATCHES
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-2xl">
            Create and manage matches. Each match defines which candidates compete and which rounds belong to it.
          </p>
        </div>
        <button
          onClick={() => { setEditingMatch(null); setShowForm(true); }}
          className="clip-diamond bg-secondary/10 border border-secondary text-secondary px-8 py-3 font-label-caps text-label-caps flex items-center gap-2 hover:bg-secondary/20 transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          ADD MATCH
        </button>
      </header>

      {showForm && (
        <MatchForm
          match={editingMatch}
          candidates={candidates}
          onSave={handleFormSave}
          onCancel={() => { setShowForm(false); setEditingMatch(null); }}
        />
      )}

      {matches.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4 block">emoji_events</span>
          <p className="text-on-surface-variant font-body-lg">No matches yet. Click "Add Match" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-gutter">
          <AnimatePresence>
            {matches.map((match) => {
              const badge = statusLabel(match.status);
              return (
                <motion.div
                  key={match.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 200 }}
                  className={`glass-panel rounded-xl p-6 flex flex-col gap-4 hover:border-secondary/50 transition-colors duration-300 overflow-hidden ${
                    match.status === 'in_progress' ? 'border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-headline-md text-headline-md text-on-surface truncate">{match.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`text-[10px] px-2 py-1 rounded border font-label-caps tracking-widest ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0 ml-3">
                      {match.status === 'not_started' && (
                        <button
                          onClick={() => { setEditingMatch(match); setShowForm(true); }}
                          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary border border-secondary/30 hover:bg-secondary/20 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      )}
                      {match.status === 'completed' && (
                        <button
                          onClick={() => handleReset(match.id, match.name)}
                          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary border border-secondary/30 hover:bg-secondary/20 transition-colors"
                          title="Reset match to re-run"
                        >
                          <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(match.id, match.name)}
                        className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-error border border-error/30 hover:bg-error/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <p className="font-label-caps text-[10px] text-on-surface-variant tracking-widest">
                      CANDIDATES ({match.candidateIds?.length || 0})
                    </p>
                    <p className="text-sm text-on-surface font-body-md truncate">
                      {match.candidateIds?.map(getCandidateName).join(', ') || 'None'}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
