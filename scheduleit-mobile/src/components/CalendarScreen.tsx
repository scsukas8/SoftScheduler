import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import { calculateTimeRemaining } from '@scheduleit/core';
import RoundaboutMenu from './RoundaboutMenu';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarScreen({ tasks = [], onCompleteTask, onEditTask }) {
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

  const dayTasksMap = useMemo(() => {
    const map = {};
    days.forEach(d => map[d.toISOString()] = []);

    tasks.forEach(task => {
      const completedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at || Date.now());

      if (isNaN(completedAt.getTime())) return;

      const { daysRemaining } = calculateTimeRemaining(completedAt, task.interval_days);
      const wiggle = parseInt(task.wiggle_room || 0, 10);
      const isLateOnly = task.wiggle_type === 'late-only';
      
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

  const handleCellPress = (dayId, layoutEvt) => {
    // In React Native, measuring layout to absolute screen coords requires ref.measure()
    // For simplicity, we just use the center of the screen or approximate since we have a modal overlay
    // Actually, capturing coords natively: 
    // We'll just pass 'center' mapped to the screen since the popover normally hovers
    // We can simulate position: { x: SCREEN_WIDTH/2, y: 300 } for now until we add measure blocks
    setActiveDay({ 
      id: dayId, 
      x: SCREEN_WIDTH / 2, 
      y: 400 
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Upcoming 14 Days</Text>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {days.map((day, index) => {
            const dayId = day.toISOString();
            const dayTasks = dayTasksMap[dayId] || [];
            const isToday = day.toDateString() === new Date().toDateString();
            
            return (
              <TouchableOpacity 
                key={dayId}
                style={[styles.cell, isToday && styles.cellToday]}
                onPress={(evt) => handleCellPress(dayId, evt)}
              >
                <View style={styles.cellHeader}>
                  <Text style={[styles.dayName, isToday && styles.textToday]}>
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[styles.dayNum, isToday && styles.textToday]}>
                    {day.getDate()}
                  </Text>
                </View>

                <View style={styles.taskIndicators}>
                  {dayTasks.map(task => (
                    <TouchableOpacity
                      key={task.id + (task.isHistorical ? '-hist' : '')}
                      style={[
                        styles.taskLabel, 
                        { backgroundColor: task.color, opacity: task.isHistorical ? 0.4 : 1 }
                      ]}
                      onPress={() => onEditTask && onEditTask(task)}
                    >
                      <Text style={styles.taskLabelText} numberOfLines={1}>
                        {task.isOverdue ? '! ' : ''}{task.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {activeDay && (
        <RoundaboutMenu 
          tasks={(dayTasksMap[activeDay.id] || []).filter(t => !t.isHistorical)} 
          position={activeDay}
          onClose={() => setActiveDay(null)}
          onComplete={(taskId) => onCompleteTask && onCompleteTask(taskId, activeDay.id)}
          onAddTask={() => onEditTask && onEditTask(null, activeDay.id)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 10,
    paddingTop: 20
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
    paddingHorizontal: 10
  },
  scrollContent: {
    paddingBottom: 40
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  cell: {
    width: '31%',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    minHeight: 110,
    borderWidth: 1,
    borderColor: '#333'
  },
  cellToday: {
    borderColor: '#a48cff',
    borderWidth: 2,
    backgroundColor: '#302b40'
  },
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  dayName: {
    color: '#888',
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase'
  },
  dayNum: {
    color: '#ccc',
    fontSize: 18,
    fontWeight: 'bold'
  },
  textToday: {
    color: '#a48cff'
  },
  taskIndicators: {
    flex: 1,
    gap: 4
  },
  taskLabel: {
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginBottom: 4
  },
  taskLabelText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600'
  }
});
