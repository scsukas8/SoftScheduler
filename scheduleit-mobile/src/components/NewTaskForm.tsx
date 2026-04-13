import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ScrollView, Modal, KeyboardAvoidingView, Platform 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

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
  const [color, setColor] = useState(task?.color || '#a48cff');
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Helper to get initial date object from various inputs
  const getInitialDate = () => {
    if (task) {
      const completedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at);
      return new Date(completedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
    }
    if (initialDueDate) {
       // Handle both YYYY-MM-DD and full ISO strings
       const datePart = initialDueDate.split('T')[0];
       const [y, m, d] = datePart.split('-').map(Number);
       if (!isNaN(y)) return new Date(y, m - 1, d);
    }
    return new Date();
  };

  const [date, setDate] = useState(getInitialDate());

  const colors = [
    { name: 'Purple', val: '#a48cff' },
    { name: 'Green', val: '#85dcb2' },
    { name: 'Pink', val: '#ff9ece' },
    { name: 'Blue', val: '#7fbef5' },
    { name: 'Orange', val: '#ffb37c' },
    { name: 'Peach', val: '#ffc5b3' },
  ];

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || date;
    setShowDatePicker(Platform.OS === 'ios');
    setDate(currentDate);
  };

  const handleSave = () => {
    setError('');
    if (!name) {
      setError('Name is required.');
      return;
    }

    let intervalDays = parseInt(frequencyInterval, 10) || 1;
    if (frequencyUnit === 'weeks') intervalDays *= 7;

    const wiggle = parseInt(wiggleRoom, 10) || 0;
    const completedAt = new Date(date.getTime() - intervalDays * 24 * 60 * 60 * 1000);

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

  const commonInputProps: any = {
    autoCorrect: false,
    autoCapitalize: 'none',
    autoComplete: 'off',
    textContentType: 'none',
    importantForAutofill: 'no',
    spellCheck: false,
    placeholderTextColor: '#666'
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose} statusBarTranslucent>
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
                {...commonInputProps}
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Wash sheets"
                maxLength={100}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Frequency (Every):</Text>
              <View style={styles.row}>
                <TextInput 
                  {...commonInputProps}
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
                  {...commonInputProps}
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
              <Text style={styles.label}>Next Due Date:</Text>
              <TouchableOpacity 
                style={styles.input} 
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={{ color: '#fff', fontSize: 16 }}>{date.toLocaleDateString()}</Text>
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  themeVariant="dark"
                />
              )}
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
                <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(task)}>
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
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: '#1E1E1E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24
  },
  headerText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff'
  },
  closeBtn: {
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20
  },
  closeBtnText: {
    color: '#888',
    fontSize: 18,
    fontWeight: 'bold'
  },
  errorText: {
    color: '#ff6b6b',
    backgroundColor: 'rgba(255,107,107,0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 22
  },
  label: {
    color: '#888',
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#262626',
    color: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333'
  },
  row: {
    flexDirection: 'row',
    gap: 12
  },
  numberInput: {
    flex: 1
  },
  toggleGroup: {
    flex: 1.5,
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#333'
  },
  toggleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14
  },
  toggleActive: {
    backgroundColor: '#404040'
  },
  toggleText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  colorSwatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    opacity: 0.4
  },
  colorSwatchActive: {
    opacity: 1,
    borderWidth: 3,
    borderColor: '#fff'
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 60,
    gap: 16
  },
  deleteBtn: {
    flex: 1,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 60, 60, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.2)'
  },
  deleteBtnText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
    fontSize: 16
  },
  saveBtn: {
    flex: 2,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#000',
    fontWeight: '900',
    fontSize: 18
  }
});
