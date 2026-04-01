import React, { useState, useEffect } from 'react';
import './App.css';
import { mockTasks } from './data/mockTasks';
import ScheduleView from './components/ScheduleView';
import CalendarView from './components/CalendarView';
import NewTaskForm from './components/NewTaskForm';

function App() {
  const [tasks, setTasks] = useState(mockTasks);
  const [view, setView] = useState('schedule'); // 'schedule' or 'calendar'
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const stored = localStorage.getItem('theme');
    const initDark = stored === 'dark' || (!stored && isDark);
    setIsDarkMode(initDark);
    if (initDark) document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      if (next) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return next;
    });
  };

  const handleCompleteTask = (id, completionDate = null) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        let newCompletedAt = new Date();
        
        if (completionDate) {
          // If coming from Calendar View, use exactly the date clicked
          newCompletedAt = new Date(completionDate);
        } else {
          // If coming from Schedule View (no date passed), we default to NOW.
          // BUT, if the task was already completed in the FUTURE (via calendar),
          // checking it again shouldn't pull it backwards to NOW. We should advance it!
          const currentCompletedAt = new Date(task.completed_at);
          if (currentCompletedAt > new Date()) {
            newCompletedAt = new Date(currentCompletedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
          }
        }

        return {
          ...task,
          completed_at: newCompletedAt.toISOString()
        };
      }
      return task;
    }));
  };

  const handleAddTask = (newTask) => {
    setTasks(prev => [...prev, newTask]);
    setShowNewTaskForm(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>ScheduleIt</h1>
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
        <button 
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          style={{ background: 'transparent', color: 'var(--text-secondary)' }}
        >
          {isDarkMode ? '🌙' : '☀️'}
        </button>
      </header>

      <main className="app-content">
        {view === 'schedule' ? (
          <ScheduleView tasks={tasks} onCompleteTask={handleCompleteTask} />
        ) : (
          <CalendarView tasks={tasks} onCompleteTask={handleCompleteTask} />
        )}
      </main>

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
