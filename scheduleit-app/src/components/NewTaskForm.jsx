import React, { useState } from 'react';
import './NewTaskForm.css';

export default function NewTaskForm({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [frequencyInterval, setFrequencyInterval] = useState(1);
  const [frequencyUnit, setFrequencyUnit] = useState('days');
  const [wiggleRoom, setWiggleRoom] = useState(0);
  const [firstDueDate, setFirstDueDate] = useState('');
  const [color, setColor] = useState('var(--color-purple)'); // Default color

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

    // Determine the completed_at date to trick the system into making the first due date right
    const targetDate = new Date(firstDueDate);
    const completedAt = new Date(targetDate.getTime() - intervalDays * 24 * 60 * 60 * 1000);

    onSave({
      id: Date.now().toString(),
      name,
      interval_days: intervalDays,
      wiggle_room: parseInt(wiggleRoom, 10),
      completed_at: completedAt.toISOString(),
      color
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-in">
        <div className="modal-header">
          <h2>New Task</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" fill="currentColor"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="task-form">
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
            <label>Wiggle Room: + or -</label>
            <div className="frequency-inputs">
              <input 
                type="number" 
                min="0" 
                value={wiggleRoom} 
                onChange={e => setWiggleRoom(e.target.value)}
                style={{ width: '80px' }}
              />
              <span>days</span>
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

          <button type="submit" className="submit-btn" style={{ '--btn-color': color }}>
            ScheduleIt!
          </button>
        </form>
      </div>
    </div>
  );
}
