// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase } from 'firebase/database';
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD2jXAk11-VKjC384MB0QIIIjHLs7kyQXE",
  authDomain: "carti-8745c.firebaseapp.com",
  databaseURL: "https://carti-8745c-default-rtdb.firebaseio.com",
  projectId: "carti-8745c",
  storageBucket: "carti-8745c.appspot.com",
  messagingSenderId: "239370672595",
  appId: "1:239370672595:web:5a280323342eca8e9e3726",
  measurementId: "G-640E183H1N"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Export these for use in your hooks
export const db = getDatabase(app);
export const auth = getAuth(app);