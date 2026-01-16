
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, writeBatch } from "firebase/firestore";
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
 * Fetches user profile from Firestore by UID
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() as User : null;
};

/**
 * 查询指定账号是否存在
 */
export const findUserProfileByAccount = async (account: string): Promise<{ uid: string, data: User } | null> => {
  const q = query(collection(db, "users"), where("username", "==", account));
  const snap = await getDocs(q);
  if (!snap.empty) {
    return { 
      uid: snap.docs[0].id, 
      data: snap.docs[0].data() as User 
    };
  }
  return null;
};

/**
 * Uploads a Base64 image to Firebase Storage with optimized user/project path
 * Structure: /users/{userId}/projects/{projectId}/{filename}
 */
export const uploadImageToCloud = async (uid: string, projectId: string, filename: string, base64Data: string): Promise<string> => {
  const path = `users/${uid}/projects/${projectId}/${filename}`;
  const storageRef = ref(storage, path);
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

/**
 * 核心：激活码兑换系统
 */
export const redeemCodeFromCloud = async (uid: string, code: string): Promise<{ success: boolean, value?: number, message: string }> => {
  try {
    const q = query(collection(db, "redeem_codes"), where("code", "==", code.trim().toUpperCase()));
    const snap = await getDocs(q);
    
    if (snap.empty) {
      return { success: false, message: "激活码不存在，请检查输入" };
    }
    
    const codeDoc = snap.docs[0];
    const codeData = codeDoc.data();
    
    if (codeData.is_used) {
      return { success: false, message: "该激活码已被使用过" };
    }
    
    const batch = writeBatch(db);
    
    // 1. 标记码为已使用
    batch.update(codeDoc.ref, { 
      is_used: true, 
      used_by: uid, 
      used_at: Date.now() 
    });
    
    // 2. 获取用户并增加金币
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) throw new Error("用户数据异常");
    
    const currentCoins = userSnap.data().coins || 0;
    batch.update(userRef, { coins: currentCoins + codeData.value });
    
    await batch.commit();
    
    return { success: true, value: codeData.value, message: "兑换成功！" };
  } catch (e) {
    console.error(e);
    return { success: false, message: "核销失败，请稍后再试" };
  }
};
