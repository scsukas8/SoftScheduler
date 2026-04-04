import React, { useState, useEffect } from 'react';
import './App.css';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { subscribeTasks, addTask, updateTask, deleteTask } from './services/dataService';
import ScheduleView from './components/ScheduleView';
import CalendarView from './components/CalendarView';
import NewTaskForm from './components/NewTaskForm';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [tasksHistory, setTasksHistory] = useState([]);
  const [view, setView] = useState('schedule');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('scheduleit-theme') === 'dark' || 
           (!localStorage.getItem('scheduleit-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Theme Sync
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('scheduleit-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('scheduleit-theme', 'light');
    }
  }, [isDark]);

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
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const saveHistory = () => {
    setTasksHistory(prev => [...prev, tasks].slice(-20));
  };

  const handleUndo = async () => {
    if (tasksHistory.length > 0 && user) {
      const previousState = tasksHistory[tasksHistory.length - 1];
      // Sync back to firestore
      for (const task of previousState) {
        const currentTask = tasks.find(t => t.id === task.id);
        if (currentTask && JSON.stringify(currentTask) !== JSON.stringify(task)) {
          await updateTask(user.uid, task.id, task);
        }
      }
      setTasksHistory(prev => prev.slice(0, -1));
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowNewTaskForm(true);
  };

  const handleSaveTask = async (taskData) => {
    if (user) {
      saveHistory();
      if (editingTask) {
        // Remove the 'id' from the update payload since Firestore update takes it separately
        const { id, ...data } = taskData;
        await updateTask(user.uid, id, data);
      } else {
        // For new tasks, we let Firestore generate the ID or use the one from NewTaskForm
        // But our dataService uses addDoc which generates a new ID.
        // We'll strip the placeholder ID from the form if any.
        const { id, ...data } = taskData;
        await addTask(user.uid, data);
      }
      setShowNewTaskForm(false);
      setEditingTask(null);
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

    await updateTask(user.uid, id, { completed_at: newCompletedAt.toISOString() });
  };

  if (loading) {
    return <div className="loading-screen">Loading ScheduleIt...</div>;
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
          <h1>ScheduleIt</h1>
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
            <h1>ScheduleIt</h1>
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
          <ScheduleView tasks={tasks} onCompleteTask={handleCompleteTask} onEditTask={handleEditTask} />
        ) : (
          <CalendarView tasks={tasks} onCompleteTask={handleCompleteTask} onEditTask={handleEditTask} />
        )}
      </main>

      {tasksHistory.length > 0 && (
        <button className="fab-undo animate-fade-in" onClick={handleUndo} title="Undo Last Action">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      )}

      <button className="fab-add" onClick={() => { setEditingTask(null); setShowNewTaskForm(true); }}>
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
      </button>

      {showNewTaskForm && (
        <NewTaskForm 
          task={editingTask}
          onClose={() => { setShowNewTaskForm(false); setEditingTask(null); }} 
          onSave={handleSaveTask} 
          onDelete={handleDeleteTask}
        />
      )}
    </div>
  );
}

export default App;

