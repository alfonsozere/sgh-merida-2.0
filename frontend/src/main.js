import './style.css'
import { auth, db } from './firebase.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  onAuthStateChanged 
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

window.showToast = function(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  else if (type === 'error') icon = '❌';
  else if (type === 'warning') icon = '⚠️';
  
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 4000);
};

document.addEventListener('DOMContentLoaded', () => {
  const loginSection = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  
  const btnGoRegister = document.getElementById('go-to-register');
  const btnGoLogin = document.getElementById('go-to-login');

  const switchSection = (hideSection, showSection) => {
    hideSection.style.opacity = '0';
    hideSection.style.transform = 'translateX(-20px)';
    
    setTimeout(() => {
      hideSection.classList.remove('active');
      showSection.classList.add('active');
      
      // Force reflow
      void showSection.offsetWidth;
      
      showSection.style.opacity = '1';
      showSection.style.transform = 'translateX(0)';
    }, 400); // match CSS transition duration
  };

  btnGoRegister.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection(loginSection, registerSection);
  });

  btnGoLogin.addEventListener('click', (e) => {
    e.preventDefault();
    switchSection(registerSection, loginSection);
  });

  // Listener Global de Auth (Redirección Automática)
  onAuthStateChanged(auth, async (user) => {
    // Si estamos en medio de un registro, ignoramos este trigger automático
    if (user && !window.isRegistering) {
      // Leer el documento del usuario en Firestore
      try {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.estado_aprobacion === 'APROBADO') {
            // Descargar Mega-Documento antes de entrar
            try {
              const catalogosRef = doc(db, 'sistema', 'catalogos_maestros');
              const catalogosSnap = await getDoc(catalogosRef);
              if (catalogosSnap.exists()) {
                localStorage.setItem('sgh_catalogos', JSON.stringify(catalogosSnap.data()));
                console.log('Catálogos maestros guardados en caché local.');
              }
            } catch (catErr) {
              console.error('Error cargando catálogos maestros:', catErr);
            }
            
            window.location.href = '/dashboard.html';
          } else {
            showToast('Tu cuenta está en estado: ' + data.estado_aprobacion + '. Contacta a tu Municipio.', 'warning');
            auth.signOut();
          }
        } else {
          showToast('Error Crítico: El usuario existe en Auth pero no tiene perfil en Firestore. Regístrese nuevamente.', 'error');
          auth.signOut();
        }
      } catch(e) {
        console.error('Error verificando perfil:', e);
      }
    }
  });

  // Login
  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      // el onAuthStateChanged se encarga del redireccionamiento
    } catch (error) {
      console.error(error);
      showToast('Error al iniciar sesión: ' + error.message, 'error');
    }
  });

  // Registro (Reclamar Plantel)
  document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Bandera para evitar que onAuthStateChanged interrumpa la escritura en Firestore
    window.isRegistering = true; 
    
    const codigo = document.getElementById('reg-codigo').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    
    const btnSubmit = e.target.querySelector('button[type="submit"]');
    if (btnSubmit) { btnSubmit.disabled = true; btnSubmit.innerText = 'Validando...'; }
    
    try {
      // 0. Validar DEA y obtener ubicación
      const deaStr = codigo.toUpperCase();
      const plantelRef = doc(db, 'planteles_auth', deaStr);
      const plantelSnap = await getDoc(plantelRef);
      
      if (!plantelSnap.exists()) {
        throw new Error(`El código DEA ${deaStr} no existe en el catálogo.`);
      }
      
      const pData = plantelSnap.data();
      if (pData.admin_uid || pData.registrado) {
        throw new Error(`Este plantel ya ha sido reclamado o asignado.`);
      }

      if (btnSubmit) btnSubmit.innerText = 'Creando...';
      
      // 1. Crear usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Guardar perfil en Firestore
      await setDoc(doc(db, 'usuarios', user.uid), {
        email: email,
        rol: 'plaadmin',
        estado_aprobacion: 'PENDIENTE', // Estado por defecto según arquitectura
        jerarquia: {
          plantel_codigo: deaStr,
          municipio: pData.ref_municipio || '',
          estado: pData.ref_estado || 'MERIDA'
        },
        creado_en: new Date().toISOString()
      });
      
      // No actualizamos planteles_auth todavía, eso lo hace el administrador al aprobar.

      
      showToast('¡Cuenta creada y plantel reclamado exitosamente!', 'success');
      
      // Ya que ignoramos onAuthStateChanged, redirigimos manualmente
      setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 1500);
      
    } catch (error) {
      window.isRegistering = false; // Liberar bandera en caso de error
      console.error(error);
      showToast('Error al registrar: ' + error.message, 'error');
    }
  });
});
