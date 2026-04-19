import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface ScheduleModalProps {
  visible: boolean;
  task: any;
  mode: 'lock' | 'reschedule';
  onClose: () => void;
  onSchedule: (id: string, date: string, mode: 'lock' | 'reschedule') => void;
}

export default function ScheduleModal({ visible, task, mode, onClose, onSchedule }: ScheduleModalProps) {
  const isDark = useColorScheme() === 'dark';
  const isReschedule = mode === 'reschedule';
  
  const [selectedDate, setSelectedDate] = useState(new Date(Date.now() + 86400000));
  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');

  if (!task) return null;

  const handleSubmit = () => {
    onSchedule(task.id, selectedDate.toISOString(), mode);
    onClose();
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (date) setSelectedDate(date);
  };

  const taskColor = task.color || '#a48cff';

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: isDark ? '#2A2A2A' : '#fff' }]}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: isDark ? '#fff' : '#000' }]}>
              {isReschedule ? 'Reschedule Window' : 'Schedule Task'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={28} color={isDark ? '#888' : '#555'} />
            </TouchableOpacity>
          </View>

          <View style={[styles.taskPreview, { backgroundColor: isDark ? '#1a1a1a' : '#f8f9fa' }]}>
            <View style={[styles.indicator, { backgroundColor: taskColor }]} />
            <View style={styles.taskInfo}>
              <Text style={[styles.taskName, { color: isDark ? '#fff' : '#000' }]} numberOfLines={1}>
                {task.name}
              </Text>
              <Text style={styles.taskDesc}>
                {isReschedule ? 'Shift the entire target window.' : 'Lock to a specific firm date.'}
              </Text>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: isDark ? '#ccc' : '#333' }]}>
              {isReschedule ? 'New Target Date (shifts window):' : 'Lock Date (wiggle = 0):'}
            </Text>
            
            {Platform.OS === 'android' && (
              <TouchableOpacity
                style={[styles.dateButton, { borderColor: isDark ? '#444' : '#ddd' }]}
                onPress={() => setShowPicker(true)}
              >
                <Text style={{ color: isDark ? '#fff' : '#000', fontSize: 16 }}>
                  {selectedDate.toLocaleDateString()}
                </Text>
                <Ionicons name="calendar-outline" size={20} color={isDark ? '#aaa' : '#666'} />
              </TouchableOpacity>
            )}

            {showPicker && (
              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                themeVariant={isDark ? 'dark' : 'light'}
                onChange={handleDateChange}
                style={Platform.OS === 'ios' ? styles.iosPicker : undefined}
              />
            )}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.submitBtn, { backgroundColor: taskColor }]} 
              onPress={handleSubmit}
            >
              <Text style={styles.submitText}>{isReschedule ? 'Reschedule' : 'Schedule'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  content: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  taskPreview: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  indicator: {
    width: 6,
    height: '100%',
    borderRadius: 3,
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  taskDesc: {
    fontSize: 14,
    color: '#888',
  },
  formGroup: {
    marginBottom: 30,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    padding: 14,
    borderRadius: 10,
  },
  iosPicker: {
    alignSelf: 'center',
    width: '100%',
    height: 150,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#666',
    alignItems: 'center',
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
