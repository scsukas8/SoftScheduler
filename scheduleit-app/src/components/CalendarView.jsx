import React, { useMemo, useState } from 'react';
import { useSpring, animated, to } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { calculateTimeRemaining } from '../utils/dateUtils';
import './CalendarView.css';

// The popup gesture menu for a specific day
function RoundaboutMenu({ tasks, position, onClose, onComplete }) {
  const [activeTask, setActiveTask] = useState(null);
  
  // Spring for the central drag knob
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }));

  const RADIUS = 80;

  // Calculate bubble positions
  const bubblePositions = useMemo(() => {
    if (tasks.length === 0) return [];
    if (tasks.length === 1) return [{ x: 0, y: -RADIUS, task: tasks[0] }];
    
    return tasks.map((task, i) => {
      const angle = (i * (Math.PI * 2)) / tasks.length - (Math.PI / 2); // Start at top
      return {
        x: Math.cos(angle) * RADIUS,
        y: Math.sin(angle) * RADIUS,
        task
      };
    });
  }, [tasks]);

  const bind = useDrag(({ down, offset: [ox, oy], tap }) => {
    // Only process if it's not a simple tap
    if (tap) return; 

    // Find closest bubble
    let closest = null;
    let minDist = 40; // Detection radius
    
    bubblePositions.forEach((bp) => {
      // distance from drag point to bubble center
      const dist = Math.sqrt(Math.pow(ox - bp.x, 2) + Math.pow(oy - bp.y, 2));
      if (dist < minDist) {
        minDist = dist;
        closest = bp.task.id;
      }
    });

    setActiveTask(closest);

    if (!down) {
      if (closest && Math.sqrt(ox*ox + oy*oy) > 30) {
        onComplete(closest);
        onClose();
        return;
      }
      // Snap back if unreleased empty
      api.start({ x: 0, y: 0, immediate: false });
    } else {
      api.start({ x: ox, y: oy, immediate: true });
    }
  }, {
    from: () => [x.get(), y.get()],
    bounds: { left: -120, right: 120, top: -120, bottom: 120 },
    rubberband: true
  });

  return (
    <div 
      {...bind()} 
      className="roundabout-overlay" 
      onClick={(e) => {
        // Only close if they tapped the background directly without dragging
        if (e.target === e.currentTarget) onClose();
      }}
      style={{ touchAction: 'none' }}
    >
      <div 
        className="roundabout-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ left: position.x, top: position.y }}
      >
        {/* Render the bubbles */}
        {bubblePositions.map((bp) => (
          <div
            key={bp.task.id}
            className={`roundabout-bubble ${activeTask === bp.task.id ? 'active' : ''}`}
            style={{ 
              transform: `translate(calc(-50% + ${bp.x}px), calc(-50% + ${bp.y}px)) scale(${activeTask === bp.task.id ? 1.7 : 1})`,
              backgroundColor: bp.task.color 
            }}
            onClick={() => {
              onComplete(bp.task.id);
              onClose();
            }}
            onMouseEnter={() => setActiveTask(bp.task.id)}
            onMouseLeave={() => setActiveTask(null)}
          >
            <span>{bp.task.name.substring(0, 1).toUpperCase()}</span>
            <div className="bubble-tooltip">{bp.task.name}</div>
          </div>
        ))}
        
        {/* The central draggable knob */}
        <animated.div 
          className="roundabout-knob"
          style={{ 
            transform: to([x, y], (kx, ky) => `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`)
          }}
        >
          <div className="knob-inner" />
        </animated.div>
      </div>
    </div>
  );
}

export default function CalendarView({ tasks, onCompleteTask, onEditTask }) {
  const [activeDay, setActiveDay] = useState(null); // { id, x, y }

  // 14 day view (7 columns, 2 rows) - Starting 3 days in the past
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return Array.from({ length: 14 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - 3 + i);
      return d;
    });
  }, []);

  // Pre-calculate which tasks fall on which days
  const dayTasksMap = useMemo(() => {
    const map = {};
    days.forEach(d => map[d.toISOString()] = []);

    tasks.forEach(task => {
      // Robust date extraction (handles Firestore Timestamps)
      const completedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at || Date.now());

      if (isNaN(completedAt.getTime())) return;

      const daysRemaining = calculateTimeRemaining(completedAt, task.interval_days);
      const wiggle = parseInt(task.wiggle_room || 0, 10);
      const isLateOnly = task.wiggle_type === 'late-only';
      
      // If more than 3 days overdue, it disappears
      if (daysRemaining < -3) return;

      const startDayIdx = isLateOnly ? (3 + daysRemaining) : (3 + daysRemaining - wiggle);
      const endDayIdx = 3 + daysRemaining + wiggle;
      
      const completedDayStr = completedAt.toISOString().split('T')[0];

      days.forEach((day, index) => {
        const dStr = day.toISOString().split('T')[0];
        
        const isHistorical = (dStr === completedDayStr);
        const isActive = (index >= startDayIdx && index <= endDayIdx);
        
        if (isActive || isHistorical) {
          map[day.toISOString()].push({ 
            ...task, 
            isHistorical: !isActive && isHistorical,
            isOverdue: daysRemaining < 0 && index === (3 + daysRemaining)
          });
        }
      });
    });
    return map;
  }, [tasks, days]);

  return (
    <div className="calendar-view animate-fade-in">
      <h2 style={{ marginBottom: '16px' }}>Upcoming 14 Days</h2>
      
      <div className="calendar-grid-7x2">
        {days.map((day, index) => {
          const dayId = day.toISOString();
          const dayTasks = dayTasksMap[dayId] || [];
          const isToday = day.toDateString() === new Date().toDateString();
          const isPast = day < new Date(new Date().setHours(0,0,0,0));
          const activeTasks = dayTasks.filter(t => !t.isHistorical);
          
          return (
            <div 
              key={day.toISOString()} 
              className={`calendar-cell ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${activeTasks.length > 0 ? 'has-tasks' : ''}`}
            >
              <div 
                className="cell-hitbox" 
                onClick={(e) => {
                  if (activeTasks.length > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setActiveDay({ 
                      id: dayId, 
                      x: rect.left + rect.width / 2, 
                      y: rect.top + rect.height / 2 
                    });
                  }
                }}
              >
                <div className="cell-header">
                  <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="day-num">{day.getDate()}</span>
                </div>
                
                {/* Task Indicators */}
                <div className="task-indicators">
                  {dayTasks.map(task => (
                    <div 
                      key={task.id + (task.isHistorical ? '-hist' : '') + (task.isOverdue ? '-overdue' : '')} 
                      className={`task-label ${task.isHistorical ? 'historical' : ''} ${task.isOverdue ? 'overdue' : ''}`} 
                      style={{ 
                        backgroundColor: task.color,
                        opacity: task.isHistorical ? 0.35 : 1,
                        cursor: 'pointer'
                      }}
                      title={task.name + (task.isHistorical ? ' (Completed)' : '') + (task.isOverdue ? ' (OVERDUE)' : '')}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask(task);
                      }}
                    >
                      {task.isOverdue && <span className="overdue-tag">! </span>}
                      {task.name.length > 20 ? task.name.substring(0, 18) + '...' : task.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Render Roundabout Menu if active */}
              {activeDay?.id === dayId && (
                <RoundaboutMenu 
                  tasks={activeTasks} 
                  position={activeDay}
                  onClose={() => setActiveDay(null)}
                  onComplete={(taskId) => {
                    onCompleteTask(taskId, activeDay.id);
                    setActiveDay(null);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
