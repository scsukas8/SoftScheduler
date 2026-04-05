import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSpring, animated, to } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { calculateTimeRemaining } from '../utils/dateUtils';
import './CalendarView.css';

// The popup gesture menu for a specific day
function RoundaboutMenu({ tasks, position, onClose, onComplete, onAddTask }) {
  const [activeTask, setActiveTask] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  
  // Spring for the central drag knob
  const [{ x, y }, api] = useSpring(() => ({ x: 0, y: 0 }));

  // Detect edge cases for mobile clipping
  const viewWidth = window.innerWidth;
  const isRightEdge = position.x > viewWidth * 0.7;
  const isLeftEdge = position.x < viewWidth * 0.3;
  const isMobile = viewWidth < 600;
  const RADIUS = isMobile ? 65 : 80;

  // Calculate positions for task bubbles and the "+" creation button
  const bubblePositions = useMemo(() => {
    const numTasks = tasks.length;
    const total = numTasks + 1;
    
    // JS Math: 0=Right, PI/2=Bottom, PI=Left, 3/2 PI=Top
    const PLUS_ANGLE = Math.PI * 0.5; // Fixed at 6 o'clock

    // If not near screen edges, distribute in a balanced full circle
    if (!isLeftEdge && !isRightEdge) {
      const positions = tasks.map((task, i) => {
        const angle = PLUS_ANGLE + ((i + 1) * (Math.PI * 2)) / total;
        return { id: task.id, task, x: Math.cos(angle) * RADIUS, y: Math.sin(angle) * RADIUS };
      });
      positions.push({ id: 'create', isCreate: true, x: Math.cos(PLUS_ANGLE) * RADIUS, y: Math.sin(PLUS_ANGLE) * RADIUS });
      return positions;
    }
    
    // Edge Case: 180-degree sweep from Plus (Bottom) to Top (270 deg)
    // Sweep direction (CW vs CCW) ensures bubbles stay within the viewport
    const sweepDir = isLeftEdge ? -1 : 1; 
    const sweepArc = Math.PI;
    
    const positions = tasks.map((task, i) => {
      // Offset from the Plus button at index 0
      const angle = PLUS_ANGLE + (sweepDir * sweepArc * (i + 1) / (total - 1));
      return {
        id: task.id,
        task,
        x: Math.cos(angle) * RADIUS,
        y: Math.sin(angle) * RADIUS
      };
    });

    // Add Create button at the 6 o'clock anchor
    positions.push({
      id: 'create',
      isCreate: true,
      x: Math.cos(PLUS_ANGLE) * RADIUS,
      y: Math.sin(PLUS_ANGLE) * RADIUS
    });
    
    return positions;
  }, [tasks, isLeftEdge, isRightEdge, RADIUS]);

  // Entrance animation for the entire menu
  const introSpring = useSpring({
    from: { opacity: 0, transform: 'scale(0.5)' },
    to: { opacity: 1, transform: 'scale(1)' },
    config: { mass: 1, tension: 180, friction: 14 }
  });

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
        closest = bp.isCreate ? 'create' : bp.task.id;
      }
    });

    setActiveTask(closest);

    if (!down) {
      if (closest && Math.sqrt(ox*ox + oy*oy) > 30) {
        setSelectedId(closest);
        setTimeout(() => {
          if (closest === 'create') {
            onAddTask();
          } else {
            onComplete(closest);
          }
          onClose();
        }, 750);
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
      <animated.div 
        className="roundabout-container" 
        onClick={(e) => e.stopPropagation()}
        style={{ 
          ...introSpring,
          left: position.x, 
          top: position.y 
        }}
      >
        {/* Render the bubbles */}
        {bubblePositions.map((bp) => {
          const id = bp.isCreate ? 'create' : bp.task.id;
          const isActive = activeTask === id;
          const isSelected = selectedId === id;
          const isFadingOut = selectedId && !isSelected;
          
          return (
            <Bubble 
              key={id}
              bp={bp}
              isActive={isActive}
              isSelected={isSelected}
              isFadingOut={isFadingOut}
              onClick={() => {
                setSelectedId(id);
                setTimeout(() => {
                  if (bp.isCreate) onAddTask();
                  else onComplete(bp.task.id);
                  onClose();
                }, 750);
              }}
            />
          );
        })}

        {/* The central draggable knob */}
        <animated.div 
          className="roundabout-knob"
          style={{ 
            opacity: selectedId ? 0 : 1, // Fade knob out during pop
            transform: to([x, y], (kx, ky) => `translate(calc(-50% + ${kx}px), calc(-50% + ${ky}px))`)
          }}
        >
          <div className="knob-inner" />
        </animated.div>
      </animated.div>
    </div>
  );
}

/**
 * Individual animated bubble component
 * Handles the "pop" (scaling) effect when targeted or selected
 */
function Bubble({ bp, isActive, isSelected, isFadingOut, onClick }) {
  // Use a ref to ensure the selection sequence only fires exactly once per selection
  const hasStartedSelectionRef = useRef(false);
  
  // Use imperative api to ensure the selection sequence is never interrupted
  const [style, api] = useSpring(() => ({
    transform: `translate(calc(-50% + ${bp.x}px), calc(-50% + ${bp.y}px)) scale(1)`,
    opacity: 1,
    config: { tension: 350, friction: 12 }
  }));

  useEffect(() => {
    if (isSelected) {
      // Guard against re-renders restarting the animation
      if (!hasStartedSelectionRef.current) {
        hasStartedSelectionRef.current = true;
        // STAGE 1: BOLD GROW
        api.start({
          transform: `translate(calc(-50% + ${bp.x}px), calc(-50% + ${bp.y}px)) scale(2.2)`,
          opacity: 1,
          config: { tension: 800, friction: 20 },
          onRest: () => {
            // STAGE 2: RAPID BURST (SHRINK)
            api.start({
              transform: `translate(calc(-50% + ${bp.x}px), calc(-50% + ${bp.y}px)) scale(0.1)`,
              opacity: 0,
              config: { tension: 1200, friction: 25 }
            });
          }
        });
      }
    } else {
      // Reset the guard when the bubble is no longer selected
      hasStartedSelectionRef.current = false;
      // Regular hover/swipe scaling
      api.start({
        transform: `translate(calc(-50% + ${bp.x}px), calc(-50% + ${bp.y}px)) scale(${isActive ? 1.4 : 1})`,
        opacity: isFadingOut ? 0 : 1,
        config: { tension: 350, friction: 12 }
      });
    }
  }, [isSelected, isActive, isFadingOut, bp.x, bp.y, api]);

  return (
    <animated.div
      className={`roundabout-bubble ${isActive ? 'active' : ''} ${bp.isCreate ? 'create-bubble' : ''} ${isSelected ? 'selected' : ''}`}
      style={{ 
        ...style,
        backgroundColor: bp.isCreate ? 'var(--color-purple)' : bp.task.color,
        zIndex: isSelected ? 1000 : 1,
        pointerEvents: (isFadingOut || isSelected) ? 'none' : 'auto'
      }}
      onClick={isSelected ? null : onClick}
    >
      <span>{bp.isCreate ? '+' : bp.task.name.substring(0, 1).toUpperCase()}</span>
      <div className="bubble-tooltip">{bp.isCreate ? 'Add Task' : bp.task.name}</div>
    </animated.div>
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
                  const rect = e.currentTarget.getBoundingClientRect();
                  setActiveDay({ 
                    id: dayId, 
                    x: rect.left + rect.width / 2, 
                    y: rect.top + rect.height / 2 
                  });
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
            </div>
          );
        })}
      </div>

      {activeDay && (
        <RoundaboutMenu 
          tasks={(dayTasksMap[activeDay.id] || []).filter(t => !t.isHistorical)} 
          position={activeDay}
          onClose={() => setActiveDay(null)}
          onComplete={(taskId) => onCompleteTask(taskId, activeDay.id)}
          onAddTask={() => onEditTask(null, activeDay.id)}
        />
      )}
    </div>
  );
}
