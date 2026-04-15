import React, { useState, useEffect } from 'react';
import { subscribeTasks, addTask, updateTask, deleteTask, setTask } from '@scheduleit/core';
import ScheduleView from './components/ScheduleView';
import CalendarView from './components/CalendarView';
import NewTaskForm from './components/NewTaskForm';
import ScheduleModal from './components/ScheduleModal';
import ProfileMenu from './components/ProfileMenu';
import { useNavigate } from 'react-router-dom';

function Dashboard({ user, view: initialView, isDark, setIsDark, handleLogout }) {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [tasksHistory, setTasksHistory] = useState([]);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [schedulingTask, setSchedulingTask] = useState(null);
  const [schedulingMode, setSchedulingMode] = useState('lock');
  const [prefillDate, setPrefillDate] = useState(null);

  const [creationStats, setCreationStats] = useState(() => {
    const saved = localStorage.getItem('softschedule-stats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const today = new Date().toDateString();
        if (parsed.date === today) return parsed;
      } catch (e) { /* ignore */ }
    }
    return { count: 0, date: new Date().toDateString() };
  });

  useEffect(() => {
    localStorage.setItem('softschedule-stats', JSON.stringify(creationStats));
  }, [creationStats]);

  // Firestore Sync
  useEffect(() => {
    if (user) {
      const unsubscribe = subscribeTasks(user.uid, (fetchedTasks) => {
        setTasks(fetchedTasks);
      });
      return () => unsubscribe();
    } else {
      setTasks([]);
    }
  }, [user]);

  const saveHistory = () => {
    setTasksHistory(prev => [...prev, JSON.parse(JSON.stringify(tasks))].slice(-20));
  };

  const handleUndo = async () => {
    if (tasksHistory.length > 0 && user) {
      const previousState = tasksHistory[tasksHistory.length - 1];
      const currentState = tasks;
      
      try {
        for (const oldTask of previousState) {
          const currentTask = currentState.find(t => t.id === oldTask.id);
          if (!currentTask) {
            await setTask(user.uid, oldTask.id, oldTask);
          } else {
            const changed = 
              currentTask.completed_at !== oldTask.completed_at ||
              currentTask.scheduled_date !== oldTask.scheduled_date ||
              currentTask.name !== oldTask.name ||
              currentTask.interval_days !== oldTask.interval_days ||
              currentTask.wiggle_room !== oldTask.wiggle_room ||
              currentTask.color !== oldTask.color;

            if (changed) {
              const { id, created_at, ...data } = oldTask;
              await updateTask(user.uid, id, {
                ...data,
                scheduled_date: oldTask.scheduled_date || null
              });
            }
          }
        }
        
        for (const currentTask of currentState) {
          const oldTask = previousState.find(t => t.id === currentTask.id);
          if (!oldTask) {
            await deleteTask(user.uid, currentTask.id);
          }
        }
      } catch (error) {
        console.error("Undo Error:", error);
      }
      
      setTasksHistory(prev => prev.slice(0, -1));
    }
  };

  const handleEditTask = (task, prefill = null) => {
    setEditingTask(task);
    setPrefillDate(prefill);
    setShowNewTaskForm(true);
  };

  const handleSaveTask = async (taskData) => {
    if (!user) return;
    
    const isNew = !editingTask;
    if (isNew) {
      setShowNewTaskForm(false);
      setEditingTask(null);
      setPrefillDate(null);
    }

    try {
      saveHistory();

      if (editingTask) {
        const { id, ...data } = taskData;
        await updateTask(user.uid, id, {
          ...data,
          scheduled_date: null
        });
      } else {
        if (creationStats.count >= 100) {
          alert("Daily task creation limit (100) reached.");
          return;
        }

        await addTask(user.uid, taskData);
        setCreationStats(prev => ({ ...prev, count: prev.count + 1 }));
      }
    } catch (error) {
      console.error("Save Error:", error);
    } finally {
      setShowNewTaskForm(false);
      setEditingTask(null);
      setPrefillDate(null);
    }
  };

  const handleDeleteTask = async (id) => {
    if (user && window.confirm('Are you sure?')) {
      saveHistory();
      await deleteTask(user.uid, id);
      setShowNewTaskForm(false);
      setEditingTask(null);
    }
  };

  const handleCompleteTask = async (id, completionDate = null) => {
    if (!user) return;
    saveHistory();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let newCompletedAt = new Date();
    if (completionDate) {
      newCompletedAt = new Date(completionDate);
    } else {
      const currentCompletedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at);
      const currentTargetDate = new Date(currentCompletedAt.getTime() + (task.interval_days || 1) * 24 * 60 * 60 * 1000);
      
      if (currentTargetDate > new Date()) {
        newCompletedAt = currentTargetDate;
      }
    }

    await updateTask(user.uid, id, { 
      completed_at: newCompletedAt.toISOString(),
      scheduled_date: null 
    });
  };

  const handleScheduleTask = async (id, chosenDate, mode = 'lock') => {
    if (!user) return;
    saveHistory();
    
    if (mode === 'reschedule') {
      const task = tasks.find(t => t.id === id);
      if (task) {
        const interval = task.interval_days || 1;
        const targetDate = new Date(chosenDate);
        const newCompletedAt = new Date(targetDate.getTime() - interval * 24 * 60 * 60 * 1000);
        
        await updateTask(user.uid, id, { 
          completed_at: newCompletedAt.toISOString(),
          scheduled_date: null 
        });
      }
    } else {
      await updateTask(user.uid, id, { 
        scheduled_date: chosenDate
      });
    }
    setSchedulingTask(null);
  };

  return (
    <div className="dashboard-container">
      <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="url(#logo-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <h1>SoftSchedule</h1>
          </div>
        </div>

        <div className="view-toggle">
          <button className={`toggle-btn ${initialView === 'schedule' ? 'active' : ''}`} onClick={() => navigate('/tasks')}>List</button>
          <button className={`toggle-btn ${initialView === 'calendar' ? 'active' : ''}`} onClick={() => navigate('/calendar')}>Calendar</button>
        </div>

        <div className="header-actions">
          <button className="action-btn theme-toggle" onClick={() => setIsDark(!isDark)}>
            {isDark ? '🌙' : '☀️'}
          </button>
          <ProfileMenu user={user} onLogout={handleLogout} />
        </div>
      </header>

      <main className="app-content">
        {initialView === 'schedule' ? (
          <ScheduleView 
            tasks={tasks} 
            onCompleteTask={handleCompleteTask} 
            onEditTask={handleEditTask} 
            onScheduleTask={(taskId, mode = 'lock') => {
              const task = tasks.find(t => t.id === taskId);
              setSchedulingTask(task);
              setSchedulingMode(mode);
            }} 
          />
        ) : (
          <CalendarView tasks={tasks} onCompleteTask={handleCompleteTask} onEditTask={handleEditTask} onScheduleTask={handleScheduleTask} />
        )}
      </main>

      {tasksHistory.length > 0 && (
        <button className="fab-undo animate-fade-in" onClick={handleUndo} title="Undo Last Action">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      )}

      <button className="fab-add" onClick={() => handleEditTask()}>
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
      </button>

      {showNewTaskForm && (
        <NewTaskForm 
          task={editingTask}
          initialDueDate={prefillDate}
          onClose={() => {
            setShowNewTaskForm(false);
            setEditingTask(null);
            setPrefillDate(null);
          }}
          onSave={handleSaveTask}
          onDelete={handleDeleteTask}
        />
      )}

      {schedulingTask && (
        <ScheduleModal 
          task={schedulingTask}
          mode={schedulingMode}
          onClose={() => setSchedulingTask(null)}
          onSchedule={handleScheduleTask}
        />
      )}
    </div>
  </div>
  );
}

export default Dashboard;
