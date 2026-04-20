import React from 'react';
import { calculateTimeRemaining } from '@scheduleit/core';
import { useTransition, animated } from '@react-spring/web';
import TaskCard from './TaskCard';

export default function ScheduleView({ tasks, onCompleteTask, onEditTask, onScheduleTask }) {
  // Local state to track items that should be 'leaving' the list
  const [cooldownIds, setCooldownIds] = React.useState(new Set());

  // Sort tasks by time remaining (most overdue/urgent first)
  const sortedTasks = React.useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aInfo = calculateTimeRemaining(a.completed_at, a.interval_days, a.scheduled_date, a.wiggle_room, a.wiggle_type);
      const bInfo = calculateTimeRemaining(b.completed_at, b.interval_days, b.scheduled_date, b.wiggle_room, b.wiggle_type);
      
      const getPriority = (info) => {
        // Tier 0: Overdue or Due Now (unlocked)
        if (info.windowEndDiff < 0 || (info.windowStartDiff <= 0 && !info.isScheduled)) return 0;
        // Tier 1: Scheduled (locked commitment)
        if (info.isScheduled) return 1;
        // Tier 2: Soon (unlocked, next 7 days)
        if (info.windowStartDiff <= 7) return 2;
        // Tier 3: Distant
        return 3;
      };

      const aPrior = getPriority(aInfo);
      const bPrior = getPriority(bInfo);

      if (aPrior !== bPrior) return aPrior - bPrior;

      // Internal sorting within the same tier
      if (aPrior <= 1) {
        // Overdue, Due, or Scheduled: sort by deadline/lock-date
        return aInfo.windowEndDiff - bInfo.windowEndDiff;
      } else {
        // Soon or Distant: sort by horizon (first possible day)
        return aInfo.windowStartDiff - bInfo.windowStartDiff;
      }
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
      <h2>Upcoming Schedule</h2>
      <div className="task-list" style={{ position: 'relative' }}>
        {transitions((style, task) => (
          <animated.div style={style}>
            <TaskCard 
              task={task} 
              onComplete={() => handleCompleteWithCooldown(task.id)}
              onEdit={onEditTask}
              onSchedule={onScheduleTask}
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
