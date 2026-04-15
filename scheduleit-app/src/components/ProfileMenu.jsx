import React, { useState, useRef, useEffect } from 'react';
import './ProfileMenu.css';

const ProfileMenu = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="profile-menu-container" ref={menuRef}>
      <button 
        className={`profile-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        {user?.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || "User"} className="profile-img" />
        ) : (
          <div className="profile-initial">
            {user?.displayName ? user.displayName[0] : 'U'}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="profile-dropdown animate-fade-slide">
          <div className="dropdown-header">
            <span className="user-name">{user?.displayName}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <div className="dropdown-divider"></div>
          <button className="dropdown-item logout" onClick={onLogout}>
            <span className="icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
