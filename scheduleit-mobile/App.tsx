import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { 
  StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, 
  Platform, Animated as RNAnimated, Dimensions, Modal, Switch, 
  useColorScheme, Appearance, Image, ScrollView, Alert 
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

// Firebase & Core Logic (Shared Workspace Module)
import { subscribeTasks, addTask, updateTask, deleteTask, setTask } from '@scheduleit/core';
import { auth } from './src/firebase';
import { onAuthStateChanged, signInWithCredential, GoogleAuthProvider, User } from 'firebase/auth';

// Native Google Sign In
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Real Components
import ScheduleScreen from './src/components/ScheduleView';
import CalendarScreen from './src/components/CalendarScreen';
import NewTaskForm from './src/components/NewTaskForm';
import LoginScreen from './src/components/LoginScreen';
import DateTimePicker from '@react-native-community/datetimepicker';
const DateTimePickerAny = DateTimePicker as any;

// Notification Services
import { registerForPushNotificationsAsync, scheduleAllNotifications, sendTestNotification, sendBriefingTest } from './src/services/notificationService';

const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [briefingEnabled, setBriefingEnabled] = useState(true);
  const [briefingHour, setBriefingHour] = useState(8);
  const [briefingMinute, setBriefingMinute] = useState(0);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<{ task: any; dayId?: string } | null>(null);
  
  // Undo Logic
  const [undoItem, setUndoItem] = useState<{ task: any, timeoutId: any, action?: string } | null>(null);
  const undoAnim = useRef(new RNAnimated.Value(0)).current;

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const colorScheme = useColorScheme();

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: '1073857724039-m5pmn570j6l7l4vokiaov83pj3c3t6qd.apps.googleusercontent.com',
      });
    } catch (e) {
      console.error("GoogleSignin.configure failed:", e);
    }

    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme');
        if (savedTheme) setIsDark(savedTheme === 'dark');
        
        const savedSettings = await AsyncStorage.getItem('notificationSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setBriefingEnabled(parsed.briefingEnabled ?? true);
          setBriefingHour(parsed.briefingHour ?? 8);
          setBriefingMinute(parsed.briefingMinute ?? 0);
        }
      } catch (e) {
        console.error('Error loading settings', e);
      }
    };

    loadSettings();

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      return;
    }
    const unsubscribeTasks = subscribeTasks(user.uid, (newTasks: any[]) => {
      setTasks(newTasks);
      scheduleAllNotifications(newTasks, { briefingEnabled, briefingHour, briefingMinute });
    });
    return () => unsubscribeTasks();
  }, [user, briefingEnabled, briefingHour, briefingMinute]);

  // Notifications Integration
  useEffect(() => {
    const initNotifications = async () => {
      if (user) {
        try {
          await registerForPushNotificationsAsync();
        } catch (e) {
          console.error("Notification registration crash prevented:", e);
        }
      }
    };
    initNotifications();
  }, [user]);



  useEffect(() => {
    if (undoItem) {
      RNAnimated.timing(undoAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    } else {
      RNAnimated.timing(undoAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }).start();
    }
  }, [undoItem]);

  useEffect(() => {
    const saveSettings = async () => {
      try {
        await AsyncStorage.setItem('notificationSettings', JSON.stringify({
          briefingEnabled,
          briefingHour,
          briefingMinute
        }));
      } catch (e) {
        console.error('Error saving settings', e);
      }
    };
    if (user) saveSettings();
  }, [briefingEnabled, briefingHour, briefingMinute, user]);

  const handleNativeGoogleSignIn = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const response: any = await GoogleSignin.signIn();
      const idToken = response.data?.idToken || response.idToken;
      if (!idToken) throw new Error("No ID token returned.");
      const googleCredential = GoogleAuthProvider.credential(idToken);
      await signInWithCredential(auth, googleCredential);
    } catch (error) {
      console.error("Google Signin Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const showUndo = (task: any, action: string = 'completed') => {
    setUndoItem({ task, timeoutId: null, action });
  };

  const handleCompleteTask = async (taskId: string, dayId?: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      // Shallow clone avoids mutating references but preserves pure Firebase Timestamp objects
      // JSON.parse(JSON.stringify()) corrupts Timestamps into POJOs, causing updateDoc to throw silent errors.
      showUndo({ ...task }, 'completed');

      const now = new Date();
      const actionDate = dayId ? new Date(dayId) : now;
      
      const currentCompletedAt = (task.completed_at && typeof task.completed_at.toDate === 'function') 
        ? task.completed_at.toDate() 
        : new Date(task.completed_at || now);
      
      const currentTargetDate = new Date(currentCompletedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
      
      let newCompletedAt = actionDate;
      // If task is already completed for the current interval, push to next
      if (currentTargetDate > now && !dayId) {
        newCompletedAt = new Date(currentCompletedAt.getTime() + task.interval_days * 24 * 60 * 60 * 1000);
      }

      if (!user) return;
      await updateTask(user.uid, taskId, { 
        completed_at: newCompletedAt.toISOString(),
        scheduled_date: null // Clear override upon completion
      });
    } catch (err) {
      console.error("Complete task error:", err);
    }
  };

  const handleScheduleTask = async (taskId: string, chosenDate: string, mode: 'lock' | 'reschedule' = 'lock') => {
    try {
      if (!user) return;
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        showUndo({ ...task }, 'scheduled');

        if (mode === 'reschedule') {
          const interval = task.interval_days || 1;
          const targetDate = new Date(chosenDate);
          const newCompletedAt = new Date(targetDate.getTime() - interval * 24 * 60 * 60 * 1000);
          
          await updateTask(user.uid, taskId, { 
            completed_at: newCompletedAt.toISOString(),
            scheduled_date: null
          });
        } else {
          await updateTask(user.uid, taskId, { 
            scheduled_date: chosenDate
          });
        }
      }
    } catch (err) {
      console.error("Schedule task error:", err);
    }
  };

  const handleUndo = async () => {
    if (!undoItem || !user) return;
    try {
      const { id, ...fullTaskData } = undoItem.task;
      
      // Override the physical document completely with the exact pure state 
      // instead of using a differential update, which guarantees any newly inserted properties 
      // (e.g. scheduled_date) are physically cleared from the database on reversion.
      await setTask(user.uid, id, fullTaskData);
      
      setUndoItem(null);
    } catch (err) {
      console.error("Undo error:", err);
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (!user) return;
      if (editingTask?.task?.id) {
        await updateTask(user.uid, editingTask.task.id, {
          ...taskData,
          scheduled_date: null
        });
      } else {
        await addTask(user.uid, taskData);
      }
      setEditingTask(null);
    } catch (err) {
      console.error("Save task error:", err);
    }
  };

  const handleDeleteTask = async (task: any) => {
    if (!user) return;
    try {
      showUndo({ ...task });
      await deleteTask(user.uid, task.id);
      setEditingTask(null);
    } catch (err) {
      console.error("Delete task error:", err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a48cff" />
      </View>
    );
  }

  if (!user) {
    return (
      <>
        <LoginScreen onLogin={handleNativeGoogleSignIn} />
        <StatusBar style="light" />
      </>
    );
  }

  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    Appearance.setColorScheme(newTheme);
    try {
      await AsyncStorage.setItem('theme', newTheme);
    } catch (e) {}
  };

  const handleSignOut = async () => {
    try {
      await auth.signOut();
      await GoogleSignin.signOut();
      setIsSettingsVisible(false);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    try {
      setLoading(true);
      
      // 1. Try to delete immediately
      const taskPromises = tasks.map(t => deleteTask(user.uid, t.id));
      await Promise.all(taskPromises);
      await user.delete();
      
      await GoogleSignin.signOut();
      setIsSettingsVisible(false);
    } catch (e: any) {
      console.error("Error deleting account:", e);
      
      // 2. If session is too old, re-authenticate and try again
      if (e.code === 'auth/requires-recent-login') {
        try {
          alert("For security, please verify your identity to delete your account.");
          
          // Re-trigger Google Sign-In
          await GoogleSignin.hasPlayServices();
          const response: any = await GoogleSignin.signIn();
          const idToken = response.data?.idToken || response.idToken;
          
          if (idToken) {
            const googleCredential = GoogleAuthProvider.credential(idToken);
            // Re-auth the current user
            const { reauthenticateWithCredential } = await import('firebase/auth');
            await reauthenticateWithCredential(user, googleCredential);
            
            // Try deletion again now that we're re-authed
            await handleDeleteAccount(); 
          }
        } catch (reauthError) {
          console.error("Re-auth failed:", reauthError);
          alert("Verification failed. Please sign out and back in to delete your account.");
        }
      } else {
        alert("Could not delete account. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? '#1E1E1E' : '#f8f9fa' }}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#1E1E1E' : '#f8f9fa' }]}>
        
        {/* Top Header Row for Settings */}
        <View style={styles.topHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Image 
              source={require('./assets/icon.png')} 
              style={{ width: 28, height: 28, marginRight: 8, borderRadius: 6 }} 
            />
            <Text style={[styles.topTitle, { color: isDark ? '#fff' : '#222' }]}>SoftSchedule</Text>
          </View>
          <TouchableOpacity onPress={() => setIsSettingsVisible(true)}>
            <Ionicons name="person-circle-outline" size={32} color={isDark ? '#fff' : '#222'} />
          </TouchableOpacity>
        </View>

        <NavigationContainer>
          <Tab.Navigator 
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: [styles.tabBar, { backgroundColor: isDark ? '#1E1E1E' : '#fff', borderTopColor: isDark ? '#333' : '#ddd' }],
              tabBarActiveTintColor: '#a48cff',
              tabBarInactiveTintColor: '#888',
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: any;
                if (route.name === 'Schedule') {
                  iconName = focused ? 'checkbox' : 'checkbox-outline';
                } else if (route.name === 'Calendar') {
                  iconName = focused ? 'calendar' : 'calendar-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}
          >
            <Tab.Screen 
              name="Schedule" 
              children={() => (
                <ScheduleScreen 
                  tasks={tasks} 
                  isDark={isDark}
                  onCompleteTask={handleCompleteTask}
                  onScheduleTask={handleScheduleTask}
                  onEditTask={(task: any) => setEditingTask({ task })}
                />
              )} 
            />
            <Tab.Screen 
              name="Calendar" 
              children={() => (
                <CalendarScreen 
                  tasks={tasks} 
                  isDark={isDark}
                  onCompleteTask={handleCompleteTask}
                  onScheduleTask={handleScheduleTask}
                  onEditTask={(task: any, dayId?: string) => setEditingTask({ task, dayId })}
                />
              )} 
            />
          </Tab.Navigator>
        </NavigationContainer>

        {!editingTask && (
          <View style={styles.fabContainer}>
            {undoItem && (
              <TouchableOpacity style={styles.undoFab} onPress={handleUndo}>
                <Ionicons name="refresh-outline" size={30} color="#a48cff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={styles.fab} 
              onPress={() => setEditingTask({ task: null })}
            >
              <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>
          </View>
        )}


        {editingTask && (
          <NewTaskForm 
            visible={!!editingTask}
            task={editingTask.task}
            initialDueDate={editingTask.dayId}
            onSave={handleSaveTask}
            onClose={() => setEditingTask(null)}
            onDelete={handleDeleteTask}
          />
        )}

        {/* Settings Modal */}
        <Modal visible={isSettingsVisible} animationType="slide" transparent={true} onRequestClose={() => setIsSettingsVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.settingsContent, { backgroundColor: isDark ? '#1A1A1A' : '#F9F9F9' }]}>
              <View style={styles.settingsHeader}>
                <Text style={[styles.settingsTitle, { color: isDark ? '#fff' : '#000' }]}>Account Center</Text>
                <TouchableOpacity onPress={() => setIsSettingsVisible(false)} style={styles.closeSettingsBtn}>
                  <Ionicons name="close" size={24} color={isDark ? '#888' : '#555'} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Section */}
                <View style={styles.profileCard}>
                  <Image 
                    source={{ uri: user?.photoURL || 'https://via.placeholder.com/100' }} 
                    style={styles.profileImage} 
                  />
                  <View style={styles.profileInfo}>
                    <Text style={[styles.profileName, { color: isDark ? '#fff' : '#000' }]}>{user?.displayName || 'Symmetry User'}</Text>
                    <Text style={styles.profileEmail}>{user?.email}</Text>
                  </View>
                </View>

                <Text style={styles.settingsSectionTitle}>Preferences</Text>
                
                <View style={styles.settingsBox}>
                  <View style={styles.settingsRow}>
                    <View style={styles.settingsLabelGroup}>
                      <Ionicons name="moon-outline" size={20} color="#a48cff" />
                      <Text style={[styles.settingsLabel, { color: isDark ? '#ccc' : '#333' }]}>Dark Mode</Text>
                    </View>
                    <Switch 
                      value={isDark} 
                      onValueChange={toggleTheme} 
                      trackColor={{ false: '#767577', true: '#a48cff' }}
                    />
                  </View>

                  <View style={[styles.divider, { backgroundColor: isDark ? '#333' : '#eee' }]} />

                  <View style={styles.settingsRow}>
                    <View style={styles.settingsLabelGroup}>
                      <Ionicons name="notifications-outline" size={20} color="#a48cff" />
                      <Text style={[styles.settingsLabel, { color: isDark ? '#ccc' : '#333' }]}>Morning Briefing</Text>
                    </View>
                    <Switch 
                      value={briefingEnabled} 
                      onValueChange={setBriefingEnabled}
                      trackColor={{ false: "#767577", true: "#a48cff" }}
                    />
                  </View>

                  {briefingEnabled && (
                    <TouchableOpacity 
                      style={styles.settingsActionRow} 
                      onPress={() => setShowTimePicker(true)}
                    >
                      <Text style={styles.settingsActionLabel}>Briefing Time</Text>
                      <View style={styles.timeBadge}>
                        <Text style={styles.timeValue}>
                          {briefingHour.toString().padStart(2, '0')}:{briefingMinute.toString().padStart(2, '0')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                <View style={styles.settingsBox}>
                  <TouchableOpacity style={styles.settingsRow} onPress={handleSignOut}>
                    <View style={styles.settingsLabelGroup}>
                      <Ionicons name="log-out-outline" size={20} color="#a48cff" />
                      <Text style={[styles.settingsLabel, { color: isDark ? '#ccc' : '#333' }]}>Sign Out</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <Text style={styles.settingsSectionTitle}>Danger Zone</Text>
                <View style={[styles.settingsBox, { borderColor: 'rgba(255, 107, 107, 0.2)', borderWidth: 1 }]}>
                  <TouchableOpacity style={styles.settingsRow} onPress={() => {
                    if (Platform.OS === 'web') {
                      if (confirm("Delete your account? This will wipe all your tasks forever. For security, you may need to sign in one last time.")) {
                        handleDeleteAccount();
                      }
                    } else {
                      Alert.alert(
                        "Delete Account Forever?",
                        "This will permanently remove all of your tasks and data. For security, you'll be asked to sign in one last time to verify your identity.",
                        [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete Forever", style: "destructive", onPress: handleDeleteAccount }
                        ]
                      );
                    }
                  }}>
                    <View style={styles.settingsLabelGroup}>
                      <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                      <Text style={[styles.settingsLabel, { color: '#ff6b6b' }]}>Delete Account</Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.settingsFooter}>
                  <Text style={styles.footerBrand}>SoftSchedule by Symmetry Studio</Text>
                  <Text style={styles.footerVersion}>Version 1.0.0 (Production)</Text>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

        <StatusBar style={isDark ? "light" : "dark"} />
      </SafeAreaView>
    </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#1E1E1E',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
  },
  loginContainer: {
    flex: 1,
    padding: 30,
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#888',
    marginBottom: 60,
  },
  loginButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  loginText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  tabBar: {
    backgroundColor: '#1E1E1E',
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    height: Platform.OS === 'ios' ? 80 : 60,
  },
  fabContainer: {
    position: 'absolute',
    right: 30,
    bottom: 110,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  fab: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: '#a48cff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  undoFab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#a48cff',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
  },
  fabIcon: {
    fontSize: 36,
    color: '#000',
    fontWeight: '400',
    marginTop: -2
  },
  undoActionText: {
    color: '#a48cff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
    paddingBottom: 10
  },
  topTitle: {
    fontSize: 20,
    fontWeight: '800'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 30,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  closeSettingsBtn: {
    padding: 4,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(164, 140, 255, 0.1)',
    padding: 16,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(164, 140, 255, 0.2)',
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  settingsSectionTitle: {
    color: '#666',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsBox: {
    backgroundColor: 'rgba(164, 140, 255, 0.05)',
    borderRadius: 20,
    padding: 8,
    marginBottom: 24,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  settingsLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
  },
  settingsActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginTop: -4,
  },
  settingsActionLabel: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  timeBadge: {
    backgroundColor: 'rgba(164, 140, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeValue: {
    color: '#a48cff',
    fontWeight: '700',
    fontSize: 14,
  },
  settingsFooter: {
    alignItems: 'center',
    marginTop: 10,
    paddingBottom: 20,
  },
  footerBrand: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
  },
  footerVersion: {
    color: '#444',
    fontSize: 10,
    marginTop: 4,
  }
});
