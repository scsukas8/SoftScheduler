import React, { useState } from 'react';
import './ScheduleModal.css';

export default function ScheduleModal({ task, onClose, onSchedule, mode = 'lock' }) {
  const isReschedule = mode === 'reschedule';
  const [selectedDate, setSelectedDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedDate) {
      // Ensure we store as a full ISO string for consistency
      onSchedule(task.id, new Date(selectedDate).toISOString(), mode);
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content schedule-modal animate-grow-fade" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isReschedule ? 'Reschedule Window' : 'Schedule Task'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="task-form">
          <div className="task-preview">
            <div className="task-indicator" style={{ backgroundColor: task.color || '#a48cff' }} />
            <div className="task-info">
              <h3>{task.name}</h3>
              <p>{isReschedule ? 'Shift the entire target window.' : 'Lock to a specific firm date.'}</p>
            </div>
          </div>

          <div className="form-group">
            <label>{isReschedule ? 'New Target Date (shifts window):' : 'Lock Date (wiggle = 0):'}</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-actions">
            <button type="button" className="delete-btn" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" style={{ '--btn-color': task.color || 'var(--color-purple)', flex: 2 }}>
              {isReschedule ? 'Reschedule' : 'Schedule'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
