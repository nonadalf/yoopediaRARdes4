import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAYuiHGu2wpATzWhjrTxOoKrwsIZSF2xlA",
    authDomain: "yoopedia-26002.firebaseapp.com",
    projectId: "yoopedia-26002",
    storageBucket: "yoopedia-26002.firebasestorage.app",
    messagingSenderId: "1054668690608",
    appId: "1:1054668690608:web:544ac89448b0148e815775"
  };

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);