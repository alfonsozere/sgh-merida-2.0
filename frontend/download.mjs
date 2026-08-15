import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from 'fs';

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

async function downloadCollection(colName, outPath) {
    console.log(`Downloading ${colName}...`);
    const snap = await getDocs(collection(db, colName));
    const data = {};
    snap.forEach(doc => {
        data[doc.id] = doc.data();
    });
    fs.writeFileSync(outPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Saved ${outPath}`);
}

async function run() {
    if (!fs.existsSync('C:/Proyectos/sgh-2.0/compartir')) {
        fs.mkdirSync('C:/Proyectos/sgh-2.0/compartir');
    }
    
    try {
        await downloadCollection('planteles', 'C:/Proyectos/sgh-2.0/compartir/planteles.json');
        await downloadCollection('sistema', 'C:/Proyectos/sgh-2.0/compartir/sistema.json');
        console.log("Download complete!");
        process.exit(0);
    } catch(err) {
        console.error("Error", err);
        process.exit(1);
    }
}

run();
