import { calculateTimeRemaining, formatTimeRemaining } from '@scheduleit/core';
import './TaskCard.css';

export function TaskCard({ task, onComplete, onEdit, onSchedule }) {
  const { isOverdue, daysRemaining, windowStartDiff, windowEndDiff, hoursTotal, isScheduled } = calculateTimeRemaining(
    task.completed_at, 
    task.interval_days, 
    task.scheduled_date,
    task.wiggle_room,
    task.wiggle_type
  );
  const { isInRange, isSoon, isDistant, isCritical, formattedTime } = formatTimeRemaining(isOverdue, daysRemaining, windowStartDiff, windowEndDiff, isScheduled);

  return (
    <div 
      className={`task-card ${isCritical ? 'critical' : ''} ${isInRange ? 'in-range' : ''} ${isSoon ? 'soon' : ''} ${isDistant ? 'distant' : ''} ${isScheduled ? 'scheduled' : ''}`}
      style={{ '--task-color': task.color }}
    >
      <div className="task-indicator" style={{ backgroundColor: task.color }} />
      
      <div className="task-content">
        <h3 className={isCritical ? 'overdue-title' : ''}>{task.name}</h3>
        <p className={isCritical ? 'overdue-text' : ''}>{formattedTime}</p>
      </div>
      
      <div className="task-actions">
        <button 
          className="action-btn edit-btn" 
          onClick={() => onEdit(task)}
          aria-label="Edit Task"
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a0.996 0.996 0 0 0 0-1.41l-2.34-2.34a0.996 0.996 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
          </svg>
        </button>

        {/* Action Logic:
            - Overdue: Reschedule AND Complete
            - In-Range: Complete
            - Soon/Distant: Schedule (Lock)
        */}
        {(isCritical || !isInRange) && (
          <button 
            className="action-btn schedule-btn" 
            onClick={() => onSchedule(task.id, isCritical ? 'reschedule' : 'lock')}
            aria-label={isCritical ? "Reschedule Task" : "Schedule Task"}
          >
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" fill="currentColor"/>
            </svg>
          </button>
        )}

        {(isCritical || isInRange) && (
          <button 
            className="action-btn complete-btn" 
            onClick={() => onComplete(task.id)}
            aria-label="Complete Task"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="currentColor"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default TaskCard;
