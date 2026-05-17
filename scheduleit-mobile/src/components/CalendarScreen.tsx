import React, { useMemo, useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, useColorScheme, Modal, TextInput, Pressable, Vibration } from 'react-native';
import { calculateTimeRemaining } from '@scheduleit/core';
import { GestureDetector, Gesture, State } from 'react-native-gesture-handler';
import Animated, { useSharedValue, runOnJS, useAnimatedRef, measure, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

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

const DayHoverHighlight = ({ dayId, hoveredDaySV }: { dayId: string, hoveredDaySV: Animated.SharedValue<string | null> }) => {
  const style = useAnimatedStyle(() => {
    const isHovered = hoveredDaySV.value === dayId;
    return {
      opacity: withTiming(isHovered ? 1 : 0, { duration: 150 }),
    };
  });
  
  return <Animated.View style={[StyleSheet.absoluteFill, styles.cellHoverHighlight, style]} pointerEvents="none" />;
};

export default function CalendarScreen({ 
  tasks = [], 
  isDark,
  onCompleteTask, 
  onEditTask, 
  onScheduleTask,
  onPuntTask
}: { 
  tasks: any[], 
  isDark: boolean,
  onCompleteTask: (taskId: string, dayId: string) => void, 
  onEditTask: (task: any, dayId?: string) => void, 
  onScheduleTask: (taskId: string, dayId: string, mode?: 'lock' | 'reschedule') => void,
  onPuntTask: (taskId: string, days: number) => void
}) {
  // Quick Action States
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [isQuickActionsVisible, setIsQuickActionsVisible] = useState(false);
  const [isPuntDialogVisible, setIsPuntDialogVisible] = useState(false);
  const [puntDays, setPuntDays] = useState('1');

  // Bulletproof Drag and Drop
  const [draggedTask, setDraggedTask] = useState<any>(null);
  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const isDragging = useSharedValue(false);
  const hoveredDaySV = useSharedValue<string | null>(null);

  const ghostStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: 100,
    height: 28,
    transform: [
      { translateX: dragX.value - 50 },
      { translateY: dragY.value - 60 }, // Offset upwards so it's not hidden by the thumb
      { scale: withSpring(isDragging.value ? 1.5 : 1) }
    ],
    opacity: withTiming(isDragging.value ? 0.9 : 0),
    zIndex: 9999,
  }));

  // 14 static refs for synchronous layout measuring
  const containerRef = useAnimatedRef<View>();
  const cellRefs = [
    useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(),
    useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>(), useAnimatedRef<View>()
  ];

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
      ) as any;
      
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

  const dayIdsSV = useSharedValue(days.map(d => d.toISOString()));
  const handleDragDrop = (taskId: string, startDayId: string, endDayId: string, isLocked: boolean) => {
    if (isLocked) {
      onScheduleTask(taskId, endDayId, 'lock');
    } else {
      const startDate = new Date(startDayId);
      const endDate = new Date(endDayId);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      const diffTime = endDate.getTime() - startDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays !== 0) {
        onPuntTask(taskId, diffDays);
      }
    }
  };

  const createDragGesture = (task: any, dayId: string) => {
    const taskSummary = { id: task.id, name: task.name, color: task.color, isLocked: !!task.scheduled_date };
    
    return Gesture.Pan()
      .activateAfterLongPress(300)
      .onStart((e) => {
        runOnJS(setDraggedTask)(taskSummary);
        isDragging.value = true;
        const c = measure(containerRef);
        dragX.value = e.absoluteX - (c?.pageX || 0);
        dragY.value = e.absoluteY - (c?.pageY || 0);
        runOnJS(Vibration.vibrate)(15);
      })
      .onUpdate((e) => {
        const c = measure(containerRef);
        dragX.value = e.absoluteX - (c?.pageX || 0);
        dragY.value = e.absoluteY - (c?.pageY || 0);
        
        let foundIdx = -1;
        // Unrolled for maximum worklet safety and performance
        const x = e.absoluteX; const y = e.absoluteY;
        const check = (i: number, ref: any) => {
          'worklet';
          const m = measure(ref);
          if (m && x >= m.pageX && x <= m.pageX + m.width && y >= m.pageY && y <= m.pageY + m.height) return true;
          return false;
        };
        
        if (check(0, cellRefs[0])) foundIdx = 0;
        else if (check(1, cellRefs[1])) foundIdx = 1;
        else if (check(2, cellRefs[2])) foundIdx = 2;
        else if (check(3, cellRefs[3])) foundIdx = 3;
        else if (check(4, cellRefs[4])) foundIdx = 4;
        else if (check(5, cellRefs[5])) foundIdx = 5;
        else if (check(6, cellRefs[6])) foundIdx = 6;
        else if (check(7, cellRefs[7])) foundIdx = 7;
        else if (check(8, cellRefs[8])) foundIdx = 8;
        else if (check(9, cellRefs[9])) foundIdx = 9;
        else if (check(10, cellRefs[10])) foundIdx = 10;
        else if (check(11, cellRefs[11])) foundIdx = 11;
        else if (check(12, cellRefs[12])) foundIdx = 12;
        else if (check(13, cellRefs[13])) foundIdx = 13;

        if (foundIdx !== -1) {
          hoveredDaySV.value = dayIdsSV.value[foundIdx];
        } else {
          hoveredDaySV.value = null;
        }
      })
      .onEnd((e) => {
        if (hoveredDaySV.value) {
          runOnJS(handleDragDrop)(taskSummary.id, dayId, hoveredDaySV.value, taskSummary.isLocked);
          runOnJS(Vibration.vibrate)(10);
        }
        isDragging.value = false;
        hoveredDaySV.value = null;
        runOnJS(setDraggedTask)(null);
      });
  };

  return (
    <View ref={containerRef} style={[styles.container, { backgroundColor: isDark ? '#1E1E1E' : '#f8f9fa' }]}>
      <Text style={[styles.header, { color: isDark ? '#fff' : '#222' }]}>Upcoming 14 Days</Text>
      
      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        scrollEnabled={!draggedTask} // Lock scroll while dragging!
      >
        <View style={styles.grid}>
          {days.map((day, index) => {
            const dayId = day.toISOString();
            const dayTasks = dayTasksMap[dayId] || [];
            const isToday = day.toDateString() === new Date().toDateString();
            const isPast = day < new Date() && !isToday;

            return (
              <Pressable key={dayId} onPress={() => onEditTask(null, dayId)}>
                <View 
                  ref={cellRefs[index]} style={[
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
                          
                          <GestureDetector gesture={createDragGesture(task, dayId)}>
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
                                  opacity: (draggedTask?.id === task.id) ? 0.3 : task.wiggleOpacity 
                                }
                              ]}
                              onPress={() => {
                                setSelectedTask({ ...task, dayId });
                                setIsQuickActionsVisible(true);
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
                          </GestureDetector>
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
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Quick Actions Modal */}
      <Modal visible={isQuickActionsVisible} transparent animationType="fade" onRequestClose={() => setIsQuickActionsVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsQuickActionsVisible(false)}>
          <View style={[styles.quickActionsContent, { backgroundColor: isDark ? '#2A2A2A' : '#fff' }]}>
            <Text style={[styles.quickTaskName, { color: isDark ? '#fff' : '#000' }]}>{selectedTask?.name}</Text>
            
            <View style={styles.quickActionsRow}>
              <TouchableOpacity style={styles.quickActionBtn} onPress={() => { onCompleteTask(selectedTask.id, selectedTask.dayId); setIsQuickActionsVisible(false); }}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(52, 211, 153, 0.1)' }]}><Ionicons name="checkmark-circle-outline" size={28} color="#34d399" /></View>
                <Text style={[styles.quickActionLabel, { color: isDark ? '#ccc' : '#333' }]}>Complete</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionBtn} onPress={() => { setIsQuickActionsVisible(false); setIsPuntDialogVisible(true); }}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(164, 140, 255, 0.1)' }]}><Ionicons name="arrow-forward-outline" size={28} color="#a48cff" /></View>
                <Text style={[styles.quickActionLabel, { color: isDark ? '#ccc' : '#333' }]}>Punt</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.quickActionBtn} onPress={() => { setIsQuickActionsVisible(false); onEditTask(selectedTask); }}>
                <View style={[styles.quickActionIcon, { backgroundColor: 'rgba(100, 100, 100, 0.1)' }]}><Ionicons name="create-outline" size={28} color={isDark ? '#aaa' : '#666'} /></View>
                <Text style={[styles.quickActionLabel, { color: isDark ? '#ccc' : '#333' }]}>Full Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Punt Dialog */}
      <Modal visible={isPuntDialogVisible} transparent animationType="fade" onRequestClose={() => setIsPuntDialogVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.puntDialogContent, { backgroundColor: isDark ? '#2A2A2A' : '#fff' }]}>
            <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>Punt "{selectedTask?.name}"</Text>
            <Text style={[styles.modalSub, { color: isDark ? '#aaa' : '#666' }]}>How many days would you like to push this forward?</Text>
            
            <View style={styles.puntInputContainer}>
              <TextInput style={[styles.puntInput, { color: isDark ? '#fff' : '#000', borderColor: isDark ? '#444' : '#ddd' }]} value={puntDays} onChangeText={setPuntDays} keyboardType="number-pad" autoFocus selectTextOnFocus />
              <Text style={[styles.puntSuffix, { color: isDark ? '#aaa' : '#666' }]}>days</Text>
            </View>

            <Text style={styles.puntHint}>*you can also drag it in the calendar</Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsPuntDialogVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: isDark ? '#aaa' : '#666' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={() => { onPuntTask(selectedTask.id, parseInt(puntDays) || 1); setIsPuntDialogVisible(false); }}>
                <Text style={styles.confirmBtnText}>Push Forward</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Ghost Task */}
      <Animated.View style={ghostStyle} pointerEvents="none">
        <View style={[
          styles.taskPill, 
          { 
            backgroundColor: resolveColor(draggedTask?.color), 
            opacity: 1, 
            borderWidth: 0,
            width: 100, 
          }
        ]}>
          <Text style={[styles.taskLabelText, { color: '#000', fontWeight: '800' }]} numberOfLines={1}>
            {draggedTask?.name}
          </Text>
        </View>
      </Animated.View>

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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionsContent: {
    width: '80%',
    padding: 24,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  quickTaskName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  quickActionBtn: {
    alignItems: 'center',
    gap: 8,
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  puntDialogContent: {
    width: '85%',
    padding: 24,
    borderRadius: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  puntInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  puntInput: {
    fontSize: 32,
    fontWeight: '800',
    borderBottomWidth: 2,
    width: 60,
    textAlign: 'center',
    paddingBottom: 4,
  },
  puntSuffix: {
    fontSize: 18,
    fontWeight: '600',
  },
  puntHint: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 16,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  confirmBtn: {
    backgroundColor: '#a48cff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  confirmBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
});
