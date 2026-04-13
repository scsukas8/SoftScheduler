import React from 'react';
import { useTransition, animated } from '@react-spring/web';
import TaskCard from './TaskCard';

export default function ScheduleView({ tasks, onCompleteTask, onEditTask }) {
  // Local state to track items that should be 'leaving' the list
  const [cooldownIds, setCooldownIds] = React.useState(new Set());

  // Sort tasks by time remaining (most overdue/urgent first)
  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      const getTargetTime = (task) => {
        const completedDate = (task.completed_at && typeof task.completed_at.toDate === 'function') 
          ? task.completed_at.toDate() 
          : new Date(task.completed_at || Date.now());
        return completedDate.getTime() + (task.interval_days || 1) * 24 * 60 * 60 * 1000;
      };
      return getTargetTime(a) - getTargetTime(b);
    });
  }, [tasks]);

  // Filter out tasks that are currently "cooling down" after a completion
  const filteredTasks = React.useMemo(() => {
    return sortedTasks.filter(task => !cooldownIds.has(task.id));
  }, [sortedTasks, cooldownIds]);

  const transitions = useTransition(filteredTasks, {
    key: (task) => task.id,
    from: { opacity: 0, transform: 'translateX(-20px)', height: 0, marginBottom: 0 },
    enter: { opacity: 1, transform: 'translateX(0)', height: 72, marginBottom: 12 },
    leave: [
      { transform: 'translateX(100%)', opacity: 0 },
      { height: 0, marginBottom: 0 }
    ],
    onRest: (result, spring, item) => {
      // Once an item finished sliding out (leave), we clear its cooldown
      // This allows it to slide back in at its new position
      if (item && cooldownIds.has(item.id)) {
        setCooldownIds(prev => {
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      }
    },
    config: { tension: 250, friction: 25 },
  });

  const handleCompleteWithCooldown = (taskId) => {
    setCooldownIds(prev => new Set(prev).add(taskId));
    onCompleteTask(taskId);
  };

  return (
    <div className="schedule-view animate-fade-in">
      <h2 style={{ marginBottom: '24px' }}>Schedule View</h2>
      <div className="task-list" style={{ position: 'relative' }}>
        {transitions((style, task) => (
          <animated.div style={style}>
            <TaskCard 
              task={task} 
              onComplete={() => handleCompleteWithCooldown(task.id)}
              onEdit={onEditTask}
            />
          </animated.div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="empty-state">
            <p>No tasks scheduled.</p>
          </div>
        )}
      </div>
    </div>
  );
}
