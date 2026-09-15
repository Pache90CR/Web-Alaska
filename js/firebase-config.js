import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2JhmA4m7NMbRcC2RqaHVIz1NLgI2IzE",
    authDomain: "bar-restaurante-alaska.firebaseapp.com",
    projectId: "bar-restaurante-alaska",
    storageBucket: "bar-restaurante-alaska.firebasestorage.app",
    messagingSenderId: "734422460427",
    appId: "1:734422460427:web:cee048a1edd6bf38b07f0e"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);