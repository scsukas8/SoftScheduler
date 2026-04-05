import React, { useState } from 'react';
import { useSpring, animated } from '@react-spring/web';
import './NewTaskForm.css';

export default function NewTaskForm({ onClose, onSave, onDelete, task = null, initialDueDate = '' }) {
  const [name, setName] = useState(task?.name || '');
  const [frequencyInterval, setFrequencyInterval] = useState(
    task ? (task.interval_days % 7 === 0 ? task.interval_days / 7 : task.interval_days) : 1
  );
  const [frequencyUnit, setFrequencyUnit] = useState(
    task ? (task.interval_days % 7 === 0 ? 'weeks' : 'days') : 'days'
  );
  const [wiggleRoom, setWiggleRoom] = useState(task?.wiggle_room || 0);
  const [wiggleType, setWiggleType] = useState(task?.wiggle_type || 'symmetric');
  
  // Calculate next due date display for existing tasks or use prefill
  const getInitialDueDate = () => {
    if (task) {
      const completedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at);
      const dueDate = new Date(completedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
      return dueDate.toISOString().split('T')[0];
    }
    return initialDueDate ? initialDueDate.split('T')[0] : '';
  };
  
  const [nextDueDate, setNextDueDate] = useState(getInitialDueDate());
  const [color, setColor] = useState(task?.color || 'var(--color-purple)');
  const [error, setError] = useState('');

  const colors = [
    { name: 'Purple', val: 'var(--color-purple)' },
    { name: 'Green', val: 'var(--color-green)' },
    { name: 'Pink', val: 'var(--color-pink)' },
    { name: 'Blue', val: 'var(--color-blue)' },
    { name: 'Orange', val: 'var(--color-orange)' },
    { name: 'Peach', val: 'var(--color-peach)' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!name || !nextDueDate) return;

    // ASCII validation
    if (!/^[\x20-\x7E]*$/.test(name)) {
      setError('Task name must contain only standard characters (ASCII).');
      return;
    }

    if (name.length > 100) {
      setError('Task name must be under 100 characters.');
      return;
    }

    let intervalDays = parseInt(frequencyInterval, 10) || 1;
    if (frequencyUnit === 'weeks') {
      intervalDays *= 7;
    }

    // 5 year limit (1825 days)
    if (intervalDays > 1825) {
      setError('Task interval cannot exceed 5 years.');
      return;
    }

    const wiggle = parseInt(wiggleRoom, 10) || 0;
    if (wiggle > 7) {
      setError('Wiggle room cannot exceed 7 days.');
      return;
    }

    // Determine the completed_at date based on the target next due date
    // Use local time parsing to avoid UTC midnight shifts
    const [year, month, day] = nextDueDate.split('-').map(Number);
    const targetDate = new Date(year, month - 1, day);
    const completedAt = new Date(targetDate.getTime() - intervalDays * 24 * 60 * 60 * 1000);

    onSave({
      ...(task || {}), // Keep existing ID and other firestore meta if editing
      name,
      interval_days: intervalDays,
      wiggle_room: wiggle,
      wiggle_type: wiggleType,
      completed_at: completedAt.toISOString(),
      color
    });
  };

  const spring = useSpring({
    from: { opacity: 0, transform: 'scale(0.8)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: { tension: 200, friction: 15 }
  });

  return (
    <div className="modal-overlay">
      <animated.div style={spring} className="modal-content">
        <div className="modal-header">
          <h2>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label>Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => {
                const val = e.target.value;
                if (val.length <= 100) setName(val);
              }}
              placeholder="e.g. Wash sheets"
              maxLength="100"
              required 
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Frequency (Every):</label>
              <div className="frequency-inputs">
                <input 
                  type="number" 
                  min="1" 
                  max={frequencyUnit === 'weeks' ? 260 : 1825}
                  value={frequencyInterval} 
                  onChange={e => {
                    const maxVal = frequencyUnit === 'weeks' ? 260 : 1825;
                    const val = e.target.value;
                    if (val === '') {
                      setFrequencyInterval('');
                    } else {
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed)) {
                        setFrequencyInterval(Math.min(maxVal, Math.max(0, parsed)));
                      }
                    }
                  }}
                  style={{ width: '80px' }}
                />
                <select 
                  value={frequencyUnit} 
                  onChange={e => {
                    const newUnit = e.target.value;
                    setFrequencyUnit(newUnit);
                    const maxVal = newUnit === 'weeks' ? 260 : 1825;
                    setFrequencyInterval(prev => Math.min(maxVal, prev));
                  }}
                >
                  <option value="days">days</option>
                  <option value="weeks">weeks</option>
                </select>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Wiggle Room:</label>
            <div className="frequency-inputs">
              <input 
                type="number" 
                min="0" 
                max="7"
                value={wiggleRoom} 
                onChange={e => {
                  const val = e.target.value;
                  if (val === '') {
                    setWiggleRoom('');
                  } else {
                    const parsed = parseInt(val, 10);
                    if (!isNaN(parsed)) {
                      setWiggleRoom(Math.min(7, Math.max(0, parsed)));
                    }
                  }
                }}
                style={{ width: '80px' }}
              />
              <select 
                value={wiggleType} 
                onChange={e => setWiggleType(e.target.value)}
              >
                <option value="symmetric">± days</option>
                <option value="late-only">+ days only</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Next due date:</label>
            <input 
              type="date" 
              value={nextDueDate} 
              onChange={e => setNextDueDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Color Theme:</label>
            <div className="color-swatches">
              {colors.map(c => (
                <button
                  key={c.name}
                  type="button"
                  className={`color-swatch ${color === c.val ? 'selected' : ''}`}
                  style={{ backgroundColor: c.val }}
                  onClick={() => setColor(c.val)}
                  aria-label={c.name}
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            {task && (
              <button 
                type="button" 
                className="delete-btn" 
                onClick={() => onDelete(task.id)}
              >
                Delete Task
              </button>
            )}
            <button type="submit" className="submit-btn" style={{ '--btn-color': color }}>
              {task ? 'Update Task' : 'SoftSchedule!'}
            </button>
          </div>
        </form>
      </animated.div>
    </div>
  );
}
