import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useSpring, animated, to } from '@react-spring/web';
import { useDrag } from '@use-gesture/react';
import { calculateTimeRemaining } from '@scheduleit/core';
import './CalendarView.css';

// Updated directions: Adding 'sx' and 'sy' to start burst off the edges of the parent instead of the dead center
const WATER_DROP_DIRECTIONS = [
  // Upper Arc (Still flying out, but slightly less aggressive)
  { sx: '18px', sy: '-7px', x: '50px', y: '-20px' }, 
  { sx: '0px', sy: '-20px', x: '0px', y: '-45px' }, 
  { sx: '-18px', sy: '-7px', x: '-50px', y: '-20px' },
  // Mid-Level
  { sx: '20px', sy: '3px', x: '70px', y: '10px' },  
  { sx: '-20px', sy: '3px', x: '-70px', y: '10px' },
  // Lower Arc (Fanning wide and dropping fast)
  { sx: '16px', sy: '11px', x: '60px', y: '40px' },  
  { sx: '8px', sy: '18px', x: '25px', y: '60px' }, 
  { sx: '0px', sy: '20px', x: '0px', y: '60px' },
  { sx: '-8px', sy: '18px', x: '-25px', y: '60px' },
  { sx: '-16px', sy: '11px', x: '-60px', y: '40px' }
];

// The popup gesture menu for a specific day
function RoundaboutMenu({ tasks, position, onClose, onComplete, onSchedule, onAddTask }) {
  const isFuture = useMemo(() => {
    const day = new Date(position.id);
    const today = new Date();
    today.setHours(0,0,0,0);
    return day > today;
  }, [position.id]);
  const [activeTask, setActiveTask] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
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
    to: { opacity: isClosing ? 0 : 1, transform: 'scale(1)' },
    config: isClosing ? { duration: 250 } : { mass: 1, tension: 180, friction: 14 }
  });

  const bind = useDrag(({ down, offset: [ox, oy], tap }) => {
    // Only process if it's not a simple tap
    if (tap) return; 

    // Efficiently track drag state to disable child point capture and prevent dropped events
    setIsDragging(down); 

    // Efficiently track drag state to disable child point capture and prevent dropped events on iOS
    setIsDragging(down);

    // Find closest bubble
    let closest = null;
    let minDist = 65; // High detection radius to forgive high-velocity flings past the bubble
    
    bubblePositions.forEach((bp) => {
      // distance from drag point to bubble center
      const dist = Math.sqrt(Math.pow(ox - bp.x, 2) + Math.pow(oy - bp.y, 2));
      if (dist < minDist) {
        minDist = dist;
        closest = bp.isCreate ? 'create' : bp.task.id;
      }
    });

    if (down) {
      setActiveTask(closest);
      api.start({ x: ox, y: oy, immediate: true });
    } else {
      if (closest && Math.sqrt(ox*ox + oy*oy) > 30) {
        setSelectedId(closest);
        setTimeout(() => {
          if (closest === 'create') {
            onAddTask();
          } else if (isFuture) {
            onSchedule(closest, position.id);
          } else {
            onComplete(closest);
          }
          onClose(); // Close the menu seamlessly with the end of the 1.0s CSS pop animation
        }, 500);
        return;
      }
      // Snap back if unreleased empty and clear active task
      setActiveTask(null);
      api.start({ x: 0, y: 0, immediate: false });
    }
  }, {
    from: () => [x.get(), y.get()] // Resume smooth catching without restrictive bounds that lock the physics engine
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
        <div className={`roundabout-header ${isFuture ? 'is-future' : ''}`}>
          {isFuture ? '📅 Schedule Task' : '✅ Complete Task'}
        </div>
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
              isGlobalDragging={isDragging}
              onClick={() => {
                setSelectedId(id);
                setTimeout(() => {
                  if (bp.isCreate) onAddTask();
                  else if (isFuture) onSchedule(bp.task.id, position.id);
                  else onComplete(bp.task.id);
                  onClose(); // Sync with 1.0s CSS animation end
                }, 500);
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
  const { translate } = useSpring({
    translate: `translate(calc(-50% + ${bp.x}px), calc(-50% + ${bp.y}px))`
  });

  const { scale } = useSpring({
    scale: isActive ? 1.4 : 1,
    config: { tension: 350, friction: 12 }
  });

  // Generate organic, randomized variations for the droplets exactly once when the bubble pops
  const randomDroplets = useMemo(() => {
    if (!isSelected) return [];
    return WATER_DROP_DIRECTIONS.map((dir) => {
      const bx = parseInt(dir.x, 10);
      const by = parseInt(dir.y, 10);
      
      // Randomize destination spread (+/- 15px radial)
      const rx = bx + (Math.random() * 30 - 15);
      const ry = by + (Math.random() * 30 - 15);
      
      // Randomize gravity deceleration speed (reduced runtime by 0.1s: 0.3s to 0.6s)
      const duration = 0.3 + Math.random() * 0.3;
      
      // Randomize droplet size slightly (+/- 2px), making them roughly 20% larger than before
      const baseSize = Math.max(3, (dir.s || 5) + Math.floor(Math.random() * 5 - 2));
      const size = Math.round(baseSize * 1.2);

      return {
        x: `${rx}px`,
        y: `${ry}px`,
        sx: dir.sx,
        sy: dir.sy,
        size: `${size}px`,
        duration: `${duration}s`
      };
    });
  }, [isSelected]);

  return (
    <animated.div
      className="burst-container-realistic"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: translate,
        zIndex: isSelected ? 1000 : 1,
        pointerEvents: (isFadingOut || isSelected) ? 'none' : 'auto',
        opacity: isFadingOut ? 0 : 1
      }}
    >
      {!isSelected ? (
        <animated.div 
          className={`roundabout-bubble ${isActive ? 'active' : ''} ${bp.isCreate ? 'create-bubble' : ''}`}
          onClick={onClick}
          style={{
             position: 'absolute',
             top: '50%', left: '50%',
             transform: scale.to(s => `translate(-50%, -50%) scale(${s})`),
             backgroundColor: bp.isCreate ? 'var(--color-purple)' : bp.task.color,
             width: '48px', height: '48px'
          }}
        >
          <span>{bp.isCreate ? '+' : bp.task.name.substring(0, 1).toUpperCase()}</span>
          <div className="bubble-tooltip">{bp.isCreate ? 'Add Task' : bp.task.name}</div>
        </animated.div>
      ) : (
        randomDroplets.map((rd, i) => (
          <div 
            key={i} 
            className="droplet-realistic" 
            style={{ 
              '--x': rd.x, 
              '--y': rd.y,
              '--start-x': rd.sx,
              '--start-y': rd.sy,
              '--size': rd.size,
              animationDuration: rd.duration,
              '--theme-color': bp.isCreate ? 'var(--color-purple)' : bp.task.color
            }} 
          />
        ))
      )}
    </animated.div>
  );
}

export default function CalendarView({ tasks, onCompleteTask, onEditTask, onScheduleTask }) {
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

      const { windowStartDiff, windowEndDiff } = calculateTimeRemaining(
        completedAt, 
        task.interval_days, 
        task.scheduled_date,
        task.wiggle_room,
        task.wiggle_type
      );
      
      // If more than 3 days overdue, it disappears
      if (windowEndDiff < -3) return;

      const startDayIdx = 3 + windowStartDiff;
      const endDayIdx = 3 + windowEndDiff;
      
      const completedDayStr = completedAt.toISOString().split('T')[0];

      days.forEach((day, index) => {
        const dStr = day.toISOString().split('T')[0];
        
        const isHistorical = (dStr === completedDayStr);
        const isActive = (index >= startDayIdx && index <= endDayIdx);
        
        if (isActive || isHistorical) {
          map[day.toISOString()].push({ 
            ...task, 
            isHistorical: !isActive && isHistorical,
            isOverdue: windowEndDiff < 0 && index === (3 + windowEndDiff)
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
          onSchedule={onScheduleTask}
          onAddTask={() => onEditTask(null, activeDay.id)}
        />
      )}
    </div>
  );
}
