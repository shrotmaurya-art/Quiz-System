import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { clearAdminToken, apiFetch, setAdminToken, setUnauthorizedHandler } from '../shared/api';
import { createSocket } from '../shared/socket';

const AdminAuthContext = createContext(null);

function isTokenSocketError(error) {
  return /authentication|invalid admin session token|token/i.test(error?.message ?? '');
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [sessionMessage, setSessionMessage] = useState('');
  const socketRef = useRef(null);

  const clearSession = useCallback((message = '') => {
    const socket = socketRef.current;
    if (socket) {
      socket.off('connect_error');
      socket.disconnect();
      socketRef.current = null;
    }
    clearAdminToken();
    setToken(null);
    setSessionMessage(message);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession('Your admin session has expired. Please enter the PIN again.'));
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (pin) => {
    const response = await apiFetch('/api/admin/login', {
      method: 'POST',
      skipAuth: true,
      skipUnauthorized: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const error = new Error(body.error || 'Unable to sign in.');
      error.status = response.status;
      throw error;
    }

    const { token: nextToken } = await response.json();
    if (!nextToken) {
      throw new Error('The server did not return an admin session token.');
    }

    setAdminToken(nextToken);
    setToken(nextToken);
    setSessionMessage('');

    // This is intentionally created only after the REST PIN check succeeds.
    const socket = createSocket({ auth: { token: nextToken } });
    socketRef.current = socket;
    socket.on('connect_error', (error) => {
      if (isTokenSocketError(error)) {
        clearSession('Your admin session is no longer valid. Please enter the PIN again.');
      }
    });
  }, [clearSession]);

  const value = {
    token,
    socket: socketRef.current,
    sessionMessage,
    login,
    logout: clearSession,
  };

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider.');
  }
  return context;
}
