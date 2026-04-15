import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import Dashboard from './Dashboard';
import LandingPage from './components/LandingPage';
import LoginPage from './components/LoginPage';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('softschedule-theme') === 'dark' || 
           (!localStorage.getItem('softschedule-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Theme Sync
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('softschedule-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('softschedule-theme', 'light');
    }
  }, [isDark]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
      alert(`Login failed: ${error.message || "Unknown error"}.`);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) {
    return <div className="loading-screen">Loading SoftSchedule...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage user={user} isDark={isDark} setIsDark={setIsDark} />} />
        <Route path="/login" element={<LoginPage user={user} onLogin={handleLogin} />} />
        <Route 
          path="/tasks" 
          element={user ? <Dashboard user={user} view="schedule" isDark={isDark} setIsDark={setIsDark} handleLogout={handleLogout} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/calendar" 
          element={user ? <Dashboard user={user} view="calendar" isDark={isDark} setIsDark={setIsDark} handleLogout={handleLogout} /> : <Navigate to="/" />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;
