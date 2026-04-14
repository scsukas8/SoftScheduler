import React, { useState, useEffect } from 'react';
import './App.css';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { subscribeTasks, addTask, updateTask, deleteTask, setTask } from '@scheduleit/core';
import ScheduleView from './components/ScheduleView';
import CalendarView from './components/CalendarView';
import NewTaskForm from './components/NewTaskForm';
import ScheduleModal from './components/ScheduleModal';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tasksHistory, setTasksHistory] = useState([]);
  const [view, setView] = useState('schedule');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [schedulingTask, setSchedulingTask] = useState(null);
  const [schedulingMode, setSchedulingMode] = useState('lock');
  const [prefillDate, setPrefillDate] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('softschedule-theme') === 'dark' || 
           (!localStorage.getItem('softschedule-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

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

  // Theme Sync
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('softschedule-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('softschedule-theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem('softschedule-stats', JSON.stringify(creationStats));
  }, [creationStats]);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  const handleLogin = async () => {
    console.log("Login button clicked. Attempting Google Auth...");
    try {
      if (!auth || !googleProvider) {
        throw new Error("Firebase Auth or Google Provider not initialized. Configuration might be missing.");
      }
      setLoading(true);
      await signInWithPopup(auth, googleProvider);
      console.log("Login successful.");
    } catch (error) {
      console.error("Critical Login Error:", error);
      alert(`Login failed: ${error.message || "Unknown error"}. Check console for details.`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => signOut(auth);

  const saveHistory = () => {
    // Ensure we have a deep copy of tasks to prevent state contamination
    setTasksHistory(prev => [...prev, JSON.parse(JSON.stringify(tasks))].slice(-20));
  };

  const handleUndo = async () => {
    if (tasksHistory.length > 0 && user) {
      const previousState = tasksHistory[tasksHistory.length - 1];
      const currentState = tasks;
      
      try {
        // 1. Restore/Update tasks that were in previousState
        for (const oldTask of previousState) {
          const currentTask = currentState.find(t => t.id === oldTask.id);
          if (!currentTask) {
            // Task was deleted, restore it with original ID
            await setTask(user.uid, oldTask.id, oldTask);
          } else {
            // Check if important scheduling or metadata fields changed
            // We compare specific fields to avoid unnecessary writes, 
            // but ensure we catch scheduled_date transitions.
            const changed = 
              currentTask.completed_at !== oldTask.completed_at ||
              currentTask.scheduled_date !== oldTask.scheduled_date ||
              currentTask.name !== oldTask.name ||
              currentTask.interval_days !== oldTask.interval_days ||
              currentTask.wiggle_room !== oldTask.wiggle_room ||
              currentTask.color !== oldTask.color;

            if (changed) {
              // Strip immutable created_at and ID before update to satisfy Firestore rules
              const { id, created_at, ...data } = oldTask;
              await updateTask(user.uid, id, {
                ...data,
                scheduled_date: oldTask.scheduled_date || null
              });
            }
          }
        }
        
        // 2. Delete tasks that are in currentState but not in previousState (newly created)
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
    
    // Close form immediately for NEW tasks (optimistic UI)
    // For editing, we might want to wait, or close too
    const isNew = !editingTask;
    if (isNew) {
      setShowNewTaskForm(false);
      setEditingTask(null);
      setPrefillDate(null);
    }

    try {
      console.log("Initiating Task Save...", taskData);
      saveHistory();

      if (editingTask) {
        const { id, ...data } = taskData;
        await updateTask(user.uid, id, {
          ...data,
          scheduled_date: null
        });
        console.log("Task Updated successfully.");
      } else {
        if (creationStats.count >= 100) {
          alert("Daily task creation limit (100) reached. To prevent spam, please try again tomorrow.");
          return;
        }

        const { id, ...data } = taskData;
        await addTask(user.uid, data);
        setCreationStats(prev => ({ ...prev, count: prev.count + 1 }));
        console.log("Task Added successfully.");
      }
    } catch (error) {
      console.error("Critical Task Save Error:", error);
      alert(`Save failed: ${error.message || "Connectivity issue"}. The task may still appear locally but won't be saved until you're online.`);
      // If we closed optimistically, the task will naturally disappear when Firestore rolls back
    } finally {
      // Ensure state is cleared even if we didn't close optimistically
      setShowNewTaskForm(false);
      setEditingTask(null);
      setPrefillDate(null);
    }
  };

  const handleDeleteTask = async (id) => {
    if (user && window.confirm('Are you sure you want to delete this task?')) {
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
      // Standard logic: toggle to next due date or today
      const currentCompletedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at);
      const currentTargetDate = new Date(currentCompletedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
      
      if (currentTargetDate > new Date()) {
        newCompletedAt = new Date(currentCompletedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
      }
    }

    await updateTask(user.uid, id, { 
      completed_at: newCompletedAt.toISOString(),
      scheduled_date: null // Clear override upon completion
    });
  };

  const handleScheduleTask = async (id, chosenDate, mode = 'lock') => {
    if (!user) return;
    saveHistory();
    
    if (mode === 'reschedule') {
      const task = tasks.find(t => t.id === id);
      if (task) {
        // Shift window: newCompletedAt = chosenDate - interval
        const interval = task.interval_days || 1;
        const targetDate = new Date(chosenDate);
        const newCompletedAt = new Date(targetDate.getTime() - interval * 24 * 60 * 60 * 1000);
        
        await updateTask(user.uid, id, { 
          completed_at: newCompletedAt.toISOString(),
          scheduled_date: null // Clear any existing lock
        });
      }
    } else {
      // Standard lock (wiggle = 0)
      await updateTask(user.uid, id, { 
        scheduled_date: chosenDate
      });
    }
    setSchedulingTask(null);
  };

  if (loading) {
    return <div className="loading-screen">Loading SoftSchedule...</div>;
  }

  if (!user) {
    return (
      <div className="landing-page animate-fade-in">
        <div className="landing-content">
          <div className="landing-logo">
            <svg viewBox="0 0 24 24" width="80" height="80" fill="none" stroke="url(#landing-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="landing-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
          </div>
          <h1>SoftSchedule</h1>
          <p>Soft scheduling for a calmer life.</p>
          <button className="login-btn" onClick={handleLogin}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <div className="app-logo">
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
          <button className={`toggle-btn ${view === 'schedule' ? 'active' : ''}`} onClick={() => setView('schedule')}>List</button>
          <button className={`toggle-btn ${view === 'calendar' ? 'active' : ''}`} onClick={() => setView('calendar')}>Calendar</button>
        </div>

        <div className="header-actions">
          <button className="action-btn theme-toggle" onClick={() => setIsDark(!isDark)}>
            {isDark ? '🌙' : '☀️'}
          </button>
          <button className="logout-btn" onClick={handleLogout} title="Sign Out">
            <img src={user.photoURL} alt="User" />
          </button>
        </div>
      </header>

      <main className="app-content">
        {view === 'schedule' ? (
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
  );
}

export default App;
