import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../shared/api';

export default function QuestionList({ roundId, answerMode, refreshKey, onEdit, onDelete, onAddQuestion }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch(`/api/rounds/${roundId}/questions`);
    if (res.ok) setQuestions(await res.json());
    setLoading(false);
  }, [roundId]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions, refreshKey]);

  if (loading) {
    return (
      <div className="p-8 text-center text-on-surface-variant">
        <span className="material-symbols-outlined text-3xl text-outline animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-y-auto max-h-[500px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/30 text-on-surface-variant font-label-caps text-xs">
              <th className="p-4 font-normal w-12">#</th>
              <th className="p-4 font-normal w-3/5">QUESTION</th>
              {answerMode === 'MCQ' && <th className="p-4 font-normal">ANSWER</th>}
              <th className="p-4 font-normal text-right">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="font-body-md">
            {questions.map((q, i) => (
              <tr key={q.id} className="border-b border-outline-variant/10 hover:bg-surface-container/50 transition-colors group">
                <td className="p-4 text-on-surface-variant">{q.order}</td>
                <td className="p-4 text-on-surface truncate max-w-xs">{q.text}</td>
                {answerMode === 'MCQ' && (
                  <td className="p-4">
                    <span className="text-secondary font-bold">{q.correctOptionKey || '—'}</span>
                  </td>
                )}
                <td className="p-4 text-right">
                  <button
                    onClick={() => onEdit(q)}
                    className="text-outline hover:text-secondary opacity-0 group-hover:opacity-100 transition-all p-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                  </button>
                  <button
                    onClick={() => onDelete(q.id)}
                    className="text-outline hover:text-error opacity-0 group-hover:opacity-100 transition-all p-1 ml-1"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </td>
              </tr>
            ))}
            {questions.length === 0 && (
              <tr>
                <td colSpan={answerMode === 'MCQ' ? 4 : 3} className="p-8 text-center text-outline-variant">
                  No questions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-secondary/20 flex justify-center bg-primary-container/20">
        <button
          onClick={onAddQuestion}
          className="text-secondary font-label-caps text-xs hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-sm">add</span> ADD QUESTION TO ROUND
        </button>
      </div>
    </>
  );
}
