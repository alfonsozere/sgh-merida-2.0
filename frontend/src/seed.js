import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export function initSeed(db) {
  const btn = document.getElementById('btn-seed-users');
  if (!btn) return;
  
  btn.onclick = async () => {
    btn.textContent = 'Creando usuarios...';
    btn.disabled = true;
    const auth = getAuth();
    
    const usersToCreate = [
      {
        email: 'admin@sgh.com',
        pass: '123456',
        data: { rol: 'admin', nombre: 'Súper Administrador' }
      },
      {
        email: 'munic@sgh.com',
        pass: '123456',
        data: { rol: 'munic', municipio: 'LIBERTADOR', nombre: 'Coord. Libertador' }
      },
      {
        email: 'od01771401@sgh.com',
        pass: '123456',
        data: { rol: 'plant', codigo: 'OD01771401', municipio: 'LIBERTADOR', nombre: 'Director Ejemplo', validacion_municipal: false }
      }
    ];

    try {
      for (const u of usersToCreate) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, u.email, u.pass);
          // Escribir perfil en Firestore
          await setDoc(doc(db, 'usuarios', cred.user.uid), u.data);
          console.log(`Usuario creado: ${u.email}`);
        } catch(e) {
          if (e.code === 'auth/email-already-in-use') {
            console.log(`Usuario ${u.email} ya existe. Saltando...`);
          } else {
            console.error(e);
          }
        }
      }
      
      // Cerrar sesión del último usuario creado
      await signOut(auth);
      
      btn.textContent = '✅ Usuarios creados!';
      btn.style.background = '#059669';
      setTimeout(() => { btn.style.display = 'none'; }, 3000);
      alert('¡Listo! Puedes iniciar sesión con:\\n\\n1. admin@sgh.com / 123456\\n2. munic@sgh.com / 123456\\n3. od01771401@sgh.com / 123456');
    } catch(error) {
      console.error(error);
      btn.textContent = '❌ Error';
    } finally {
      btn.disabled = false;
    }
  };
}
