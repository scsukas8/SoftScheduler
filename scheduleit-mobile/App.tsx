import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, ActivityIndicator, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// Firebase & Core Logic (Shared Workspace Module)
import { subscribeTasks } from '@scheduleit/core';
import { auth, googleProvider } from './src/firebase';
import { onAuthStateChanged, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

// Native Google Sign In
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// Real Components
import ScheduleScreen from './src/components/ScheduleView';
import CalendarScreen from './src/components/CalendarScreen';
import NewTaskForm from './src/components/NewTaskForm';
import { addTask, updateTask, deleteTask } from '@scheduleit/core';

const Tab = createBottomTabNavigator();



export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [editingTask, setEditingTask] = useState(null); // { task, dayId? }

  useEffect(() => {
    console.log("App mounted, configuring Google Sign-In...");
    GoogleSignin.configure({
      webClientId: '1073857724039-m5pmn570j6l7l4vokiaov83pj3c3t6qd.apps.googleusercontent.com',
    });

     const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log("Auth state changed:", currentUser ? `Logged in as ${currentUser.uid}` : "Logged out");
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
    
    console.log("Subscribing to tasks for UID:", user.uid);
    const unsubscribeTasks = subscribeTasks(user.uid, (taskList) => {
      console.log(`Received ${taskList.length} tasks from Firestore`);
      setTasks(taskList);
    });

    return () => unsubscribeTasks();
  }, [user]);

  const handleNativeGoogleSignIn = async () => {
    try {
      console.log("Starting Native Google Sign-In...");
      setLoading(true);
      
      // 1. Trigger native Google Sign-In prompt
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      
      // Support for newer library versions where response is wrapped in 'data'
      const idToken = response.data?.idToken || response.idToken;
      
      if (!idToken) throw new Error("No ID token returned.");
      console.log("Google token received, signing into Firebase...");

      // 2. Create a Firebase credential with the ID token
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // 3. Sign in to Firebase with the credential
      await signInWithCredential(auth, googleCredential);

    } catch (error) {
      console.error("Google Signin Error:", error);
      setLoading(false); // only reset on fail, success unmounts this view
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const now = new Date();
      await updateTask(user.uid, taskId, { completed_at: now });
    } catch (err) {
      console.error("Complete task error:", err);
    }
  };

  const handleSaveTask = async (taskData) => {
    try {
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

  if (loading) {
     return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#a48cff" />
        <Text style={{color: '#fff', marginTop: 10}}>Loading your schedule...</Text>
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

  // React Navigation bounds our components in SafeAreas implicitly within the Native OS boundaries
   return (
    <SafeAreaView style={styles.safeArea}>
      <NavigationContainer>
        <Tab.Navigator 
          screenOptions={{ 
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarActiveTintColor: '#a48cff',
            tabBarInactiveTintColor: '#888'
          }}
        >
          <Tab.Screen 
            name="Schedule" 
            children={() => (
              <ScheduleScreen 
                tasks={tasks} 
                onCompleteTask={handleCompleteTask}
                onEditTask={(task) => setEditingTask({ task })}
              />
            )} 
          />
          <Tab.Screen 
            name="Calendar" 
            children={() => (
              <CalendarScreen 
                tasks={tasks} 
                onCompleteTask={handleCompleteTask}
                onEditTask={(task, dayId) => setEditingTask({ task, dayId })}
              />
            )} 
          />
        </Tab.Navigator>
      </NavigationContainer>

      {editingTask && (
        <NewTaskForm 
          task={editingTask.task}
          initialDate={editingTask.dayId}
          onSave={handleSaveTask}
          onClose={() => setEditingTask(null)}
          onDelete={async () => {
             if (editingTask.task?.id) {
               await deleteTask(user.uid, editingTask.task.id);
             }
             setEditingTask(null);
          }}
        />
      )}
      <StatusBar style="auto" />
    </SafeAreaView>
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
  }
});
