import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { calculateTimeRemaining } from '@scheduleit/core';
import Animated, { FadeInUp, SlideOutRight, LinearTransition } from 'react-native-reanimated';
import TaskCard from './TaskCard';

export default function ScheduleScreen({ tasks, onCompleteTask, onEditTask, onScheduleTask }: { 
  tasks: any[]; 
  onCompleteTask: (id: string) => void;
  onEditTask: (task: any) => void;
  onScheduleTask: any; 
}) {
  // Sort tasks by time remaining (most overdue/urgent first)
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aInfo = calculateTimeRemaining(a.completed_at, a.interval_days, a.scheduled_date, a.wiggle_room, a.wiggle_type);
      const bInfo = calculateTimeRemaining(b.completed_at, b.interval_days, b.scheduled_date, b.wiggle_room, b.wiggle_type);
      
      const getPriority = (info: any) => {
        const end = info.windowEndDiff ?? 0;
        const start = info.windowStartDiff ?? 0;
        // Tier 0: Overdue or Due Now (unlocked)
        if (end < 0 || (start <= 0 && !info.isScheduled)) return 0;
        // Tier 1: Scheduled (locked commitment)
        if (info.isScheduled) return 1;
        // Tier 2: Soon (unlocked, next 7 days)
        if (start <= 7) return 2;
        // Tier 3: Distant
        return 3;
      };

      const aPrior = getPriority(aInfo);
      const bPrior = getPriority(bInfo);

      if (aPrior !== bPrior) return aPrior - bPrior;

      // Internal sorting within the same tier
      if (aPrior <= 1) {
        // Overdue, Due, or Scheduled: sort by deadline/lock-date
        return (aInfo.windowEndDiff ?? 0) - (bInfo.windowEndDiff ?? 0);
      } else {
        // Soon or Distant: sort by horizon (first possible day)
        return (aInfo.windowStartDiff ?? 0) - (bInfo.windowStartDiff ?? 0);
      }
    });
  }, [tasks]);

  const renderItem = ({ item }: { item: any }) => {
    return (
      <Animated.View
        entering={FadeInUp}
        exiting={SlideOutRight}
        layout={LinearTransition.springify()}
      >
        <TaskCard 
          task={item} 
          onComplete={() => onCompleteTask && onCompleteTask(item.id)}
          onEdit={() => onEditTask && onEditTask(item)}
          onSchedule={onScheduleTask}
        />
      </Animated.View>
    );
  };

  const isDark = useColorScheme() === 'dark';

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#1E1E1E' : '#f8f9fa' }]}>
      <Text style={[styles.header, { color: isDark ? '#fff' : '#222' }]}>Schedule View</Text>
      
      {sortedTasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No tasks scheduled.</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={sortedTasks}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 20,
    paddingTop: 20
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24
  },
  listContent: {
    paddingBottom: 40
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    color: '#888',
    fontSize: 16
  }
});
