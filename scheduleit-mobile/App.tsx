import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform, Animated as RNAnimated } from 'react-native';
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

// Real Components
import ScheduleScreen from './src/components/ScheduleView';
import CalendarScreen from './src/components/CalendarScreen';
import NewTaskForm from './src/components/NewTaskForm';

const Tab = createBottomTabNavigator();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<{ task: any; dayId?: string } | null>(null);
  
  // Undo Logic
  const [undoItem, setUndoItem] = useState<{task: any, timeoutId: any} | null>(null);
  const undoAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '1073857724039-m5pmn570j6l7l4vokiaov83pj3c3t6qd.apps.googleusercontent.com',
    });

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
    const unsubscribeTasks = subscribeTasks(user.uid, (taskList) => {
      setTasks(taskList);
    });
    return () => unsubscribeTasks();
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
      setLoading(false);
    }
  };

  const showUndo = (task: any) => {
    if (undoItem?.timeoutId) clearTimeout(undoItem.timeoutId);
    
    const timeoutId = setTimeout(() => {
      setUndoItem(null);
    }, 5000);
    
    setUndoItem({ task, timeoutId });
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task || !user) return;
      
      const originalTask = JSON.parse(JSON.stringify(task));
      showUndo(originalTask);

      const now = new Date();
      await updateTask(user.uid, taskId, { completed_at: now.toISOString() });
    } catch (err) {
      console.error("Complete task error:", err);
    }
  };

  const handleUndo = async () => {
    if (!undoItem || !user) return;
    try {
      await setTask(user.uid, undoItem.task.id, undoItem.task);
      setUndoItem(null);
    } catch (err) {
      console.error("Undo error:", err);
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (!user) return;
      if (editingTask?.task?.id) {
        await updateTask(user.uid, editingTask.task.id, taskData);
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
      const originalTask = JSON.parse(JSON.stringify(task));
      showUndo(originalTask);
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

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safeArea}>
        <NavigationContainer>
          <Tab.Navigator 
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarStyle: styles.tabBar,
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
                  onEditTask={(task: any, dayId: string) => setEditingTask({ task, dayId })}
                />
              )} 
            />
          </Tab.Navigator>
        </NavigationContainer>

        {!editingTask && (
          <TouchableOpacity 
            style={styles.fab} 
            onPress={() => setEditingTask({ task: null })}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        )}

        {undoItem && (
          <RNAnimated.View style={[styles.undoToast, { 
            transform: [{ translateY: undoAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [100, 0]
            }) }]
          }]}>
            <Text style={styles.undoText}>Task {undoItem.task.name} removed</Text>
            <TouchableOpacity onPress={handleUndo}>
              <Text style={styles.undoActionText}>UNDO</Text>
            </TouchableOpacity>
          </RNAnimated.View>
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
        <StatusBar style="auto" />
      </SafeAreaView>
    </GestureHandlerRootView>
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
  fab: {
    position: 'absolute',
    right: 30,
    bottom: 110,
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
  fabIcon: {
    fontSize: 36,
    color: '#000',
    fontWeight: '400',
    marginTop: -2
  },
  undoToast: {
    position: 'absolute',
    bottom: 110,
    left: 20,
    right: 100,
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  undoText: {
    color: '#fff',
    fontSize: 14,
    flex: 1
  },
  undoActionText: {
    color: '#a48cff',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 10
  }
});
