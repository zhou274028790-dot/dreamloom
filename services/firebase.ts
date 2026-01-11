
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAG87ZVq2N0HICD2ElZUUSV10tyWXBmCJE",
  authDomain: "gen-lang-client-0495558010.firebaseapp.com",
  projectId: "gen-lang-client-0495558010",
  storageBucket: "gen-lang-client-0495558010.firebasestorage.app",
  messagingSenderId: "61286553084",
  appId: "1:61286553084:web:5edc2635d0aaea3e8c8e79",
  measurementId: "G-PVP3YM80HP"
};

// 安全初始化：防止重复初始化
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
