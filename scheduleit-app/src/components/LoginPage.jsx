import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage = ({ user, onLogin }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/tasks');
    }
  }, [user, navigate]);

  return (
    <div className="login-wrapper">
      <div className="login-card animate-scale-in">
        <div className="login-header">
          <div className="login-logo">
            <svg viewBox="0 0 24 24" width="60" height="60" fill="none" stroke="url(#login-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="login-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to manage your soft schedule.</p>
        </div>
        
        <button className="google-auth-btn" onClick={onLogin}>
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
          <span>Sign in with Google</span>
        </button>
        
        <div className="login-footer">
          <button className="back-link" onClick={() => navigate('/')}>
            ← Back to Home
          </button>
        </div>
      </div>
      
      <div className="login-background">
        <div className="glow-orb orb-1"></div>
        <div className="glow-orb orb-2"></div>
      </div>
    </div>
  );
};

export default LoginPage;
