import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Define a TypeScript type for Firebase config
type FirebaseConfig = {
    apiKey: string;
    authDomain: string;
    databaseURL?: string; // Optional as it's not always required
    projectId: string;
    storageBucket?: string; // Optional
    messagingSenderId?: string; // Optional
    appId: string;
    measurementId?: string; // Optional
};

// Your Firebase configuration (from your Firebase console)
const firebaseConfig: FirebaseConfig = {
    apiKey: "AIzaSyA_0IURdTs8UQh33-HpROP7Ygrk2jUs-rU",
    authDomain: "artvista-portal.firebaseapp.com",
    projectId: "artvista-portal",
    storageBucket: "artvista-portal.firebasestorage.app",
    messagingSenderId: "638607363844",
    appId: "1:638607363844:web:11a1604c23e0e51c6d8a51",
    measurementId: "G-FWYVFGSK17"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
