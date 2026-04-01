import React from 'react';
import TaskCard from './TaskCard';

export default function ScheduleView({ tasks, onCompleteTask }) {
  // Sort tasks by time remaining (most overdue/urgent first)
  const sortedTasks = [...tasks].sort((a, b) => {
    // We can use a simple date comparison for urgency
    const targetA = new Date(new Date(a.completed_at).getTime() + a.interval_days * 24 * 60 * 60 * 1000);
    const targetB = new Date(new Date(b.completed_at).getTime() + b.interval_days * 24 * 60 * 60 * 1000);
    return targetA - targetB;
  });

  return (
    <div className="schedule-view animate-fade-in">
      <h2 style={{ marginBottom: '24px' }}>Schedule View</h2>
      <div className="task-list">
        {sortedTasks.map(task => (
          <TaskCard 
            key={task.id} 
            task={task} 
            onComplete={() => onCompleteTask(task.id)}
            onViewDetails={(id) => console.log('View details', id)}
          />
        ))}
        {sortedTasks.length === 0 && (
          <div className="empty-state">
            <p>No tasks scheduled.</p>
          </div>
        )}
      </div>
    </div>
  );
}
