import React from 'react';
import TaskCard from './TaskCard';

export default function ScheduleView({ tasks, onCompleteTask }) {
  // Sort tasks by time remaining (most overdue/urgent first)
  const sortedTasks = [...tasks].sort((a, b) => {
    // Robust date extraction for sorting
    const getTargetTime = (task) => {
      const completedDate = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at || Date.now());
      return completedDate.getTime() + (task.interval_days || 1) * 24 * 60 * 60 * 1000;
    };

    return getTargetTime(a) - getTargetTime(b);
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
