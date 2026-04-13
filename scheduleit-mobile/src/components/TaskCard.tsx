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

export default function TaskCard({ task, onComplete, onEdit }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const interval = task.interval_days || 1;
  const wiggle = task.wiggle_room || 0;

  const { isOverdue, daysRemaining, hoursRemaining, hoursTotal } = useMemo(() => {
    return calculateTimeRemaining(task.completed_at, interval);
  }, [task.completed_at, interval]);

  const { isWiggle, formattedTime, isCritical } = useMemo(() => {
    return formatTimeRemaining(isOverdue, daysRemaining, hoursRemaining, wiggle, hoursTotal);
  }, [isOverdue, daysRemaining, hoursRemaining, wiggle, hoursTotal]);

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
    opacity: opacity.value
  }));

  const indicatorColor = isCritical ? '#ff6b6b' : isWiggle ? '#ffd93d' : task.color || '#a48cff';

  return (
    <View style={styles.container}>
      <GestureDetector gesture={dragGesture}>
        <Animated.View style={[
          styles.card, 
          animatedStyle, 
          { 
            backgroundColor: indicatorColor + (isDark ? '1A' : '0F'), // 10% vs 6% tint
            borderColor: indicatorColor + (isDark ? '4D' : '33'), // 30% vs 20% border
          }
        ]}>
          <View style={[styles.indicator, { backgroundColor: indicatorColor }]} />
          
          <View style={styles.content}>
            <Text style={[styles.title, { color: isDark ? '#fff' : '#222' }]} numberOfLines={1}>{task.name}</Text>
            <Text style={[styles.subtitle, { color: isDark ? '#888' : '#666' }]}>{formattedTime}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => onEdit(task)}>
              <Ionicons name="create-outline" size={24} color="#888" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={() => onComplete(task.id)}>
              <Ionicons name="checkmark-circle-outline" size={28} color={indicatorColor} />
            </TouchableOpacity>
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
  }
});
