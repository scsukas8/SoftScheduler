import { 
  collection, 
  onSnapshot, 
  query, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * Subscribe to a user's tasks in real-time.
 * @param {string} uid User ID
 * @param {function} callback On data change
 */
export const subscribeTasks = (uid, callback) => {
  const q = query(collection(db, "users", uid, "tasks"));
  
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);
  }, (error) => {
    console.error("Firestore Subscribe Error:", error);
  });
};

/**
 * Add a new task for a user.
 * @param {string} uid User ID
 * @param {object} task Task details
 */
export const addTask = async (uid, task) => {
  try {
    const { id, ...taskData } = task; // Strip local ID if exists
    await addDoc(collection(db, "users", uid, "tasks"), {
      ...taskData,
      created_at: serverTimestamp()
    });
  } catch (error) {
    console.error("Firestore Add Task Error:", error);
    throw error;
  }
};

/**
 * Update an existing task.
 * @param {string} uid User ID
 * @param {string} taskId Task ID
 * @param {object} taskData Updated fields
 */
export const updateTask = async (uid, taskId, taskData) => {
  try {
    const taskRef = doc(db, "users", uid, "tasks", taskId);
    await updateDoc(taskRef, taskData);
  } catch (error) {
    console.error("Firestore Update Task Error:", error);
    throw error;
  }
};

/**
 * Delete a task.
 * @param {string} uid User ID
 * @param {string} taskId Task ID
 */
export const deleteTask = async (uid, taskId) => {
  try {
    const taskRef = doc(db, "users", uid, "tasks", taskId);
    await deleteDoc(taskRef);
  } catch (error) {
    console.error("Firestore Delete Task Error:", error);
    throw error;
  }
};
