
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { BookProject, User } from "../types";

/**
 * Syncs user profile to Firestore
 */
export const syncUserProfile = async (uid: string, userData: Partial<User>) => {
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { ...userData, updatedAt: Date.now() }, { merge: true });
};

/**
 * Fetches user profile from Firestore
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() as User : null;
};

/**
 * Uploads a Base64 image to Firebase Storage and returns the URL
 */
export const uploadImageToCloud = async (path: string, base64Data: string): Promise<string> => {
  const storageRef = ref(storage, path);
  // Remove data:image/png;base64, prefix if present
  const cleanData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  await uploadString(storageRef, cleanData, 'base64');
  return await getDownloadURL(storageRef);
};

/**
 * Saves or updates a project in Firestore
 */
export const saveProjectToCloud = async (uid: string, project: BookProject) => {
  const projectRef = doc(db, "projects", project.id);
  await setDoc(projectRef, { ...project, ownerId: uid, updatedAt: Date.now() }, { merge: true });
};

/**
 * Loads all projects for a specific user
 */
export const loadUserProjects = async (uid: string): Promise<BookProject[]> => {
  const q = query(collection(db, "projects"), where("ownerId", "==", uid));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as BookProject);
};

/**
 * Deletes a project from Firestore
 */
export const deleteProjectFromCloud = async (projectId: string) => {
  await deleteDoc(doc(db, "projects", projectId));
};
