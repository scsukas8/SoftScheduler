import { calculateTimeRemaining, formatTimeRemaining } from '../utils/dateUtils';
import './TaskCard.css'; // Add basic styling definitions here

export default function TaskCard({ task, onComplete, onViewDetails }) {
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
          className="action-btn details-btn" 
          onClick={() => onViewDetails(task.id)}
          aria-label="View Details"
        >
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z" fill="currentColor"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
