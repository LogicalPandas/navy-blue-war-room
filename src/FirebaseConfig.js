import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// The user will replace this with their actual Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAUcyd4Ca4JmLpm6E6LD5Qd4hgy9gQ2k3M",
    authDomain: "navy-blue-war-room.firebaseapp.com",
    projectId: "navy-blue-war-room",
    storageBucket: "navy-blue-war-room.firebasestorage.app",
    messagingSenderId: "561113220388",
    appId: "1:561113220388:web:d2a7df251af12473f11fb1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
