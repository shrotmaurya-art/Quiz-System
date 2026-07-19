import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import LiveControl from './admin/LiveControl';
import RoundsQuestions from './admin/RoundsQuestions';
import CandidatesPage from './admin/CandidatesPage';
import SettingsBackup from './admin/SettingsBackup';
import AdminLogin from './admin/AdminLogin';
import { AdminAuthProvider, useAdminAuth } from './admin/AdminAuth';

function CandidateTablet() {
  const { candidateId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
      <div className="glass-panel rounded-2xl p-12 max-w-lg w-full">
        <span className="material-symbols-outlined text-[64px] text-secondary mb-6 block">sports_esports</span>
        <h1 className="font-display-lg text-display-lg text-secondary mb-4">THE HOT SEAT</h1>
        <div className="mt-6 bg-surface-container-high rounded-lg p-4 border border-outline/20">
          <p className="font-label-caps text-[12px] text-on-surface-variant tracking-widest mb-2">CANDIDATE ID</p>
          <p className="font-mono text-on-surface text-sm break-all">{candidateId}</p>
        </div>
        {token && (
          <div className="mt-3 bg-surface-container-high rounded-lg p-4 border border-outline/20">
            <p className="font-label-caps text-[12px] text-on-surface-variant tracking-widest mb-2">JOIN TOKEN</p>
            <p className="font-mono text-on-surface text-sm break-all">{token}</p>
          </div>
        )}
        <p className="text-on-surface-variant mt-6 font-body-lg">Waiting for the quiz to start...</p>
      </div>
    </div>
  );
}

function AdminApp() {
  const { token } = useAdminAuth();

  if (!token) {
    return <AdminLogin />;
  }

  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="live" replace />} />
        <Route path="live" element={<LiveControl />} />
        <Route path="rounds" element={<RoundsQuestions />} />
        <Route path="candidates" element={<CandidatesPage />} />
        <Route path="settings" element={<SettingsBackup />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/play/:candidateId" element={<CandidateTablet />} />
          <Route path="/*" element={<AdminApp />} />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
