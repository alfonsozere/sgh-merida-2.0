import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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

const municipiosMerida = [
    "ALBERTO ADRIANI", "ANDRÉS BELLO", "ANTONIO PINTO SALINAS", "ARICAGUA", "ARZOBISPO CHACÓN",
    "CAMPO ELÍAS", "CARACCIOLO PARRA OLMEDO", "CARDENAL QUINTERO", "GUARAQUE", "JULIO CÉSAR SALAS",
    "JUSTO BRICEÑO", "LIBERTADOR", "MIRANDA", "OBISPO RAMOS DE LORA", "PADRE NOGUERA", "PUEBLO LLANO",
    "RANGEL", "RIVAS DÁVILA", "SANTOS MARQUINA", "SUCRE", "TOVAR", "TULIO FEBRES CORDERO", "ZEA"
];

async function run() {
    try {
        await setDoc(doc(db, 'sistema', 'catalogos_maestros'), {
            listas_desplegables: {
                municipios: municipiosMerida
            }
        }, { merge: true });
        console.log("Municipios añadidos exitosamente.");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

run();
