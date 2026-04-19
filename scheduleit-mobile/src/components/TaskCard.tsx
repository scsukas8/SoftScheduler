import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import { calculateTimeRemaining, formatTimeRemaining } from '@scheduleit/core';
import { Ionicons } from '@expo/vector-icons';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  runOnJS,
  withTiming
} from 'react-native-reanimated';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';

import ScheduleModal from './ScheduleModal';

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

interface TaskCardProps {
  task: any;
  onComplete: (id: string) => void;
  onEdit: (task: any) => void;
  onSchedule: (id: string, date: string, mode?: 'lock' | 'reschedule') => void;
}

export default function TaskCard({ task, onComplete, onEdit, onSchedule }: TaskCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const interval = task.interval_days || 1;
  const wiggle = task.wiggle_room || 0;

  const { isOverdue, daysRemaining, windowStartDiff, windowEndDiff, hoursTotal, isScheduled } = useMemo(() => {
    return calculateTimeRemaining(task.completed_at, interval, task.scheduled_date, wiggle, task.wiggle_type);
  }, [task.completed_at, interval, task.scheduled_date, wiggle, task.wiggle_type]);

  const { isInRange, isSoon, isDistant, isCritical, formattedTime } = useMemo(() => {
    return formatTimeRemaining(isOverdue, daysRemaining, windowStartDiff, windowEndDiff, isScheduled);
  }, [isOverdue, daysRemaining, windowStartDiff, windowEndDiff, isScheduled]);

  // Swipe logic
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const dragGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Only allow swiping right
      if (e.translationX > 0) {
        translateX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (e.translationX > 150) {
        // Complete!
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 200 }, () => {
          runOnJS(onComplete)(task.id);
        });
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: isDistant ? 0.6 : 1, // Consistent with web
  }));

  const taskColor = resolveColor(task.color);

  // Tiered background logic matching Web opacity levels (60% transparent = 40% opacity = '66')
  const getCardBg = () => {
    if (isCritical || isInRange) return taskColor + '66'; 
    if (isSoon) return taskColor + '1A'; 
    return taskColor + (isDark ? '0D' : '08'); 
  };

  const getBorderColor = () => {
    if (isCritical || isInRange) return taskColor + '66'; // Web says 40% transparent = 60% opacity = '99'. Let's stick with subtle borders
    return taskColor + '4D'; // 30% border default
  };

  const isFullBg = false; // Toned down, so we treat it as light bg for text contrast
  const [scheduleMode, setScheduleMode] = useState<null | 'lock' | 'reschedule'>(null);

  const handleSchedulePress = () => {
    const isReschedule = isCritical || isInRange;
    setScheduleMode(isReschedule ? 'reschedule' : 'lock');
  };

  return (
    <View style={styles.container}>
      {scheduleMode && (
        <ScheduleModal 
          visible={!!scheduleMode}
          task={task}
          mode={scheduleMode}
          onClose={() => setScheduleMode(null)}
          onSchedule={onSchedule}
        />
      )}
      <GestureDetector gesture={dragGesture}>
        <Animated.View style={[
          styles.card, 
          animatedStyle, 
          { 
            backgroundColor: getCardBg(),
            borderColor: getBorderColor(),
          }
        ]}>
          <View style={[styles.indicator, { backgroundColor: task.color || '#a48cff' }]} />
          
          <View style={styles.content}>
            <Text style={[
              styles.title, 
              { color: isDark ? '#fff' : '#222' },
              isCritical && styles.italic
            ]} numberOfLines={1}>{task.name}</Text>
            <Text style={[
              styles.subtitle, 
              { color: isDark ? '#888' : '#666' },
              isCritical && styles.italic
            ]}>
              {formattedTime}
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(task)}>
              <Ionicons name="create-outline" size={24} color="#888" />
            </TouchableOpacity>
            
            {(isCritical || !isInRange) && (
              <TouchableOpacity style={styles.iconBtn} onPress={handleSchedulePress}>
                <Ionicons name="calendar-outline" size={28} color={isSoon || isCritical ? taskColor : '#a48cff'} />
              </TouchableOpacity>
            )}

            {(isCritical || isInRange) && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => onComplete(task.id)}>
                <Ionicons 
                  name="checkmark-circle-outline" 
                  size={28} 
                  color={taskColor} 
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    overflow: 'hidden',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
  },
  indicator: {
    width: 6,
    height: '60%',
    borderRadius: 3,
    marginRight: 16
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  iconBtn: {
    padding: 8,
  },
  italic: {
    fontStyle: 'italic',
  }
});
