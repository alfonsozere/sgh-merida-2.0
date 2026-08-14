import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";

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

async function checkCargos() {
  const q = query(collection(db, 'cargos_personal'), limit(3));
  const snap = await getDocs(q);
  console.log(`Found ${snap.docs.length} cargos`);
  snap.forEach(d => console.log(d.id, d.data()));
  process.exit(0);
}

checkCargos();
