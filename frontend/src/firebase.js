import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSdDRB10kbtor5ROR50AsCxVmk0fOpqFo",
  authDomain: "sgh-merida.firebaseapp.com",
  projectId: "sgh-merida",
  storageBucket: "sgh-merida.firebasestorage.app",
  messagingSenderId: "873672016601",
  appId: "1:873672016601:web:3024d5b94ee3926c8e34c8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Instancia Secundaria Fantasma (Para crear usuarios sin cerrar sesión)
const secondaryApp = initializeApp(firebaseConfig, "Secondary");
export const secondaryAuth = getAuth(secondaryApp);
export const secondaryDb = getFirestore(secondaryApp);
