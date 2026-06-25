import React, { useState, useEffect } from 'react';
import { api, getStoredToken, clearToken } from './apiClient';
import LoginPage from './pages/LoginPage';
import MainLayout from './components/layout/MainLayout';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Auto‑login: check for existing JWT token
useEffect(() => {
  const token = getStoredToken();
  if (token) {
    // Verify token with server
    api.get('/api/auth/me')
      .then(() => setIsLoggedIn(true))
      .catch(() => {
        clearToken();
        setIsLoggedIn(false);
      })
      .finally(() => setLoading(false));
  } else {
    setIsLoggedIn(false);
    setLoading(false);
  }
}, []);

  // Listen for explicit logout events (if any component triggers them)
  useEffect(() => {
    const onLogout = () => {
      clearToken();
      setIsLoggedIn(false);
    };
    const onLogin = () => {
      const token = getStoredToken();
      if (token) {
        setIsLoggedIn(true);
      }
    };
    window.addEventListener('crm:logout', onLogout);
    window.addEventListener('crm:login', onLogin);
    return () => {
      window.removeEventListener('crm:logout', onLogout);
      window.removeEventListener('crm:login', onLogin);
    };
  }, []);

  if (loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Render appropriate UI based on login state
  return isLoggedIn ? (
    <MainLayout />
  ) : (
    // Show login page when not authenticated
    <LoginPage />
  );
}

export default App;