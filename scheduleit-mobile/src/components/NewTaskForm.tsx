import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ScrollView, Modal, KeyboardAvoidingView, Platform 
} from 'react-native';

export default function NewTaskForm({ visible, onClose, onSave, onDelete, task = null, initialDueDate = '' }) {
  const [name, setName] = useState(task?.name || '');
  const [frequencyInterval, setFrequencyInterval] = useState(
    task ? (task.interval_days % 7 === 0 ? String(task.interval_days / 7) : String(task.interval_days)) : '1'
  );
  const [frequencyUnit, setFrequencyUnit] = useState(
    task ? (task.interval_days % 7 === 0 ? 'weeks' : 'days') : 'days'
  );
  const [wiggleRoom, setWiggleRoom] = useState(task?.wiggle_room !== undefined ? String(task.wiggle_room) : '0');
  const [wiggleType, setWiggleType] = useState(task?.wiggle_type || 'symmetric');
  
  const getInitialDueDate = () => {
    if (task) {
      const completedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at);
      const dueDate = new Date(completedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
      return dueDate.toISOString().split('T')[0];
    }
    return initialDueDate ? initialDueDate.split('T')[0] : '';
  };
  
  const [nextDueDate, setNextDueDate] = useState(getInitialDueDate());
  const [color, setColor] = useState(task?.color || '#a48cff');
  const [error, setError] = useState('');

  const colors = [
    { name: 'Purple', val: '#a48cff' },
    { name: 'Green', val: '#85dcb2' },
    { name: 'Pink', val: '#ff9ece' },
    { name: 'Blue', val: '#7fbef5' },
    { name: 'Orange', val: '#ffb37c' },
    { name: 'Peach', val: '#ffc5b3' },
  ];

  const handleSave = () => {
    setError('');
    if (!name || !nextDueDate) {
      setError('Name and Next Due Date are required.');
      return;
    }

    if (!/^[\x20-\x7E]*$/.test(name) || name.length > 100) {
      setError('Task name must be invalid or too long.');
      return;
    }

    let intervalDays = parseInt(frequencyInterval, 10) || 1;
    if (frequencyUnit === 'weeks') intervalDays *= 7;

    if (intervalDays > 1825) {
      setError('Task interval cannot exceed 5 years.');
      return;
    }

    const wiggle = parseInt(wiggleRoom, 10) || 0;
    if (wiggle > 7) {
      setError('Wiggle room cannot exceed 7 days.');
      return;
    }

    // Basic date parsing (YYYY-MM-DD)
    const parts = nextDueDate.split('-');
    if (parts.length !== 3) {
      setError('Date must be YYYY-MM-DD.');
      return;
    }
    
    const [year, month, day] = parts.map(Number);
    const targetDate = new Date(year, month - 1, day);
    const completedAt = new Date(targetDate.getTime() - intervalDays * 24 * 60 * 60 * 1000);

    onSave({
      ...(task || {}),
      name,
      interval_days: intervalDays,
      wiggle_room: wiggle,
      wiggle_type: wiggleType,
      completed_at: completedAt.toISOString(),
      color
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerText}>{task ? 'Edit Task' : 'New Task'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name:</Text>
              <TextInput 
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Wash sheets"
                placeholderTextColor="#666"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frequency (Every):</Text>
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, styles.numberInput]}
                  value={frequencyInterval}
                  onChangeText={setFrequencyInterval}
                  keyboardType="numeric"
                />
                <View style={styles.toggleGroup}>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, frequencyUnit === 'days' && styles.toggleActive]}
                    onPress={() => setFrequencyUnit('days')}
                  >
                    <Text style={styles.toggleText}>Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, frequencyUnit === 'weeks' && styles.toggleActive]}
                    onPress={() => setFrequencyUnit('weeks')}
                  >
                    <Text style={styles.toggleText}>Weeks</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Wiggle Room:</Text>
              <View style={styles.row}>
                <TextInput 
                  style={[styles.input, styles.numberInput]}
                  value={wiggleRoom}
                  onChangeText={setWiggleRoom}
                  keyboardType="numeric"
                />
                <View style={styles.toggleGroup}>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, wiggleType === 'symmetric' && styles.toggleActive]}
                    onPress={() => setWiggleType('symmetric')}
                  >
                    <Text style={styles.toggleText}>±</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, wiggleType === 'late-only' && styles.toggleActive]}
                    onPress={() => setWiggleType('late-only')}
                  >
                    <Text style={styles.toggleText}>+ Only</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Next Due Date (YYYY-MM-DD):</Text>
              <TextInput 
                style={styles.input}
                value={nextDueDate}
                onChangeText={setNextDueDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#666"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Color Theme:</Text>
              <View style={styles.colorRow}>
                {colors.map(c => (
                  <TouchableOpacity 
                    key={c.name}
                    style={[styles.colorSwatch, { backgroundColor: c.val }, color === c.val && styles.colorSwatchActive]}
                    onPress={() => setColor(c.val)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.actionRow}>
              {task && (
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(task.id)}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: color }]} onPress={handleSave}>
                <Text style={styles.saveBtnText}>{task ? 'Update Task' : 'SoftSchedule!'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '85%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  closeBtn: {
    padding: 8
  },
  closeBtnText: {
    color: '#888',
    fontSize: 20,
    fontWeight: 'bold'
  },
  errorText: {
    color: '#ff6b6b',
    backgroundColor: 'rgba(255,107,107,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  inputGroup: {
    marginBottom: 20
  },
  label: {
    color: '#aaa',
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600'
  },
  input: {
    backgroundColor: '#333',
    color: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#444'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  numberInput: {
    flex: 1
  },
  toggleGroup: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#333',
    borderRadius: 8,
    overflow: 'hidden'
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12
  },
  toggleActive: {
    backgroundColor: '#555'
  },
  toggleText: {
    color: '#fff',
    fontWeight: '500'
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    opacity: 0.5
  },
  colorSwatchActive: {
    opacity: 1,
    borderWidth: 3,
    borderColor: '#fff'
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 40,
    gap: 12
  },
  deleteBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 60, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.3)'
  },
  deleteBtnText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
    fontSize: 16
  },
  saveBtn: {
    flex: 2,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  saveBtnText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 16
  }
});
