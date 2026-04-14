import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
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

import { Alert } from 'react-native';

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

  const indicatorColor = isCritical ? '#ff6b6b' : isInRange ? '#ffd93d' : task.color || '#a48cff';

  // Tiered background logic
  const getCardBg = () => {
    if (isCritical || isInRange) return indicatorColor + '66'; // 40% opacity
    if (isSoon) return indicatorColor + '1A'; // 10% opacity
    return indicatorColor + (isDark ? '0D' : '08'); // 5% vs 3% tint (faded)
  };

  const getBorderColor = () => {
    return indicatorColor + '4D'; // 30% border
  };

  const isFullBg = false; // Toned down, so we treat it as light bg for text contrast

  const handleSchedulePress = () => {
    const isReschedule = isCritical || isInRange;
    Alert.alert(
      isReschedule ? "Reschedule Window" : "Schedule Task",
      isReschedule ? "Shift the entire wiggle window to a new day." : "Choose a day to lock this task to.",
      [
        { text: "Tomorrow", onPress: () => {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          onSchedule(task.id, d.toISOString(), isReschedule ? 'reschedule' : 'lock');
        }},
        { text: "In 3 Days", onPress: () => {
          const d = new Date();
          d.setDate(d.getDate() + 3);
          onSchedule(task.id, d.toISOString(), isReschedule ? 'reschedule' : 'lock');
        }},
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  return (
    <View style={styles.container}>
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
                <Ionicons name="calendar-outline" size={28} color={isSoon || isCritical ? indicatorColor : '#a48cff'} />
              </TouchableOpacity>
            )}

            {(isCritical || isInRange) && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => onComplete(task.id)}>
                <Ionicons 
                  name="checkmark-circle-outline" 
                  size={28} 
                  color={indicatorColor} 
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

import { Dimensions } from 'react-native';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
