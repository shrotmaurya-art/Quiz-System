import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './admin/AdminLayout';
import LiveControl from './admin/LiveControl';
import RoundsQuestions from './admin/RoundsQuestions';
import CandidatesPage from './admin/CandidatesPage';
import SettingsBackup from './admin/SettingsBackup';

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
