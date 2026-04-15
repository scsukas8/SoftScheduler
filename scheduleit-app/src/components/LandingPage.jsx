import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = ({ user, isDark, setIsDark }) => {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing-wrapper">
      <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <div className="nav-logo">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span>SoftSchedule</span>
          </div>
          <div className="nav-actions">
            <button className="nav-theme-toggle" onClick={() => setIsDark(!isDark)} title="Toggle theme">
              {isDark ? '🌙' : '☀️'}
            </button>
            {user ? (
              <button className="nav-login-btn" onClick={() => navigate('/tasks')}>Go to App</button>
            ) : (
              <button className="nav-login-btn" onClick={() => navigate('/login')}>Login</button>
            )}
          </div>
        </div>
      </nav>

      <section className="hero-section">
        <div className="hero-background">
          <div className="glow-orb orb-1"></div>
          <div className="glow-orb orb-2"></div>
        </div>
        <div className="hero-content">
          <div className="hero-logo-large">
            <svg viewBox="0 0 24 24" width="120" height="120" fill="none" stroke="url(#hero-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="hero-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <h1>SoftSchedule</h1>
          <p className="hero-subtitle">Soft scheduling for a calmer, more productive life.</p>
          
          <div className="get-started-box">
            <h3>Get Started</h3>
            <div className="platform-buttons">
              <button className="platform-btn web" onClick={() => navigate(user ? '/tasks' : '/login')}>
                <span className="icon">🌐</span>
                <span className="label">Web App</span>
              </button>
              <button className="platform-btn disabled" title="Coming soon">
                <span className="icon">🤖</span>
                <span className="label">Android</span>
              </button>
              <button className="platform-btn disabled" title="Coming soon">
                <span className="icon">🍎</span>
                <span className="label">iOS</span>
              </button>
            </div>
          </div>
        </div>
        <div className="scroll-indicator">
          <div className="mouse">
            <div className="wheel"></div>
          </div>
          <p>Scroll to explore</p>
        </div>
      </section>

      <section className="info-section">
        <div className="info-container">
          <div className="info-card animate-on-scroll">
            <div className="info-text">
              <h2>Flexible Wiggle Room</h2>
              <p>Life doesn't always happen on a fixed schedule. SoftSchedule gives you "wiggle room" for your tasks, so you can breathe easier when things shift.</p>
            </div>
            <div className="info-visual calendar-visual">
              {/* Decorative CSS Visual */}
              <div className="mock-calendar">
                <div className="mock-day"></div>
                <div className="mock-day active">
                  <div className="mock-bubble"></div>
                </div>
                <div className="mock-day"></div>
              </div>
            </div>
          </div>

          <div className="info-card reverse animate-on-scroll">
            <div className="info-text">
              <h2>Urgency at a Glance</h2>
              <p>Our intelligent sorting system puts overdue and imminent tasks at the top, while keeping future goals softly on the horizon.</p>
            </div>
            <div className="info-visual list-visual">
               <div className="mock-list">
                <div className="mock-item overdue"></div>
                <div className="mock-item due"></div>
                <div className="mock-item soon"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} SoftSchedule. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
