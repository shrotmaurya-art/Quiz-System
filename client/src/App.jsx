import { BrowserRouter, Routes, Route, Navigate, useParams, useSearchParams } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import LiveControl from './admin/LiveControl';
import MatchesPage from './admin/MatchesPage';
import RoundsQuestions from './admin/RoundsQuestions';
import CandidatesPage from './admin/CandidatesPage';
import SettingsBackup from './admin/SettingsBackup';
import AdminLogin from './admin/AdminLogin';
import { AdminAuthProvider, useAdminAuth } from './admin/AdminAuth';
import DisplayShell from './display/DisplayShell';
import CandidateTablet from './candidate/CandidateTablet';
import { BrandingProvider } from './shared/BrandingContext';

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
        <Route path="matches" element={<MatchesPage />} />
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
    <BrandingProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/display" element={<DisplayShell />} />
          <Route path="/play/:candidateId" element={<CandidateTablet />} />
          <Route
            path="/*"
            element={
              <AdminAuthProvider>
                <AdminApp />
              </AdminAuthProvider>
            }
          />
        </Routes>
      </BrowserRouter>
    </BrandingProvider>
  );
}
