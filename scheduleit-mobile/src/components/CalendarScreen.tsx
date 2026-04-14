import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity } from 'react-native';
import { calculateTimeRemaining } from '@scheduleit/core';
import RoundaboutMenu from './RoundaboutMenu';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CalendarScreen({ tasks = [], onCompleteTask, onEditTask, onScheduleTask }) {
  const [activeDay, setActiveDay] = useState(null); // { id, x, y }
  
  // Shared values for Hold-and-Swipe
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const activeTaskSV = useSharedValue(null); // Shared value for the hovered task

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

      const { windowStartDiff, windowEndDiff } = calculateTimeRemaining(
        completedAt, 
        task.interval_days, 
        task.scheduled_date,
        task.wiggle_room,
        task.wiggle_type
      );
      
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

  const handleDaySelect = (dayId, x, y) => {
    setActiveDay({ id: dayId, x, y });
  };

  const handleCommit = (id) => {
    if (!activeDay) return;
    if (id === 'create') {
      onEditTask && onEditTask(null, activeDay.id);
    } else {
      const isFuture = new Date(activeDay.id) > new Date();
      if (isFuture) {
        onScheduleTask && onScheduleTask(id, activeDay.id);
      } else {
        onCompleteTask && onCompleteTask(id, activeDay.id);
      }
    }
    setActiveDay(null);
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

            // Unified Gesture for this cell
            const panGesture = Gesture.Pan()
              .onBegin((e) => {
                gestureX.value = 0;
                gestureY.value = 0;
              })
              .onUpdate((e) => {
                gestureX.value = e.translationX;
                gestureY.value = e.translationY;
              })
              .onEnd((e) => {
                if (activeTaskSV.value) {
                  // If we have a task hovered, commit it!
                  runOnJS(handleCommit)(activeTaskSV.value);
                } else {
                  // No task hovered, close
                  runOnJS(setActiveDay)(null);
                }
              });

            const longPressGesture = Gesture.LongPress()
              .onEnd((e, success) => {
                if (success) {
                  runOnJS(handleDaySelect)(dayId, e.absoluteX, e.absoluteY);
                }
              });

            const tapGesture = Gesture.Tap()
              .onEnd((e, success) => {
                if (success) {
                  runOnJS(handleDaySelect)(dayId, e.absoluteX, e.absoluteY);
                }
              });

            const composed = Gesture.Simultaneous(panGesture, Gesture.Exclusive(longPressGesture, tapGesture));

            return (
              <GestureDetector key={dayId} gesture={composed}>
                <View style={[styles.cell, isToday && styles.cellToday]}>
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
                </View>
              </GestureDetector>
            );
          })}
        </View>
      </ScrollView>

      {activeDay && (
        <RoundaboutMenu 
          tasks={(dayTasksMap[activeDay.id] || []).filter(t => !t.isHistorical)} 
          position={activeDay}
          externalTranslateX={gestureX}
          externalTranslateY={gestureY}
          hoveredTaskSV={activeTaskSV} // Pass the SV to be written to
          onClose={() => setActiveDay(null)}
          onComplete={(taskId) => onCompleteTask && onCompleteTask(taskId, activeDay.id)}
          onSchedule={onScheduleTask}
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
    justifyContent: 'flex-start',
    gap: 10
  },
  cell: {
    width: (SCREEN_WIDTH - 40) / 3, // Precise calculation with gap
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
