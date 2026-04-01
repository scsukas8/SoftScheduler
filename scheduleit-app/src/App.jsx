import React, { useState, useEffect } from 'react';
import './App.css';
import { mockTasks } from './data/mockTasks';
import ScheduleView from './components/ScheduleView';
import CalendarView from './components/CalendarView';
import NewTaskForm from './components/NewTaskForm';

function App() {
  const [tasks, setTasks] = useState(mockTasks);
  const [tasksHistory, setTasksHistory] = useState([]);
  const [view, setView] = useState('schedule'); // 'schedule' or 'calendar'
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('scheduleit-theme') === 'dark' || 
           (!localStorage.getItem('scheduleit-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('scheduleit-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('scheduleit-theme', 'light');
    }
  }, [isDark]);

  const saveHistory = () => {
    setTasksHistory(prev => [...prev, tasks].slice(-20)); // Keep last 20 states
  };

  const handleUndo = () => {
    if (tasksHistory.length > 0) {
      const previousState = tasksHistory[tasksHistory.length - 1];
      setTasks(previousState);
      setTasksHistory(prev => prev.slice(0, -1));
    }
  };

  const handleAddTask = (newTask) => {
    saveHistory();
    setTasks(prev => [...prev, newTask]);
    setShowNewTaskForm(false);
  };

  const handleCompleteTask = (id, completionDate = null) => {
    saveHistory();
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        let newCompletedAt = new Date();
        
        if (completionDate) {
          // If coming from Calendar View, use exactly the date clicked
          newCompletedAt = new Date(completionDate);
        } else {
          // If coming from Schedule View, we check if the task is already pushed into the future.
          // By looking at the TARGET DUE DATE.
          const currentCompletedAt = new Date(task.completed_at);
          const currentTargetDate = new Date(currentCompletedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
          
          if (currentTargetDate > new Date()) {
            // Task isn't due yet! Clicking complete means we want to advance it out further!
            newCompletedAt = new Date(currentCompletedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
          }
        }

        return { ...task, completed_at: newCompletedAt.toISOString() };
      }
      return task;
    }));
  };

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
          <button 
            className={`toggle-btn ${view === 'schedule' ? 'active' : ''}`}
            onClick={() => setView('schedule')}
          >
            List
          </button>
          <button 
            className={`toggle-btn ${view === 'calendar' ? 'active' : ''}`}
            onClick={() => setView('calendar')}
          >
            Calendar
          </button>
        </div>

        <div className="header-actions">
          <button 
            className="action-btn theme-toggle" 
            onClick={() => setIsDark(!isDark)}
            title="Toggle Theme"
            style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
          >
            {isDark ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      <main className="app-content">
        {view === 'schedule' ? (
          <ScheduleView tasks={tasks} onCompleteTask={handleCompleteTask} />
        ) : (
          <CalendarView tasks={tasks} onCompleteTask={handleCompleteTask} />
        )}
      </main>

      {tasksHistory.length > 0 && (
        <button 
          className="fab-undo animate-fade-in" 
          aria-label="Undo Last Action"
          onClick={handleUndo}
          title="Undo Last Action"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" />
            <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
          </svg>
        </button>
      )}

      <button 
        className="fab-add" 
        aria-label="Add New Task"
        onClick={() => setShowNewTaskForm(true)}
      >
        <svg viewBox="0 0 24 24" width="32" height="32">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
      </button>

      {showNewTaskForm && (
        <NewTaskForm 
          onClose={() => setShowNewTaskForm(false)} 
          onSave={handleAddTask} 
        />
      )}
    </div>
  );
}

export default App;
