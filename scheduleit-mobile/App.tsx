import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, Platform, Animated as RNAnimated, Dimensions, Modal, Switch, useColorScheme, Appearance } from 'react-native';
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

// Notification Services
import { registerForPushNotificationsAsync, scheduleMorningBriefing } from './src/services/notificationService';

const Tab = createBottomTabNavigator();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<{ task: any; dayId?: string } | null>(null);
  
  // Undo Logic
  const [undoItem, setUndoItem] = useState<{ task: any, timeoutId: any, action?: string } | null>(null);
  const undoAnim = useRef(new RNAnimated.Value(0)).current;

  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: '1073857724039-m5pmn570j6l7l4vokiaov83pj3c3t6qd.apps.googleusercontent.com',
      });
    } catch (e) {
      console.error("GoogleSignin.configure failed:", e);
    }

    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('theme_pref');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          Appearance.setColorScheme(savedTheme);
        }
      } catch (e) {}
    };
    loadTheme();

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
    const unsubscribeTasks = subscribeTasks(user.uid, (taskList: any[]) => {
      setTasks(taskList);
    });
    return () => unsubscribeTasks();
  }, [user]);

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
    const updateBriefing = async () => {
      if (user && tasks.length > 0) {
        try {
          await scheduleMorningBriefing(tasks);
        } catch (e) {
          console.error("Morning briefing schedule crash prevented:", e);
        }
      }
    };
    updateBriefing();
  }, [tasks, user]);

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
      <View style={styles.loginContainer}>
        <Text style={styles.title}>Soft Schedule</Text>
        <Text style={styles.subtitle}>Fluid time management.</Text>
        <TouchableOpacity style={styles.loginButton} onPress={handleNativeGoogleSignIn}>
          <Text style={styles.loginText}>Continue with Google</Text>
        </TouchableOpacity>
        <StatusBar style="light" />
      </View>
    );
  }

  const toggleTheme = async () => {
    const newTheme = isDark ? 'light' : 'dark';
    Appearance.setColorScheme(newTheme);
    try {
      await AsyncStorage.setItem('theme_pref', newTheme);
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

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? '#1E1E1E' : '#f8f9fa' }}>
        <SafeAreaView style={[styles.safeArea, { backgroundColor: isDark ? '#1E1E1E' : '#f8f9fa' }]}>
        
        {/* Top Header Row for Settings */}
        <View style={styles.topHeader}>
          <Text style={[styles.topTitle, { color: isDark ? '#fff' : '#222' }]}>SoftSchedule</Text>
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
            <View style={[styles.settingsContent, { backgroundColor: isDark ? '#2A2A2A' : '#fff' }]}>
              <View style={styles.settingsHeader}>
                <Text style={[styles.settingsTitle, { color: isDark ? '#fff' : '#000' }]}>Settings</Text>
                <TouchableOpacity onPress={() => setIsSettingsVisible(false)}>
                  <Ionicons name="close" size={28} color={isDark ? '#888' : '#555'} />
                </TouchableOpacity>
              </View>

              <View style={styles.settingsRow}>
                <Text style={[styles.settingsLabel, { color: isDark ? '#ccc' : '#333' }]}>Dark Mode</Text>
                <Switch 
                  value={isDark} 
                  onValueChange={toggleTheme} 
                  trackColor={{ false: '#767577', true: '#a48cff' }}
                  thumbColor={isDark ? '#fff' : '#f4f3f4'}
                />
              </View>

              <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
                <Text style={styles.signOutText}>Sign Out</Text>
              </TouchableOpacity>
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
    width: '80%',
    borderRadius: 20,
    padding: 24,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  settingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  settingsLabel: {
    fontSize: 18,
  },
  signOutBtn: {
    backgroundColor: 'rgba(255, 60, 60, 0.1)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 60, 60, 0.3)',
  },
  signOutText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
