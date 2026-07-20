import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { useAdminAuth } from './AdminAuth';
import { apiFetch } from '../shared/api';
import { motion } from 'framer-motion';

const apiBaseUrl = import.meta.env.VITE_API_URL || '';

function JoinLinkUrl(candidateId, joinToken) {
  const host = window.location.hostname;
  const port = window.location.port || '4000';
  return `${window.location.protocol}//${host}:${port}/play/${candidateId}?token=${joinToken}`;
}

function CandidateCard({ candidate, onEdit, onDelete }) {
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const joinUrl = JoinLinkUrl(candidate.id, candidate.joinToken);
  const isActive = candidate.isActive;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, {
      width: 128,
      margin: 1,
      color: { dark: '#0e141a', light: '#ffffff' },
    }).then(setQrDataUrl);
  }, [joinUrl]);

  function handleCopy() {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative bg-surface-container-high/60 backdrop-blur-xl border border-secondary/20 rounded-xl p-6 shadow-[inset_0_0_20px_rgba(196,192,255,0.02)] hover:border-secondary/50 transition-colors duration-300 overflow-hidden group"
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => onEdit(candidate)}
          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-secondary border border-secondary/30 hover:bg-secondary/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
        <button
          onClick={() => onDelete(candidate.id)}
          className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-error border border-error/30 hover:bg-error/20 transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {/* Header: logo + name + status */}
      <div className="flex items-center gap-6 mb-6">
        <div className={`w-20 h-20 hex-clip p-0.5 shrink-0 flex items-center justify-center ${isActive ? 'bg-secondary shadow-[0_0_15px_rgba(240,192,62,0.4)]' : 'bg-outline-variant opacity-60'}`}>
          <div className="w-full h-full hex-clip bg-surface-dim flex items-center justify-center">
            {candidate.logoUrl ? (
              <img
                alt={candidate.name}
                className={`w-full h-full object-cover ${!isActive ? 'grayscale' : ''}`}
                src={`${apiBaseUrl}${candidate.logoUrl}`}
              />
            ) : (
              <div className={`w-full h-full flex items-center justify-center text-3xl font-headline-md ${isActive ? 'text-secondary' : 'text-outline'}`}>
                {candidate.name?.charAt(0)?.toUpperCase()}
              </div>
            )}
          </div>
        </div>
        <div>
          <h3 className={`font-headline-md text-headline-md font-bold tracking-tight uppercase ${isActive ? 'text-on-surface' : 'text-on-surface-variant'}`}>
            {candidate.name}
          </h3>
          <div className="mt-2 flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-secondary shadow-[0_0_8px_rgba(240,192,62,0.8)]' : 'bg-outline'}`} />
            <span className={`font-label-caps text-[12px] tracking-widest ${isActive ? 'text-secondary' : 'text-outline'}`}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>
      </div>

      {/* Join Pass */}
      <div className={`bg-surface-container-low/80 border border-outline-variant/30 rounded-lg p-4 relative overflow-hidden ${!isActive ? 'opacity-70' : ''}`}>
        <div className={`absolute top-0 left-0 w-1 h-full ${isActive ? 'bg-tertiary shadow-[0_0_10px_rgba(196,192,255,0.6)]' : 'bg-outline-variant'}`} />
        <h4 className="font-label-caps text-[10px] text-on-surface-variant mb-3 tracking-widest">SECURE JOIN PASS</h4>
        <div className="flex items-center gap-4">
          {qrDataUrl ? (
            <div className={`w-16 h-16 bg-white p-1 rounded-sm shrink-0 ${isActive ? 'border border-secondary/50 shadow-[0_0_10px_rgba(240,192,62,0.2)]' : 'border border-outline-variant/50'}`}>
              <img alt="QR Code" className="w-full h-full object-contain" src={qrDataUrl} />
            </div>
          ) : (
            <div className="w-16 h-16 bg-surface-dim p-1 rounded-sm border border-outline-variant/50 shrink-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-outline-variant text-[24px]">qr_code_scanner</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="bg-surface-dim border border-outline-variant/50 rounded p-2 flex items-center justify-between group-hover:border-tertiary/50 transition-colors">
              <span className="font-body-md text-[13px] text-on-surface truncate font-mono">
                {joinUrl.replace(/^https?:\/\//, '').replace(/\?.*$/, '')}
              </span>
              <button onClick={handleCopy} className="text-tertiary hover:text-white transition-colors pl-2 shrink-0">
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
            <p className="mt-2 text-[11px] text-outline-variant truncate font-mono">
              {copied ? 'Link copied!' : joinUrl}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CandidateForm({ candidate, onSave, onCancel }) {
  const [name, setName] = useState(candidate?.name ?? '');
  const [logoFile, setLogoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(
    candidate?.logoUrl ? `${apiBaseUrl}${candidate.logoUrl}` : ''
  );

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;

    let data;
    if (candidate) {
      const res = await apiFetch(`/api/candidates/${candidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        alert('Failed to update candidate.');
        return;
      }
      data = await res.json();
    } else {
      const res = await apiFetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        alert('Failed to create candidate.');
        return;
      }
      data = await res.json();
    }

    if (logoFile && data.id) {
      const fd = new FormData();
      fd.append('logo', logoFile);
      await apiFetch(`/api/candidates/${data.id}/logo`, { method: 'POST', body: fd });
    }

    onSave();
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
        className="bg-surface-container-high border border-secondary/30 rounded-xl w-full max-w-md overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
      >
        <div className="px-6 py-4 border-b border-outline/20">
          <h3 className="font-headline-md text-headline-md text-secondary">
            {candidate ? 'Edit Candidate' : 'Add Candidate'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          <div>
            <label className="font-label-caps text-[12px] text-on-surface-variant tracking-widest block mb-2">NAME</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-surface-container border border-outline/40 rounded p-3 text-on-surface font-body-md focus:border-secondary focus:outline-none transition-colors"
              placeholder="Team name"
              autoFocus
            />
          </div>
          <div>
            <label className="font-label-caps text-[12px] text-on-surface-variant tracking-widest block mb-2">LOGO</label>
            <div className="flex items-center gap-4">
              {previewUrl && (
                <div className="w-16 h-16 rounded-full border-2 border-secondary overflow-hidden shrink-0">
                  <img src={previewUrl} alt="Logo preview" className="w-full h-full object-cover" />
                </div>
              )}
              <label className="flex-1 cursor-pointer bg-surface-container border border-dashed border-outline/40 rounded p-3 text-center text-on-surface-variant hover:border-secondary/50 hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-lg align-middle mr-2">upload</span>
                {logoFile ? logoFile.name : 'Choose logo'}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>
          </div>
        </form>
        <div className="px-6 py-4 border-t border-outline/20 flex justify-end gap-3">
          <button onClick={onCancel} className="px-6 py-2 text-on-surface-variant hover:text-on-surface transition-colors font-label-caps text-label-caps">
            CANCEL
          </button>
          <button onClick={handleSubmit} className="px-8 py-2 bg-secondary text-on-secondary clip-diamond font-label-caps text-label-caps hover:brightness-110 transition-all">
            {candidate ? 'SAVE' : 'ADD CANDIDATE'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function CandidatesPage() {
  const { token, socket } = useAdminAuth();
  const [candidates, setCandidates] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);

  const fetchCandidates = useCallback(async () => {
    const res = await apiFetch('/api/candidates');
    if (res.ok) setCandidates(await res.json());
  }, []);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  // Subscribe to candidates:updated (admin-only room, Section 12)
  useEffect(() => {
    if (!socket) return;
    function onCandidatesUpdated(list) {
      setCandidates(list);
    }
    socket.on('candidates:updated', onCandidatesUpdated);
    return () => { socket.off('candidates:updated', onCandidatesUpdated); };
  }, [socket]);

  async function handleDelete(id) {
    if (!confirm('Remove this candidate?')) return;
    const res = await apiFetch(`/api/candidates/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    }
  }

  function handleEdit(c) {
    setEditingCandidate(c);
    setShowForm(true);
  }

  function handleFormSave() {
    setShowForm(false);
    setEditingCandidate(null);
    fetchCandidates();
  }

  return (
    <div className="flex flex-col gap-stack-lg">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-secondary/20">
        <div>
          <h2 className="font-display-lg text-display-lg text-secondary drop-shadow-[0_0_15px_rgba(240,192,62,0.4)]">
            CANDIDATE ROSTER
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-2xl">
            Manage competing teams, generate secure join passes, and control active status for the live broadcast session.
          </p>
        </div>
        <button
          onClick={() => { setEditingCandidate(null); setShowForm(true); }}
          className="hex-clip bg-secondary/10 border border-secondary text-secondary px-8 py-3 font-label-caps text-label-caps flex items-center gap-2 hover:bg-secondary/20 shadow-[inset_0_0_15px_rgba(240,192,62,0.3),0_0_20px_rgba(240,192,62,0.2)] transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          ADD CANDIDATE
        </button>
      </header>

      {showForm && (
        <CandidateForm
          candidate={editingCandidate}
          onSave={handleFormSave}
          onCancel={() => { setShowForm(false); setEditingCandidate(null); }}
        />
      )}

      {candidates.filter((c) => c.isActive).length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <span className="material-symbols-outlined text-[64px] text-outline-variant mb-4 block">groups</span>
          <p className="text-on-surface-variant font-body-lg">No candidates yet. Click "Add Candidate" to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {candidates.filter((c) => c.isActive).map((c) => (
            <CandidateCard
              key={c.id}
              candidate={c}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
