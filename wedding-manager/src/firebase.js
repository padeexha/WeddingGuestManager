import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyC74d6TSAUDwf_tlibVDvGaPdPfPgeEKMQ",
  authDomain: "weddingguestplanner-66f82.firebaseapp.com",
  projectId: "weddingguestplanner-66f82",
  storageBucket: "weddingguestplanner-66f82.firebasestorage.app",
  messagingSenderId: "669288780434",
  appId: "1:669288780434:web:9d08ac72d1c1e3e9e94c4b",
  measurementId: "G-44N4ZGJ43P"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
