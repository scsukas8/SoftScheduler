import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, 
  StyleSheet, ScrollView, Modal, KeyboardAvoidingView, Platform 
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

interface NewTaskFormProps {
  visible: boolean;
  onClose: () => void;
  onSave: (taskData: any) => void;
  onDelete: (task: any) => void;
  task?: any;
  initialDueDate?: string;
}

export default function NewTaskForm({ 
  visible, 
  onClose, 
  onSave, 
  onDelete, 
  task = null, 
  initialDueDate = '' 
}: NewTaskFormProps) {
  const [inputMode, setInputMode] = useState<'center' | 'range'>(
    task?.wiggle_type === 'range' ? 'range' : 'center'
  );
  const [name, setName] = useState(task?.name || '');
  
  // Center Mode States
  const [targetInterval, setTargetInterval] = useState(
    task ? String(task.interval_days) : '7'
  );
  const [wiggleRoom, setWiggleRoom] = useState(
    task?.wiggle_room !== undefined ? String(task.wiggle_room) : '2'
  );
  
  // Range Mode States
  const [rangeMin, setRangeMin] = useState(
    task ? String(task.interval_days - (task.wiggle_room || 0)) : '5'
  );
  const [rangeMax, setRangeMax] = useState(
    task ? String(task.interval_days + (task.wiggle_room || 0)) : '9'
  );

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

  // Keep modes in sync
  const handleCenterChange = (target: string, wiggle: string) => {
    setTargetInterval(target);
    setWiggleRoom(wiggle);
    const t = parseInt(target, 10) || 0;
    const w = parseInt(wiggle, 10) || 0;
    setRangeMin(String(t - w));
    setRangeMax(String(t + w));
  };

  const handleRangeChange = (min: string, max: string) => {
    setRangeMin(min);
    setRangeMax(max);
    const mi = parseInt(min, 10) || 0;
    const ma = parseInt(max, 10) || 0;
    const center = Math.floor((mi + ma) / 2);
    const wiggle = Math.ceil((ma - mi) / 2);
    setTargetInterval(String(center));
    setWiggleRoom(String(wiggle));
  };

  const handleSave = () => {
    setError('');
    if (!name) {
      setError('Name is required.');
      return;
    }

    const intervalDays = parseInt(targetInterval, 10) || 1;
    const wiggle = parseInt(wiggleRoom, 10) || 0;
    const completedAt = new Date(date.getTime() - intervalDays * 24 * 60 * 60 * 1000);

    onSave({
      ...(task || {}),
      name,
      interval_days: intervalDays,
      wiggle_room: wiggle,
      wiggle_type: inputMode === 'range' ? 'range' : wiggleType,
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
    placeholderTextColor: '#666',
    keyboardType: 'numeric'
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.headerText}>{task ? 'Edit Task' : 'New Task'}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name:</Text>
              <TextInput 
                {...commonInputProps}
                keyboardType="default"
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Change bed sheets"
                maxLength={100}
              />
            </View>
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Frequency:</Text>
                <View style={styles.miniToggle}>
                  <TouchableOpacity 
                    onPress={() => setInputMode('center')}
                    style={[styles.miniBtn, inputMode === 'center' && styles.miniActive]}
                  >
                    <Text style={[styles.miniText, inputMode === 'center' && styles.miniTextActive]}>~ Approx</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setInputMode('range')}
                    style={[styles.miniBtn, inputMode === 'range' && styles.miniActive]}
                  >
                    <Text style={[styles.miniText, inputMode === 'range' && styles.miniTextActive]}>Range</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {inputMode === 'center' ? (
                <View style={styles.sentenceContainer}>
                  <Text style={styles.sentenceText}>Do this every</Text>
                  <View style={styles.inlineInputContainer}>
                    <TextInput 
                      {...commonInputProps}
                      style={styles.inlineInput}
                      value={targetInterval}
                      onChangeText={(v) => handleCenterChange(v, wiggleRoom)}
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.sentenceText}>days ±</Text>
                  <View style={styles.inlineInputContainer}>
                    <TextInput 
                      {...commonInputProps}
                      style={styles.inlineInput}
                      value={wiggleRoom}
                      onChangeText={(v) => handleCenterChange(targetInterval, v)}
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.sentenceText}>days.</Text>
                </View>
              ) : (
                <View style={styles.sentenceContainer}>
                  <Text style={styles.sentenceText}>Do this every</Text>
                  <View style={styles.inlineInputContainer}>
                    <TextInput 
                      {...commonInputProps}
                      style={styles.inlineInput}
                      value={rangeMin}
                      onChangeText={(v) => handleRangeChange(v, rangeMax)}
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.sentenceText}>to</Text>
                  <View style={styles.inlineInputContainer}>
                    <TextInput 
                      {...commonInputProps}
                      style={styles.inlineInput}
                      value={rangeMax}
                      onChangeText={(v) => handleRangeChange(rangeMin, v)}
                      selectTextOnFocus
                    />
                  </View>
                  <Text style={styles.sentenceText}>days.</Text>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Next date:</Text>
              <View style={styles.dateRow}>
                {inputMode === 'center' ? (
                  <View style={styles.dateContainer}>
                    <TouchableOpacity 
                      style={[styles.datePickerBtn, {flex: 1}]} 
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={20} color="#a48cff" style={{marginRight: 8}} />
                      <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <View style={styles.wiggleBadge}>
                      <Text style={styles.wiggleBadgeText}>± {wiggleRoom || 0}d</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.dateRangeContainer}>
                    <TouchableOpacity 
                      style={[styles.datePickerBtn, {flex: 1}]} 
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#a48cff" style={{marginRight: 6}} />
                      <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    <Text style={styles.rangeDivider}>to</Text>
                    <View style={[styles.datePickerBtn, styles.disabledDate, {flex: 1}]}>
                      <Ionicons name="calendar-outline" size={18} color="rgba(164, 140, 255, 0.4)" style={{marginRight: 6}} />
                      <Text style={styles.dateText}>
                        {new Date(date.getTime() + (parseInt(rangeMax, 10) - parseInt(rangeMin, 10)) * 24 * 60 * 60 * 1000).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
              
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  subLabel: {
    color: '#666',
    fontSize: 12,
    marginBottom: 6,
    fontWeight: '600'
  },
  miniToggle: {
    flexDirection: 'row',
    backgroundColor: '#262626',
    borderRadius: 8,
    padding: 2,
  },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  miniActive: {
    backgroundColor: '#404040',
  },
  miniText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '700',
  },
  miniTextActive: {
    color: '#fff',
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
  dateRow: {
    marginTop: 4,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  disabledDate: {
    opacity: 0.6,
    backgroundColor: '#1a1a1a',
  },
  dateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  rangeDivider: {
    color: '#666',
    fontSize: 14,
    fontWeight: '700',
  },
  wiggleBadge: {
    backgroundColor: 'rgba(164, 140, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(164, 140, 255, 0.3)',
  },
  wiggleBadgeText: {
    color: '#a48cff',
    fontSize: 14,
    fontWeight: '700',
  },
  inputWithUnit: {
    position: 'relative',
    justifyContent: 'center',
  },
  unitText: {
    position: 'absolute',
    right: 16,
    color: '#666',
    fontSize: 14,
    fontWeight: '700',
  },
  sentenceContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    backgroundColor: '#262626',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    minHeight: 80,
  },
  sentenceText: {
    color: '#ccc',
    fontSize: 16,
    lineHeight: 24,
  },
  inlineInputContainer: {
    borderBottomWidth: 2,
    borderBottomColor: '#a48cff',
    marginHorizontal: 8,
    minWidth: 40,
    alignItems: 'center',
  },
  inlineInput: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 2,
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
