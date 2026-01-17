
import { doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, deleteDoc, writeBatch, orderBy } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { BookProject, User, StoryTemplate, VisualStyle } from "../types";

/**
 * 核心：同步用户资料。强制使用 UID 作为 Firestore 文档 ID。
 */
export const syncUserProfile = async (uid: string, userData: Partial<User>) => {
  if (!uid) return;
  const userRef = doc(db, "users", uid);
  await setDoc(userRef, { ...userData, updatedAt: Date.now() }, { merge: true });
};

/**
 * 获取用户资料。直接通过 UID（文档 ID）查询，这是最快且最准确的方式。
 */
export const getUserProfile = async (uid: string): Promise<User | null> => {
  if (!uid) return null;
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);
  return snap.exists() ? snap.data() as User : null;
};

/**
 * 初始化新用户。如果用户是第一次登录，创建以 UID 为 ID 的文档并赠送初始金豆。
 */
export const initializeUserProfile = async (uid: string, username: string): Promise<User> => {
  const existing = await getUserProfile(uid);
  if (existing) return existing;

  const newUser: User = {
    isLoggedIn: true,
    username: username || '新造梦师',
    coins: 80,
    isFirstRecharge: true
  };
  
  await syncUserProfile(uid, newUser);
  return newUser;
};

/**
 * 上传图片到云端。路径中包含 UID 以保证隔离。
 */
export const uploadImageToCloud = async (uid: string, projectId: string, filename: string, base64Data: string): Promise<string> => {
  const path = `users/${uid}/projects/${projectId}/${filename}`;
  const storageRef = ref(storage, path);
  const cleanData = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
  await uploadString(storageRef, cleanData, 'base64');
  return await getDownloadURL(storageRef);
};

/**
 * 保存项目。确保 ownerId 与当前用户 UID 一致。
 */
export const saveProjectToCloud = async (uid: string, project: BookProject) => {
  const projectRef = doc(db, "projects", project.id);
  await setDoc(projectRef, { ...project, ownerId: uid, updatedAt: Date.now() }, { merge: true });
};

/**
 * 加载用户的全部项目。
 */
export const loadUserProjects = async (uid: string): Promise<BookProject[]> => {
  try {
    const q = query(collection(db, "projects"), where("ownerId", "==", uid));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        title: data.title || "未命名故事",
        originalIdea: data.originalIdea || "",
        template: data.template || StoryTemplate.HERO_JOURNEY,
        pages: Array.isArray(data.pages) ? data.pages : [],
        characterDescription: data.characterDescription || "",
        characterSeedImage: data.characterSeedImage || "",
        visualStyle: data.visualStyle || VisualStyle.WATERCOLOR,
        extractionCode: data.extractionCode || "",
        currentStep: data.currentStep || 'idea',
        createdAt: data.createdAt || data.updatedAt || Date.now(),
        ...data
      } as BookProject;
    });
  } catch (error) {
    console.error("加载项目列表失败:", error);
    return [];
  }
};

export const deleteProjectFromCloud = async (projectId: string) => {
  await deleteDoc(doc(db, "projects", projectId));
};

export const redeemCodeFromCloud = async (uid: string, code: string): Promise<{ success: boolean, value?: number, message: string }> => {
  try {
    const q = query(collection(db, "redeem_codes"), where("code", "==", code.trim().toUpperCase()));
    const snap = await getDocs(q);
    
    if (snap.empty) return { success: false, message: "激活码不存在" };
    
    const codeDoc = snap.docs[0];
    const codeData = codeDoc.data();
    if (codeData.is_used) return { success: false, message: "激活码已被使用" };
    
    const batch = writeBatch(db);
    batch.update(codeDoc.ref, { is_used: true, used_by: uid, used_at: Date.now() });
    
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    const currentCoins = userSnap.exists() ? (userSnap.data().coins || 0) : 0;
    batch.update(userRef, { coins: currentCoins + codeData.value });
    
    await batch.commit();
    return { success: true, value: codeData.value, message: "兑换成功！" };
  } catch (e) {
    return { success: false, message: "操作失败" };
  }
};
