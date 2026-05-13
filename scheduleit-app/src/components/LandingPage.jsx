import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { TOUR_SLIDES, MARKETING_COPY } from '@scheduleit/core';
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
            <img src="/icon.png" alt="SoftSchedule Logo" style={{ width: '32px', height: '32px', marginRight: '10px' }} />
            <span>{MARKETING_COPY.hero.title}</span>
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
            <img src="/icon.png" alt="SoftSchedule Logo Large" style={{ width: '120px', height: '120px' }} />
          </div>
          <h1>{MARKETING_COPY.hero.title}</h1>
          <p className="hero-subtitle">{MARKETING_COPY.hero.subtitle}</p>
          
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
          {TOUR_SLIDES.map((slide, index) => (
            <div key={slide.id} className={`info-card ${index % 2 !== 0 ? 'reverse' : ''} animate-on-scroll`}>
              <div className="info-text">
                <span className="feature-tag" style={{ background: slide.tagBg, color: slide.tagColor }}>
                  {slide.tag}
                </span>
                <h2>{slide.title}</h2>
                <p>{slide.description}</p>
              </div>
              <div className="info-visual">
                {slide.id === 1 && (
                  <div className="mock-clock">
                    <div className="clock-hand"></div>
                    <div className="clock-ripple"></div>
                  </div>
                )}
                {slide.id === 2 && (
                  <div className="mock-calendar">
                    <div className="mock-day"></div>
                    <div className="mock-day active">
                      <div className="mock-bubble"></div>
                    </div>
                    <div className="mock-day"></div>
                  </div>
                )}
                {slide.id === 3 && (
                  <div className="mock-list">
                    <div className="mock-item overdue"></div>
                    <div className="mock-item due"></div>
                    <div className="mock-item soon"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <div className="footer-content">
          <p className="footer-branding">{MARKETING_COPY.footer.branding} &copy; {new Date().getFullYear()}</p>
          <div className="footer-links">
             <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
