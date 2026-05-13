import React from 'react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
  return (
    <div className="privacy-container" style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '40px 20px',
      lineHeight: '1.6',
      color: 'var(--text-primary)',
      backgroundColor: 'var(--bg-primary)',
      minHeight: '100vh'
    }}>
      <Link to="/" style={{ color: '#a48cff', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Home
      </Link>
      
      <h1>Privacy Policy for SoftSchedule</h1>
      <p>Last Updated: May 13, 2026</p>

      <section>
        <h2>1. Introduction</h2>
        <p>
          Welcome to SoftSchedule. We value your privacy and are committed to protecting your personal data. 
          This Privacy Policy explains how we collect, use, and safeguard your information when you use our 
          web and mobile applications.
        </p>
      </section>

      <section>
        <h2>2. Data We Collect</h2>
        <p><strong>Authentication Data:</strong> We use Firebase Authentication to allow you to sign in via Google or Email. We store your name, email address, and profile picture URL.</p>
        <p><strong>User-Generated Content:</strong> We store the tasks, schedules, and preferences you create within the app using Firebase Firestore.</p>
        <p><strong>Device Information:</strong> We may collect basic device info (OS version, device model) to help troubleshoot bugs.</p>
      </section>

      <section>
        <h2>3. How We Use Your Data</h2>
        <p>We use your data solely to provide the SoftSchedule service, including:</p>
        <ul>
          <li>Syncing your tasks across devices.</li>
          <li>Sending you "Soft Scheduling" notifications and briefings.</li>
          <li>Maintaining and improving app performance.</li>
        </ul>
      </section>

      <section>
        <h2>4. Data Storage and Security</h2>
        <p>Your data is stored securely using Google Firebase. We do not sell your data to third parties.</p>
      </section>

      <section>
        <h2>5. Your Rights</h2>
        <p>You can request to delete your account and all associated data at any time by contacting us at symmetry.studio.dev@gmail.com.</p>
      </section>

      <section>
        <h2>6. Contact Us</h2>
        <p>If you have any questions about this policy, please reach out to us at symmetry.studio.dev@gmail.com.</p>
      </section>

      <footer style={{ marginTop: '50px', fontSize: '0.8rem', opacity: '0.6' }}>
        © 2026 Symmetry Studio. All rights reserved.
      </footer>
    </div>
  );
};

export default PrivacyPolicy;
