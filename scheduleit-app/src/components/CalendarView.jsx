import React, { useMemo, useState, useEffect, useRef } from 'react';
import { calculateTimeRemaining } from '@scheduleit/core';
import './CalendarView.css';

export default function CalendarView({ tasks, onCompleteTask, onEditTask, onScheduleTask, onPuntTask }) {
  const [selectedTask, setSelectedTask] = useState(null);
  const [isQuickActionsVisible, setIsQuickActionsVisible] = useState(false);
  const [isPuntDialogVisible, setIsPuntDialogVisible] = useState(false);
  const [puntDays, setPuntDays] = useState('1');
  const [draggedTask, setDraggedTask] = useState(null);

  const handleDragStart = (e, task, dayId) => {
    e.stopPropagation();
    const taskSummary = { id: task.id, name: task.name, color: task.color, isLocked: !!task.scheduled_date, dayId };
    setDraggedTask(taskSummary);
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetDayId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedTask) return;

    if (draggedTask.isLocked) {
      onScheduleTask(draggedTask.id, targetDayId, 'lock');
    } else {
      const startDate = new Date(draggedTask.dayId);
      const endDate = new Date(targetDayId);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays !== 0) {
        onPuntTask(draggedTask.id, diffDays);
      }
    }
    setDraggedTask(null);
  };

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

  // Pre-calculate which tasks fall on which days using a vertical slot system
  const dayTasksMap = useMemo(() => {
    const map = {};
    const daySlots = {};
    
    days.forEach(d => {
      const iso = d.toISOString();
      map[iso] = [];
      daySlots[iso] = [];
    });

    // 1. Sort tasks by duration (longer tasks first) to fill slots more efficiently
    const sortedInputTasks = [...tasks].sort((a, b) => {
      const aInt = a.interval_days || 1;
      const bInt = b.interval_days || 1;
      return bInt - aInt;
    });

    sortedInputTasks.forEach(task => {
      const completedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at || Date.now());

      if (isNaN(completedAt.getTime())) return;

      const { windowStartDiff, windowEndDiff, daysRemaining } = calculateTimeRemaining(
        completedAt, 
        task.interval_days, 
        task.scheduled_date,
        task.wiggle_room,
        task.wiggle_type
      );
      
      const startDayIdx = Math.max(0, 3 + windowStartDiff);
      const endDayIdx = Math.min(days.length - 1, 3 + windowEndDiff);
      const targetDayIdx = 3 + daysRemaining;
      const completedDayStr = completedAt.toISOString().split('T')[0];

      if (windowEndDiff < -3 || windowStartDiff > 11) return;

      // 2. Find first available vertical slot across the entire window
      let slotIndex = 0;
      let found = false;
      while (!found) {
        found = true;
        for (let i = startDayIdx; i <= endDayIdx; i++) {
          const dayIso = days[i].toISOString();
          if (daySlots[dayIso][slotIndex]) {
            found = false;
            break;
          }
        }
        if (!found) {
          slotIndex++;
          if (slotIndex > 50) break;
        }
      }

      // 3. Assign task to slots and map
      for (let i = 0; i < days.length; i++) {
        const day = days[i];
        const dStr = day.toISOString().split('T')[0];
        const isHistorical = (dStr === completedDayStr);
        const isActive = (i >= startDayIdx && i <= endDayIdx);

        if (isActive || isHistorical) {
          const dayIso = day.toISOString();
          daySlots[dayIso][slotIndex] = task.id;

          const distance = Math.abs(i - targetDayIdx);
          let baseOpacity = 1;
          if (isHistorical) baseOpacity = 0.35;
          else if (isActive) baseOpacity = Math.max(0.2, 1 - (distance * 0.15));

          map[dayIso].push({ 
            ...task, 
            slotIndex,
            isHistorical: !isActive && isHistorical,
            isTarget: isActive && i === targetDayIdx,
            isOverdue: windowEndDiff < 0 && i === (3 + windowEndDiff),
            wiggleOpacity: baseOpacity,
            isWindowStart: isActive && i === startDayIdx,
            isWindowEnd: isActive && i === endDayIdx
          });
        }
      }
    });

    // 4. Sort each day's task list by slotIndex for rendering order
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => a.slotIndex - b.slotIndex);
    });

    return map;
  }, [tasks, days]);

  return (
    <div className="calendar-view animate-fade-in">
      <h2>Upcoming Schedule</h2>
      
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
                onClick={() => onEditTask(null, dayId)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dayId)}
              >
                <div className="cell-header">
                  <span className="day-name">{day.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="day-num">{day.getDate()}</span>
                </div>
                
                {/* Task Indicators */}
                <div className="task-indicators">
                  {[0, 1, 2].map(slotIdx => {
                    const task = dayTasks.find(t => t.slotIndex === slotIdx);
                    if (!task) return <div key={`spacer-${slotIdx}`} className="task-row spacer" />;
                    
                    const isSolid = task.isTarget || task.isHistorical;
                    
                    return (
                      <div key={task.id + (task.isHistorical ? '-hist' : '')} className="task-row">
                        {!task.isHistorical && (
                          <div 
                            className="continuity-line" 
                            style={{ 
                              borderColor: task.color,
                              left: task.isWindowStart ? '50%' : '-15px',
                              right: task.isWindowEnd ? '50%' : '-15px'
                            }} 
                          />
                        )}
                        <div 
                          className={`task-pill ${isSolid ? 'solid' : 'hollow'} ${task.isHistorical ? 'historical' : ''} ${task.isOverdue ? 'overdue' : ''}`} 
                          style={{ 
                            backgroundColor: isSolid ? task.color : 'transparent',
                            borderColor: task.color,
                            opacity: (draggedTask?.id === task.id) ? 0.3 : task.wiggleOpacity,
                            color: isSolid ? '#000' : task.color,
                            cursor: 'pointer'
                          }}
                          draggable={true}
                          onDragStart={(e) => handleDragStart(e, task, dayId)}
                          onDragEnd={() => setDraggedTask(null)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask({ ...task, dayId });
                            setIsQuickActionsVisible(true);
                          }}
                        >
                          {task.isOverdue && <span className="overdue-tag">! </span>}
                          {task.name}
                        </div>
                      </div>
                    );
                  })}

                  {/* Overflow Indicator */}
                  {dayTasks.length > 3 && (
                    <div className="more-indicator">
                      + {dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions Modal */}
      {isQuickActionsVisible && (
        <div className="quick-actions-overlay" onClick={() => setIsQuickActionsVisible(false)}>
          <div className="quick-actions-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 15px 0' }}>{selectedTask?.name}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="qa-btn qa-complete"
                onClick={() => { onCompleteTask(selectedTask.id, selectedTask.dayId); setIsQuickActionsVisible(false); }}
              >
                ✅ Complete
              </button>
              
              <button 
                className="qa-btn qa-punt"
                onClick={() => { setIsPuntDialogVisible(true); setIsQuickActionsVisible(false); }}
              >
                ⏭️ Punt
              </button>

              <button 
                className="qa-btn qa-edit"
                onClick={() => { onEditTask(selectedTask); setIsQuickActionsVisible(false); }}
              >
                ✏️ Full Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Punt Dialog */}
      {isPuntDialogVisible && (
        <div className="quick-actions-overlay" onClick={() => setIsPuntDialogVisible(false)}>
          <div className="quick-actions-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px 0' }}>Punt Task</h3>
            <p style={{ margin: '0 0 15px 0', fontSize: '14px', color: '#666' }}>
              How many days would you like to push this forward?
            </p>
            <p style={{ margin: '0 0 15px 0', fontSize: '12px', fontStyle: 'italic', color: '#888' }}>
              (Tip: You can also drag tasks in the calendar)
            </p>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
              <button className="qa-stepper" onClick={() => setPuntDays(Math.max(1, parseInt(puntDays || '1') - 1).toString())}>-</button>
              <input 
                type="number" 
                value={puntDays} 
                onChange={(e) => setPuntDays(e.target.value)}
                style={{ width: '60px', textAlign: 'center', fontSize: '18px', padding: '5px' }}
              />
              <button className="qa-stepper" onClick={() => setPuntDays((parseInt(puntDays || '1') + 1).toString())}>+</button>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="qa-btn" style={{ flex: 1, backgroundColor: '#eee', color: '#333' }} onClick={() => setIsPuntDialogVisible(false)}>Cancel</button>
              <button 
                className="qa-btn" 
                style={{ flex: 1, backgroundColor: '#3b82f6', color: '#fff' }} 
                onClick={() => {
                  const d = parseInt(puntDays);
                  if (!isNaN(d) && d > 0) {
                    onPuntTask(selectedTask.id, d);
                    setIsPuntDialogVisible(false);
                  }
                }}
              >
                Push Forward
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
