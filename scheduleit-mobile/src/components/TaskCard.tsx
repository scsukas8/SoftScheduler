import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { calculateTimeRemaining, formatTimeRemaining } from '@scheduleit/core';

export default function TaskCard({ task, onComplete, onEdit }) {
  const { isOverdue, daysRemaining, hoursRemaining, hoursTotal, timePassedStr } = useMemo(() => {
    return calculateTimeRemaining(task.created_at, task.frequencyInterval);
  }, [task]);

  const { isWiggle, formattedTime, isCritical } = useMemo(() => {
    return formatTimeRemaining(isOverdue, daysRemaining, hoursRemaining, task.wiggleRoom, hoursTotal);
  }, [isOverdue, daysRemaining, hoursRemaining, task.wiggleRoom, hoursTotal]);

  const headerStyle: ViewStyle = {
    ...styles.header,
    backgroundColor: isCritical ? '#5a1f26' : isWiggle ? '#5e4e20' : '#2b2342'
  };

  const statusTextStyle = {
    ...styles.statusText,
    color: isCritical ? '#ffb3b3' : isWiggle ? '#ffdd88' : '#cdb4ff'
  };

  return (
    <View style={styles.card}>
      <View style={headerStyle}>
        <View style={styles.titleRow}>
          <View style={[styles.colorDot, { backgroundColor: task.color }]} />
          <Text style={styles.title}>{task.name}</Text>
        </View>
        <Text style={statusTextStyle}>{formattedTime}</Text>
      </View>

      <View style={styles.body}>
        <View style={styles.statsRow}>
          <View style={styles.statUnit}>
            <Text style={styles.statLabel}>Cycle</Text>
            <Text style={styles.statValue}>{task.frequencyInterval}d</Text>
          </View>
          <View style={styles.statUnit}>
            <Text style={styles.statLabel}>Wiggle</Text>
            <Text style={styles.statValue}>{task.wiggleRoom}d</Text>
          </View>
          <View style={styles.statUnit}>
            <Text style={styles.statLabel}>Passed</Text>
            <Text style={styles.statValue}>{timePassedStr}</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.editButton} onPress={() => onEdit(task)}>
            <Text style={styles.btnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.completeButton} onPress={() => onComplete(task.id)}>
            <Text style={styles.btnTextComplete}>Complete Task</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#222',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333'
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold'
  },
  body: {
    padding: 16
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20
  },
  statUnit: {
    alignItems: 'center',
    flex: 1
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
    textTransform: 'uppercase'
  },
  statValue: {
    fontSize: 16,
    color: '#ccc',
    fontWeight: '600'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#333',
    alignItems: 'center'
  },
  completeButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8a6aff',
    alignItems: 'center'
  },
  btnText: {
    color: '#fff',
    fontWeight: '600'
  },
  btnTextComplete: {
    color: '#fff',
    fontWeight: 'bold'
  }
});
