import { calculateTimeRemaining, formatTimeRemaining } from '@scheduleit/core';
import './TaskCard.css'; // Add basic styling definitions here

export default function TaskCard({ task, onComplete, onEdit }) {
  const daysRemaining = calculateTimeRemaining(task.completed_at, task.interval_days);
  const timeString = formatTimeRemaining(daysRemaining);

  // Fade out distant tasks (starting at 7 days, maxing at 14 days)
  let opacity = 1;
  if (daysRemaining > 7) {
    const fadeAmount = (daysRemaining - 7) / 7; // 0 to 1 over 7 days
    // Max fade is 0.4 opacity
    opacity = Math.max(0.4, 1 - (fadeAmount * 0.6));
  }

  return (
    <div 
      className="task-card" 
      style={{ '--task-color': task.color, opacity }}
    >
      <div className="task-content">
        <h3>{task.name}</h3>
        <p>{timeString}</p>
      </div>
      
      <div className="task-actions">
        <button 
          className="action-btn complete-btn" 
          onClick={() => onComplete(task.id)}
          aria-label="Complete Task"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
          </svg>
        </button>
        <button 
          className="action-btn edit-btn" 
          onClick={() => onEdit(task)}
          aria-label="Edit Task"
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a0.996 0.996 0 0 0 0-1.41l-2.34-2.34a0.996 0.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
