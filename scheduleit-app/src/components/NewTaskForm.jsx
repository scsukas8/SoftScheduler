import React, { useState } from 'react';
import './NewTaskForm.css';

export default function NewTaskForm({ onClose, onSave, onDelete, task = null }) {
  const [name, setName] = useState(task?.name || '');
  const [frequencyInterval, setFrequencyInterval] = useState(
    task ? (task.interval_days % 7 === 0 ? task.interval_days / 7 : task.interval_days) : 1
  );
  const [frequencyUnit, setFrequencyUnit] = useState(
    task ? (task.interval_days % 7 === 0 ? 'weeks' : 'days') : 'days'
  );
  const [wiggleRoom, setWiggleRoom] = useState(task?.wiggle_room || 0);
  const [wiggleType, setWiggleType] = useState(task?.wiggle_type || 'symmetric');
  
  // Calculate first due date display for existing tasks
  const getInitialDueDate = () => {
    if (!task) return '';
    const completedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
      ? task.completed_at.toDate() 
      : new Date(task.completed_at);
    const dueDate = new Date(completedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
    return dueDate.toISOString().split('T')[0];
  };
  
  const [firstDueDate, setFirstDueDate] = useState(getInitialDueDate());
  const [color, setColor] = useState(task?.color || 'var(--color-purple)');

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
    if (!name || !firstDueDate) return;

    let intervalDays = parseInt(frequencyInterval, 10);
    if (frequencyUnit === 'weeks') {
      intervalDays *= 7;
    }

    // Determine the completed_at date based on the target first due date
    const targetDate = new Date(firstDueDate);
    const completedAt = new Date(targetDate.getTime() - intervalDays * 24 * 60 * 60 * 1000);

    onSave({
      ...(task || {}), // Keep existing ID and other firestore meta if editing
      name,
      interval_days: intervalDays,
      wiggle_room: parseInt(wiggleRoom, 10),
      wiggle_type: wiggleType,
      completed_at: completedAt.toISOString(),
      color
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-in">
        <div className="modal-header">
          <h2>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
          {/* ... existing form groups ... */}
          <div className="form-group">
            <label>Name:</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Wash sheets"
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
                  value={frequencyInterval} 
                  onChange={e => setFrequencyInterval(e.target.value)}
                  style={{ width: '80px' }}
                />
                <select 
                  value={frequencyUnit} 
                  onChange={e => setFrequencyUnit(e.target.value)}
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
                value={wiggleRoom} 
                onChange={e => setWiggleRoom(e.target.value)}
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
            <label>First due date:</label>
            <input 
              type="date" 
              value={firstDueDate} 
              onChange={e => setFirstDueDate(e.target.value)}
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
      </div>
    </div>
  );
}
