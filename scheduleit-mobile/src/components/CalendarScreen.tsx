import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { calculateTimeRemaining } from '@scheduleit/core';
import RoundaboutMenu from './RoundaboutMenu';
import { GestureDetector, Gesture, State } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS } from 'react-native-reanimated';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLOR_MAP: Record<string, string> = {
  'var(--color-purple)': '#a48cff',
  'var(--color-pink)': '#ff8ca4',
  'var(--color-blue)': '#8ce1ff',
  'var(--color-green)': '#8cffb6',
  'var(--color-yellow)': '#ffdc8c',
  'var(--color-orange)': '#ffb68c',
  'var(--color-red)': '#ff8c8c',
};

const resolveColor = (color: string | undefined) => {
  if (!color) return '#a48cff';
  return COLOR_MAP[color] || color;
};

export default function CalendarScreen({ 
  tasks = [], 
  isDark,
  onCompleteTask, 
  onEditTask, 
  onScheduleTask 
}: { 
  tasks: any[], 
  isDark: boolean,
  onCompleteTask: (taskId: string, dayId: string) => void, 
  onEditTask: (task: any, dayId?: string) => void, 
  onScheduleTask: (taskId: string, dayId: string) => void 
}) {
  const [activeDay, setActiveDay] = useState(null); // { id, x, y }
  const [committingTaskId, setCommittingTaskId] = useState(null);
  const lastEditTime = useRef(0);
  
  // Shared values for Hold-and-Swipe
  const gestureX = useSharedValue(0);
  const gestureY = useSharedValue(0);
  const touchStartTime = useSharedValue(0);
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
    const map: Record<string, any[]> = {};
    const daySlots: Record<string, (string | null)[]> = {};
    
    days.forEach(d => {
      const iso = d.toISOString();
      map[iso] = [];
      daySlots[iso] = [];
    });

    // 1. Sort tasks by duration or priority to fill slots more efficiently
    const sortedInputTasks = [...tasks].sort((a, b) => {
      const aInt = a.interval_days || 1;
      const bInt = b.interval_days || 1;
      return bInt - aInt; // Longer tasks first
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
          // Safety break to prevent infinite loop
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
          daySlots[dayIso][slotIndex] = task.id; // Mark slot as taken for both active and historical days

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

  const handleDaySelect = (dayId, x, y) => {
    if (Date.now() - lastEditTime.current < 500) return; // Prevent Native RNGH from opening wheel during JS touch layer Edit task
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
    setCommittingTaskId(id);
    setTimeout(() => {
      setActiveDay(null);
      setCommittingTaskId(null);
      activeTaskSV.value = null; // Clear shared hover state to prevent cross-day ghost commits
    }, 450);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E1E1E' : '#f8f9fa' }]}>
      <Text style={[styles.header, { color: isDark ? '#fff' : '#222' }]}>Upcoming 14 Days</Text>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {days.map((day, index) => {
            const dayId = day.toISOString();
            const dayTasks = dayTasksMap[dayId] || [];
            const isToday = day.toDateString() === new Date().toDateString();
            const isPast = day < new Date() && !isToday;

            // Unified Gesture for this cell
            const panGesture = Gesture.Pan()
              .onBegin((e) => {
                gestureX.value = 0;
                gestureY.value = 0;
                touchStartTime.value = Date.now();
                // Instantly spawn menu upon firm touch (0ms delay)
                runOnJS(handleDaySelect)(dayId, e.absoluteX, e.absoluteY);
              })
              .onUpdate((e) => {
                gestureX.value = e.translationX;
                gestureY.value = e.translationY;
              })
              .onEnd((e) => {
                const distance = Math.sqrt(e.translationX ** 2 + e.translationY ** 2);
                const elapsed = Date.now() - touchStartTime.value;
                
                // If they actively dragged
                if (distance > 10) {
                  if (activeTaskSV.value) {
                    runOnJS(handleCommit)(activeTaskSV.value);
                  } else {
                    // Swiped but missed a bubble, abort and close
                    runOnJS(setActiveDay)(null);
                    activeTaskSV.value = null; 
                  }
                } else {
                  // If distance <= 10
                  // If elapsed < 500ms, it's a fast tap! Leave menu open.
                  // If elapsed >= 500ms, it's an aborted long press! Close it!
                  if (elapsed >= 500) {
                    runOnJS(setActiveDay)(null);
                    activeTaskSV.value = null;
                  }
                }
              })
              .onFinalize((e) => {
                // Only auto-close if the gesture was officially CANCELLED (e.g., by the ScrollView scroll)
                // We do NOT close on FAILED (a tap) because we want the menu to stay open for taps.
                if (e.state === State.CANCELLED) {
                  runOnJS(setActiveDay)(null);
                  activeTaskSV.value = null;
                }
              });

            const composed = panGesture;

            return (
              <GestureDetector key={dayId} gesture={composed}>
                <View style={[
                  styles.cell, 
                  isToday && styles.cellToday,
                  isPast && { opacity: 0.5 },
                  { backgroundColor: isDark ? '#2A2A2A' : '#fff', borderColor: isDark ? '#333' : '#ddd' }
                ]}>
                  <View style={styles.cellHeader}>
                    <Text style={[styles.dayName, { color: isDark ? '#aaa' : '#555' }, isToday && styles.textToday]}>
                      {day.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dayNum, { color: isDark ? '#fff' : '#000' }, isToday && styles.textToday]}>
                      {day.getDate()}
                    </Text>
                  </View>

                  <View style={styles.taskIndicators}>
                    {/* Render up to 3 slots, filling empty ones with spacers */}
                    {[0, 1, 2].map(slotIdx => {
                      const task = dayTasks.find(t => t.slotIndex === slotIdx);
                      if (!task) return <View key={`spacer-${slotIdx}`} style={styles.taskWrapper} />;
                      
                      return (
                        <View key={task.id + (task.isHistorical ? '-hist' : '')} style={styles.taskWrapper}>
                          {/* Continuity Line */}
                          {!task.isHistorical && (
                            <View style={[
                              styles.continuityLine, 
                              { borderColor: resolveColor(task.color) },
                              task.isWindowStart && { left: '50%' },
                              task.isWindowEnd && { right: '50%' }
                            ]} />
                          )}
                          
                          <TouchableOpacity
                            style={[
                              styles.taskPill, 
                              { 
                                backgroundColor: (task.isTarget || task.isHistorical) 
                                  ? resolveColor(task.color) 
                                  : (day.toDateString() === new Date().toDateString() 
                                      ? (isDark ? '#302b40' : '#fff')
                                      : (isDark ? '#2A2A2A' : '#fff')),
                                borderColor: resolveColor(task.color),
                                borderWidth: (task.isTarget || task.isHistorical) ? 0 : 2,
                                opacity: task.wiggleOpacity 
                              }
                            ]}
                            onPress={() => {
                              lastEditTime.current = Date.now();
                              setActiveDay(null);
                              onEditTask && onEditTask(task);
                            }}
                          >
                            <Text 
                              style={[
                                styles.taskLabelText, 
                                { 
                                  color: (task.isTarget || task.isHistorical) 
                                    ? '#000' 
                                    : (isDark ? resolveColor(task.color) : '#333'), // Darker text for light mode hollow pills
                                  fontWeight: (task.isTarget || task.isHistorical) ? '600' : 'bold' 
                                }
                              ]} 
                              numberOfLines={1}
                            >
                              {task.isOverdue ? '! ' : ''}{task.name}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}

                    {/* Overflow Indicator */}
                    {dayTasks.length > 3 && (
                      <View style={styles.moreIndicator}>
                        <Text style={styles.moreText}>
                          + {dayTasks.length - 3} more
                        </Text>
                      </View>
                    )}
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
          externalCommittingId={committingTaskId}
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
    minHeight: 110,
    borderWidth: 2, // Standardized to prevent content shifting
    borderColor: '#333'
  },
  cellToday: {
    borderColor: '#a48cff',
    backgroundColor: '#302b40'
  },
  cellHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    height: 30, // Fixed height to ensure task rows align perfectly
    alignItems: 'center'
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
    gap: 8
  },
  taskWrapper: {
    height: 28,
    justifyContent: 'center',
    position: 'relative'
  },
  continuityLine: {
    position: 'absolute',
    left: -16, // Bridge padding(10) + half-gap(5) + a tiny bit
    right: -16,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dotted',
    top: 14, // Exact middle of taskWrapper(28)
    zIndex: 0
  },
  taskPill: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 20,
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  taskLabelText: {
    color: '#000',
    fontSize: 10, // Slightly smaller for alignment
    fontWeight: '600'
  },
  moreIndicator: {
    alignItems: 'center',
    marginTop: 2
  },
  moreText: {
    fontSize: 10,
    color: '#888',
    fontWeight: 'bold'
  }
});
