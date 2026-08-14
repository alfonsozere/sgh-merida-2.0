import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDSdDRB10kbtor5ROR50AsCxVmk0fOpqFo",
  authDomain: "sgh-merida.firebaseapp.com",
  projectId: "sgh-merida",
  storageBucket: "sgh-merida.firebasestorage.app",
  messagingSenderId: "873672016601",
  appId: "1:873672016601:web:3024d5b94ee3926c8e34c8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkDoc() {
  const plantelSnap = await getDoc(doc(db, 'planteles_auth', 'S1539D1419'));
  console.log(plantelSnap.data());
  process.exit(0);
}

checkDoc();
