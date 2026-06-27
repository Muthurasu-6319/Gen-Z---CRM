// src/firebase.ts
// Frontend Firebase Web SDK configuration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyAi23IFPrArmNzCy5YhLtK9qj07Ln9UTys",
  authDomain: "genzcrm.firebaseapp.com",
  projectId: "genzcrm",
  storageBucket: "genzcrm.firebasestorage.app",
  messagingSenderId: "365334820684",
  appId: "1:365334820684:web:d28bd6642e80bf426201e9",
  measurementId: "G-KSJZG2ZRG2"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Analytics (only in browser)
let analytics: any = null;
try { analytics = getAnalytics(app); } catch {}
export { analytics };
export default app;
