import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp, SlideOutRight, LinearTransition } from 'react-native-reanimated';
import TaskCard from './TaskCard';

export default function ScheduleScreen({ tasks, onCompleteTask, onEditTask }) {
  // Sort tasks by time remaining (most overdue/urgent first)
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const getTargetTime = (task) => {
        const completedDate = (task.completed_at && typeof task.completed_at.toDate === 'function') 
          ? task.completed_at.toDate() 
          : new Date(task.completed_at || Date.now());
        return completedDate.getTime() + (task.interval_days || 1) * 24 * 60 * 60 * 1000;
      };
      return getTargetTime(a) - getTargetTime(b);
    });
  }, [tasks]);

  const renderItem = ({ item }) => {
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
        />
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Schedule View</Text>
      
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
