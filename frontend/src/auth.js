import { safeSetDoc, safeUpdateDoc, safeAddDoc } from './dbUtils.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function initAuth(auth, db, callbacks) {
  const { onLogin, onLogout, onWait, onMunic, onAdmin } = callbacks;

  // Cache config in session storage to save reads (Zero-Cost strategy)
  let despliegueConfig = null;

  async function getDespliegueConfig() {
    if (despliegueConfig) return despliegueConfig;
    
    const sessionConfig = sessionStorage.getItem('sgh_despliegue_config');
    if (sessionConfig) {
      despliegueConfig = JSON.parse(sessionConfig);
      return despliegueConfig;
    }
    
    try {
      const snap = await getDoc(doc(db, "configuracion", "despliegue"));
      if (snap.exists()) {
        despliegueConfig = snap.data();
        sessionStorage.setItem('sgh_despliegue_config', JSON.stringify(despliegueConfig));
        return despliegueConfig;
      }
    } catch(e) {
      console.error("Error leyendo configuracion de despliegue", e);
    }
    
    return { municipios_activos: [], excepciones: [] };
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      onLogout();
      return;
    }

    try {
      // 1. Leer el documento del usuario
      const userSnap = await getDoc(doc(db, "usuarios", user.uid));
      if (!userSnap.exists()) {
         console.warn("Usuario autenticado pero sin documento en Firestore");
         onWait("Tu cuenta fue creada pero falta el perfil. Contacta soporte.");
         return;
      }
      const userData = userSnap.data();
      // Asignamos el uid para fácil acceso luego
      userData.uid = user.uid;

      // --- Carga de Catálogos Maestros al Local Storage ---
      if (!localStorage.getItem('sgh_catalogos')) {
         try {
            const catalogosRef = doc(db, 'sistema', 'catalogos_maestros');
            const catalogosSnap = await getDoc(catalogosRef);
            if (catalogosSnap.exists()) {
               localStorage.setItem('sgh_catalogos', JSON.stringify(catalogosSnap.data()));
               console.log('Catálogos maestros guardados en Local Storage.');
            }
         } catch(catErr) {
            console.error('Error cargando catálogos maestros:', catErr);
         }
      }

      // Doble Candado: Verificación de correo
      if (!user.emailVerified && userData.rol !== 'superadmin') {
          onWait("Tu cuenta requiere verificación. Por favor, haz clic en el enlace que te enviamos al correo (revisa tu carpeta de Spam si no lo encuentras).");
          return;
      }

      // 2. Revisión de estado de aprobación general
      if (userData.estado_aprobacion === 'PENDIENTE') {
          onWait("Cuenta en revisión. Esperando validación de tu superior.");
          return;
      }
      if (userData.estado_aprobacion === 'RECHAZADO') {
          onWait("Tu solicitud de acceso ha sido rechazada.");
          return;
      }

      // Si tiene el campo y no es APROBADO ni los anteriores, es un estado desconocido
      if (userData.estado_aprobacion && userData.estado_aprobacion !== 'APROBADO') {
          onWait("Tu cuenta tiene un estado desconocido: " + userData.estado_aprobacion);
          return;
      }

      // 3. Lógica de Ruteo y Bloqueo según ROL (ya está APROBADO o es un rol viejo)
      if (userData.rol === 'admin' || userData.rol === 'superadmin') {
         onAdmin(userData);
         return;
      }

      if (userData.rol === 'munic' || userData.rol === 'munadmin' || userData.rol === 'zonadmin') {
         onMunic(userData);
         return;
      }

      if (userData.rol === 'plant' || userData.rol === 'plaadmin') {
         // --- GATE: DESPLIEGUE ---
         const despliegue = await getDespliegueConfig();
         const cod = userData.jerarquia?.plantel_codigo;
         const mun = userData.jerarquia?.municipio;
         
         const isExp = despliegue.excepciones?.includes(cod);
         const isMun = despliegue.municipios_activos?.includes(mun);
         
         if (!isExp && !isMun) {
            onWait(`El Sistema SGH aún no está habilitado para ${mun ? 'el municipio ' + mun : 'su plantel'}. Por favor, manténgase atento a los canales oficiales.`);
            return;
         }

         // Acceso Total Concedido al Plantel
         onLogin(userData);
      }
    } catch(err) {
      console.error("Error en flujo de seguridad:", err);
      onLogout();
    }
  });
}
