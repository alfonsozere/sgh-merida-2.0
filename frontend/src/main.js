
window.showLoading = (msg) => {
    const modal = document.getElementById('global-loading-modal');
    if(modal) {
        document.getElementById('global-loading-text').textContent = (msg || 'CARGANDO...').toUpperCase();
        modal.style.display = 'flex';
        modal.style.opacity = '1';
    }
};
window.hideLoading = () => {
    const modal = document.getElementById('global-loading-modal');
    if(modal) {
        modal.style.opacity = '0';
        setTimeout(() => modal.style.display = 'none', 400);
    }
};

import { showToast, showAlert } from './uiUtils.js';

// --- CAPA VISUAL: FORZAR MAYÚSCULAS GLOBALES ---
document.addEventListener('input', (e) => {
    if (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'search' || !e.target.type)) {
        // Ignorar campos de contraseña (incluso si están en texto visible)
        if (e.target.id.includes('password') || e.target.id.includes('pwd')) return;
        
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        if(e.target.setSelectionRange) e.target.setSelectionRange(start, end);
    } else if (e.target.tagName === 'TEXTAREA') {
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.toUpperCase();
        if(e.target.setSelectionRange) e.target.setSelectionRange(start, end);
    } else if (e.target.tagName === 'INPUT' && e.target.type === 'email') {
        e.target.value = e.target.value.toLowerCase();
    }
});

import { safeSetDoc, safeUpdateDoc, safeAddDoc } from './dbUtils.js';
import './style.css';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, deleteField } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendEmailVerification, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { initAuth } from './auth.js';
import { initSeed } from './seed.js';

// TODO: Remplazar con la configuración de Firebase de SGH
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
const auth = getAuth(app);

// Iniciar script temporal de creación de usuarios
initSeed(db);

// Variables de estado
let dictionaryData = {};
let currentPlantel = null;

// Referencias al DOM
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const lockScreen = document.getElementById('lock-screen');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const userDisplayName = document.getElementById('user-display-name');
const btnLogout = document.getElementById('btn-logout');
const plantelForm = document.getElementById('plantel-form');

// --- Navegación ---
function showView(viewId) {
    if (window.hideLoading) window.hideLoading();
    const loader = document.getElementById('app-loader');
    if (loader && loader.style.display !== 'none') {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            document.body.style.overflow = '';
        }, 400);
    }
    
    // Al usar !important en .view, necesitamos sobreescribir el estilo inline temporalmente
    document.querySelectorAll('.view').forEach(v => {
        v.classList.remove('active');
        v.style.setProperty('display', 'none', 'important');
    });
    
    const target = document.getElementById(viewId);
    if(target) {
        target.classList.add('active');
        target.style.setProperty('display', 'flex', 'important');
    }
}

// Función para buscar un plantel directamente en Firestore
async function findPlantel(codigoDEA) {
    if (!codigoDEA) return null;
    try {
        const docRef = doc(db, 'planteles', codigoDEA.toUpperCase());
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const p = docSnap.data();
            p.municipio_nombre = p.municipio;
            p.parroquia_nombre = p.parroquia;
            return p;
        }
    } catch(e) {
        console.error("Error consultando plantel:", e);
    }
    return null;
}

// Load Municipios from Cache or Firestore
async function loadMunicipios() {
    const selectMun = document.getElementById('reg-municipio');
    let muns = JSON.parse(localStorage.getItem('sgh_catalogos_muns'));
    
    if(!muns) {
        try {
            const docSnap = await getDoc(doc(db, 'sistema', 'catalogos_maestros'));
            if(docSnap.exists() && docSnap.data().listas_desplegables) {
                muns = docSnap.data().listas_desplegables.municipios;
                localStorage.setItem('sgh_catalogos_muns', JSON.stringify(muns));
            }
        } catch(e) {
            console.error("Error cargando municipios:", e);
        }
    }

    if(muns && selectMun) {
        selectMun.innerHTML = '<option value="" disabled selected>Seleccione el Municipio</option>';
        muns.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m; opt.textContent = m;
            selectMun.appendChild(opt);
        
          // Actualizar vista
          if (document.getElementById('lbl-matricula-total')) document.getElementById('lbl-matricula-total').textContent = matTotal;
          if (document.getElementById('inp-matricula-total')) document.getElementById('inp-matricula-total').value = matTotal;
          
          // El botón siempre permanece activo según requerimiento. No se requiere auto-habilitarlo.
});
    }
}

// --- Lógica Central de Autenticación (Guardián) ---
initAuth(auth, db, {
  onLogout: () => {
    localStorage.removeItem('sgh_catalogos');
    sessionStorage.removeItem('sgh_despliegue_config');
    document.getElementById('login-form')?.reset();
    
    // Resetear UI del Dashboard para no dejar la "última pantalla" abierta
    if (typeof window.closeSidebar === 'function') {
        window.closeSidebar();
    }
    document.querySelectorAll('.sidebar-btn').forEach(b => {
        if(!b.classList.contains('accordion-btn')) b.classList.remove('active');
    });
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    
    // Forzar Estadísticas como pestaña por defecto
    const btnDash = document.querySelector('[data-target="admin-tab-estadisticas"]');
    if(btnDash) btnDash.classList.add('active');
    const tabDash = document.getElementById('admin-tab-estadisticas');
    if(tabDash) tabDash.classList.add('active');
    
    // Cerrar acordeones
    document.querySelectorAll('.accordion-btn').forEach(b => {
        b.classList.remove('open');
        const arrow = b.querySelector('.arrow');
        if (arrow) arrow.style.transform = 'rotate(0deg)';
    });
    document.querySelectorAll('.accordion-content').forEach(c => {
        c.style.display = 'none';
    });

    showView('login-view');
  },
  onWait: (mensaje) => {
    showView('espera-view');
    const msjEl = document.querySelector('#espera-view p');
    if (msjEl) msjEl.textContent = mensaje;
  },
  onLogin: async (userData) => {
    if(userData.rol === 'plaadmin') {
        const dp = await findPlantel(userData.jerarquia.plantel_codigo);
        const nombrePlantel = dp ? dp.nombre_plantel : "Plantel Desconocido";
        userDisplayName.textContent = `${userData.jerarquia.plantel_codigo} - ${nombrePlantel}`;
        await checkPlantelData(userData.jerarquia.plantel_codigo);
    } else {
        userDisplayName.textContent = `${userData.nombre}`;
        // showView('dashboard-view'); // Removido por el motor dinámico
    }
  },

  onAdmin: async (userData) => {
    showView('admin-view');
    import('./admin.js').then(m => m.initAdminDashboard(db, userData));
  }
});

// Toggle Password Visibility
const togglePwd = (toggleBtnId, inputId) => {
    const btn = document.getElementById(toggleBtnId);
    const inp = document.getElementById(inputId);
    if(btn && inp) {
        btn.addEventListener('click', () => {
            if(inp.type === 'password') {
                inp.type = 'text';
                btn.textContent = '🙈';
            } else {
                inp.type = 'password';
                btn.textContent = '👁️';
            }
        });
    }
}
togglePwd('toggle-login-pwd', 'login-password');
togglePwd('toggle-reg-pwd', 'reg-password');

// Switch Login/Register
document.getElementById('link-go-register')?.addEventListener('click', () => {
    showView('register-view');
    loadMunicipios();
});
document.getElementById('link-go-login')?.addEventListener('click', () => {
    showView('login-view');
});

// Dynamic form fields for Registration
document.getElementById('reg-rol')?.addEventListener('change', (e) => {
    const rol = e.target.value;
    document.getElementById('dynamic-munadmin').classList.add('hidden');
    document.getElementById('dynamic-plaadmin').classList.add('hidden');
    document.getElementById('reg-municipio').required = false;
    document.getElementById('reg-codigo-dea').required = false;

    if(rol === 'munadmin') {
        document.getElementById('dynamic-munadmin').classList.remove('hidden');
        document.getElementById('reg-municipio').required = true;
    } else if(rol === 'plaadmin') {
        document.getElementById('dynamic-plaadmin').classList.remove('hidden');
        document.getElementById('reg-codigo-dea').required = true;
    }
});

// Botón de Cerrar Sesión (Sala Espera)
document.getElementById('btn-logout-espera')?.addEventListener('click', async () => {
    await signOut(auth);
});

// --- Lógica del Login ---
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const loginError = document.getElementById('login-error');

  try {
    loginError.style.display = 'none';
    const btn = document.querySelector('#login-form button[type="submit"]');
    btn.innerHTML = 'Verificando...'; btn.disabled = true; window.showLoading("Autenticando y verificando permisos...");
    const loginFormElements = document.getElementById('login-form').querySelectorAll('input, button.toggle-password');
    loginFormElements.forEach(el => el.disabled = true);
    const linkRegister = document.getElementById('link-go-register');
    if (linkRegister) { linkRegister.style.pointerEvents = 'none'; linkRegister.style.opacity = '0.5'; }

    await setPersistence(auth, browserSessionPersistence);
    
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    loginError.textContent = "Credenciales inválidas.";
    loginError.style.display = 'block';
  } finally {
        const btn = document.querySelector('#login-form button[type="submit"]');
        if(btn) {
            btn.innerHTML = 'Iniciar Sesión';
            btn.disabled = false;
            const loginFormElements = document.getElementById('login-form').querySelectorAll('input, button.toggle-password');
            loginFormElements.forEach(el => el.disabled = false);
            const linkRegister = document.getElementById('link-go-register');
            if (linkRegister) { linkRegister.style.pointerEvents = 'auto'; linkRegister.style.opacity = '1'; }
        }
        // Solo quitamos el modal aquí si hubo un error visible. Si no hay error, el modal se quita al cambiar de pantalla.
        if (loginError.style.display === 'block') {
            window.hideLoading();
        }
    }
});

// --- Lógica del Registro ---
document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-register');
    const err = document.getElementById('register-error');
    err.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = 'Registrando...'; window.showLoading("Creando cuenta y asignando rol...");
    // Inhabilitar campos
    const regForm = document.getElementById('register-form');
    const formElements = regForm.querySelectorAll('input, select');
    formElements.forEach(el => el.disabled = true);
    const linkLogin = document.getElementById('link-go-login');
    if (linkLogin) { linkLogin.style.pointerEvents = 'none'; linkLogin.style.opacity = '0.5'; }

    const nombre = document.getElementById('reg-nombre').value.trim();
    const cedula = document.getElementById('reg-cedula').value.trim();
    const telefono = document.getElementById('reg-telefono').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pwd = document.getElementById('reg-password').value;
    const rol = document.getElementById('reg-rol').value;
    let municipio = document.getElementById('reg-municipio').value || "";
    const dea = document.getElementById('reg-codigo-dea').value.trim().toUpperCase();
    const deaErr = document.getElementById('reg-dea-error');
    deaErr.style.display = 'none';

    try {
        if(rol === 'plaadmin') {
            const dp = await findPlantel(dea);
            if(!dp) {
                deaErr.textContent = "El código DEA no existe en la base de datos.";
                deaErr.style.display = 'block';
                throw new Error("Invalid DEA");
            }
            municipio = dp.municipio || dp.municipio_nombre;
        }

        const cred = await createUserWithEmailAndPassword(auth, email, pwd);
        await sendEmailVerification(cred.user);

        let jerarquia = { estado: "MERIDA" };
        if(rol === 'munadmin') {
            jerarquia.municipio = municipio;
        } else if(rol === 'plaadmin') {
            jerarquia.municipio = municipio;
            jerarquia.plantel_codigo = dea;
        }

        await safeSetDoc(doc(db, 'usuarios', cred.user.uid), {
            nombre,
            cedula,
            telefono,
            email,
            rol,
            jerarquia,
            estado_aprobacion: "PENDIENTE",
            creado_el: new Date().toISOString()
        });

        await showAlert("¡Registro Exitoso!", "Revise su correo electrónico para verificar su cuenta y comuníquese con su superior para la aprobación.", "success");
        await signOut(auth);

    } catch (error) {
        if(error.message !== "Invalid DEA") {
            console.error(error);
            err.textContent = "Error al registrarse. Revise sus datos e intente de nuevo.";
            if(error.code === 'auth/email-already-in-use') err.textContent = "El correo ya está en uso.";
            err.style.display = 'block';
        }
    } finally {
        window.hideLoading();
        btn.disabled = false;
        btn.innerHTML = 'Registrarse';
        const formElements = document.getElementById('register-form').querySelectorAll('input, select');
    formElements.forEach(el => el.disabled = false);
    const linkLogin = document.getElementById('link-go-login');
    if (linkLogin) { linkLogin.style.pointerEvents = 'auto'; linkLogin.style.opacity = '1'; }
    }
});


// --- Lógica Dinámica de Matrícula (Fase 2) ---


function _distribuirSecciones(numSec, numGrados) {
    const base = Math.floor(numSec / numGrados);
    const resto = numSec % numGrados;
    const dist = [];
    for (let g = 0; g < numGrados; g++) {
        dist.push(base + (g < resto ? 1 : 0));
    }
    return dist;
}

function _letraGrupo(s) {
    return String.fromCharCode(65 + s);
}

function _renderCajasInicial(tipo, numSec) {
    const cont = document.getElementById('cont-dinamico-' + tipo);
    if (!cont) return;
    
    if (numSec === 0) {
        cont.innerHTML = '';
        return;
    }

    let html = '<div style="margin-top: 15px;">';
    html += '<h4 style="font-size: 0.9rem; color: #475569; margin-bottom: 10px; text-transform: capitalize;">' + tipo + '</h4>';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 15px;">';

    for (let i = 0; i < numSec; i++) {
        const letra = numSec === 1 ? 'U' : _letraGrupo(i);
        const ident = tipo + '-' + letra;
        
        html += '<div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc;">';
        html += '  <h5 style="margin: 0 0 8px; font-size: 0.85rem; color: #1e293b; text-align: center;">Grupo ' + letra + '</h5>';
        html += '  <div style="display: flex; gap: 10px;">';
        html += '    <div style="flex: 1;">';
        html += '      <label style="font-size: 0.65rem; color: #64748b; display: block; text-align: center;">FEM</label>';
        html += '      <input type="number" class="mat-input mat-' + tipo + '" data-grupo="' + ident + '" data-sexo="F" min="0" value="" style="width: 100%; padding: 0.3rem; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">';
        html += '    </div>';
        html += '    <div style="flex: 1;">';
        html += '      <label style="font-size: 0.65rem; color: #64748b; display: block; text-align: center;">MAS</label>';
        html += '      <input type="number" class="mat-input mat-' + tipo + '" data-grupo="' + ident + '" data-sexo="M" min="0" value="" style="width: 100%; padding: 0.3rem; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">';
        html += '    </div>';
        html += '  </div>';
        html += '</div>';
    }
    
    html += '</div></div>';
    cont.innerHTML = html;
}

function _renderCajasPrimaria(numSec) {
    const cont = document.getElementById('cont-dinamico-primaria');
    if (!cont) return;

    if (numSec === 0) {
        cont.innerHTML = '';
        return;
    }

    const dist = _distribuirSecciones(numSec, 6);
    const ORDINALES = ['1er', '2do', '3er', '4to', '5to', '6to'];
    
    let html = '<div style="margin-top: 15px;">';
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">';

    for (let g = 0; g < 6; g++) {
        if (dist[g] === 0) continue;
        
        const secsEnGrado = dist[g];
        for (let s = 0; s < secsEnGrado; s++) {
            const letra = secsEnGrado === 1 ? 'U' : _letraGrupo(s);
            const titulo = ORDINALES[g] + ' Grado ' + letra;
            const ident = 'primaria-' + (g+1) + letra;
            
            html += '<div style="border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px; background: #f8fafc;">';
            html += '  <h5 style="margin: 0 0 8px; font-size: 0.85rem; color: #1e293b; text-align: center;">' + titulo + '</h5>';
            html += '  <div style="display: flex; gap: 10px;">';
            html += '    <div style="flex: 1;">';
            html += '      <label style="font-size: 0.65rem; color: #64748b; display: block; text-align: center;">FEM</label>';
            html += '      <input type="number" class="mat-input mat-primaria" data-grupo="' + ident + '" data-sexo="F" min="0" value="" style="width: 100%; padding: 0.3rem; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">';
            html += '    </div>';
            html += '    <div style="flex: 1;">';
            html += '      <label style="font-size: 0.65rem; color: #64748b; display: block; text-align: center;">MAS</label>';
            html += '      <input type="number" class="mat-input mat-primaria" data-grupo="' + ident + '" data-sexo="M" min="0" value="" style="width: 100%; padding: 0.3rem; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">';
            html += '    </div>';
            html += '  </div>';
            html += '</div>';
        }
    }

    html += '</div></div>';
    cont.innerHTML = html;
}

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('sec-master-input')) {
        const val = parseInt(e.target.value) || 0;
        const plan = e.target.getAttribute('data-plan');
        
        if (plan === '20000') {
            const tipo = e.target.getAttribute('data-tipo');
            _renderCajasInicial(tipo, val);
        } else if (plan === '21000') {
            _renderCajasPrimaria(val);
        }
        
        // Recalcular matrícula al redibujar
        document.getElementById('contenedor-matricula').dispatchEvent(new Event('input', { bubbles: true }));
    }
});

// Reemplazar la lógica anterior de sumatoria de matrícula

// --- Lógica del "Candado de Navegación" ---
// Cálculo automático de totales
document.getElementById('plantel-form')?.addEventListener('input', (e) => {
    if (e.target.tagName.toLowerCase() === 'input') {
        let matTotal = 0;
        
        const sumInputs = (selector) => {
            let sum = 0;
            document.querySelectorAll(selector).forEach(inp => {
                const b1 = inp.closest('div[id^="bloque-"]'); const b2 = inp.closest('#cont-secciones-detalle'); if ((b1 && b1.style.display !== 'none') || (b2 && b2.style.display !== 'none')) {
                    sum += parseInt(inp.value || 0);
                }
            });
            return sum;
        };

        // Subtotales
        const totMat = sumInputs('.mat-maternal');
        const totPre = sumInputs('.mat-preescolar');
        const totIni = totMat + totPre;
        
        const totPri = sumInputs('.mat-primaria');
        const totMed = sumInputs('.mat-media');
        const totTec = sumInputs('.mat-tecnica');
        
        if(document.getElementById('tot-inicial')) document.getElementById('tot-inicial').textContent = totIni;
        if(document.getElementById('tot-primaria')) document.getElementById('tot-primaria').textContent = totPri;
        
          // Calculate dynamic media gen
          let sumMg = 0, sumMt = 0;
          document.querySelectorAll('.dyn-mg-fem, .dyn-mg-mas').forEach(i => sumMg += parseInt(i.value||0));
          document.querySelectorAll('.dyn-mt-fem, .dyn-mt-mas').forEach(i => sumMt += parseInt(i.value||0));
          
          if(document.getElementById('tot-media-gen')) document.getElementById('tot-media-gen').textContent = sumMg;
          if(document.getElementById('tot-media-tec')) document.getElementById('tot-media-tec').textContent = sumMt;

          // Calculate section sums per plan and totals
          let totalSecMg = 0, totalSecMt = 0;
          const planesSums = {};
          document.querySelectorAll('.sec-anio-input').forEach(inp => {
              if (inp.closest('div[id^="bloque-"]')?.style.display !== 'none' && inp.closest('#cont-secciones-detalle')?.style.display !== 'none') {
                  const plan = inp.dataset.plan;
                  const v = parseInt(inp.value || 0);
                  if (!planesSums[plan]) planesSums[plan] = 0;
                  planesSums[plan] += v;
                  
                  if (plan.startsWith('3')) totalSecMg += v;
                  if (plan.startsWith('4')) totalSecMt += v;
              }
          });
          
          // Update the plan section counters
          Object.keys(planesSums).forEach(p => {
              const el = document.getElementById('tot-sec-plan-' + p);
              if (el) el.textContent = planesSums[p];
          });
          
          // Update global section counters
          if(document.getElementById('tot-sec-media-gen')) document.getElementById('tot-sec-media-gen').textContent = totalSecMg;
          if(document.getElementById('tot-sec-media-tec')) document.getElementById('tot-sec-media-tec').textContent = totalSecMt;
        

        // Sumar todos los inputs de matrícula (.mat-input)
        document.querySelectorAll('.mat-input').forEach(input => {
            if (input.closest('div[id^="bloque-"]').style.display !== 'none') {
                matTotal += parseInt(input.value || 0);
            }
        });
        

    }
});

// --- Lógicas Algorítmicas Migradas de sgh_gas ---
window._VACANTES_TEMP = {};

function _letraSec(s, nTotal) {
    return nTotal === 1 ? 'U' : String.fromCharCode(65 + s);
}



function _getGuardado(data, clavePrincipal) {
    if (!data) return 0;
    if (data[clavePrincipal]) {
        const valExacto = parseInt(data[clavePrincipal], 10) || 0;
        delete data[clavePrincipal];
        return valExacto;
    }
    return 0;
}

function _renderizarDetalleSecciones(planes, guardadas = null) {
    const cont = document.getElementById('cont-secciones-detalle');
    const contDinamico = document.getElementById('cont-secciones-dinamicas');
    if (!cont || !contDinamico) return;
    contDinamico.innerHTML = '';
    
    const planesArr = Object.keys(planes).sort();
    const mediaPlanes = planesArr.filter(p => p !== '20000' && p !== '21000');
    
    if (mediaPlanes.length === 0) {
        cont.style.display = 'none';
        return;
    }
    
    cont.style.display = 'block';
    let html = '';
    
    // Usamos las guardadas o un objeto vacío
    const seccionesGuardadas = guardadas || {}; 
    
    
      const planesMG = mediaPlanes.filter(p => p.startsWith('3'));
      const planesMT = mediaPlanes.filter(p => p.startsWith('4'));

      const renderPlan = (plan) => {
          const isMt = plan.startsWith('4');
          const anios = isMt ? 6 : 5;
          const info = planes[plan];
          let titulo = 'Plan ' + plan;
          if (info && info.mencion) titulo += ' (' + info.mencion + ')';
          
          html += '<div style="margin-bottom: 1.5rem; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; background: #f9fafb;">';
          html += '<h4 style="margin: 0 0 1rem; color: #1e40af; font-size: 0.95rem;">' + titulo + '</h4>';
          html += '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 1rem;">';
          
          for (let i = 1; i <= anios; i++) {
              const planSec = seccionesGuardadas[plan] || {};
              const val = parseInt(planSec[i] !== undefined ? planSec[i] : (planSec[String(i)] !== undefined ? planSec[String(i)] : 0)) || 0;
              html += '<div style="display: flex; flex-direction: column; gap: 0.3rem;">';
              html += '<label style="font-size: 0.8rem; font-weight: 600; color: #374151;">' + i + 'º Año</label>';
              html += '<input type="number" class="sec-anio-input" data-plan="' + plan + '" data-anio="' + i + '" min="0" value="' + (val || '') + '" style="padding: 0.4rem; text-align: center; border: 1px solid #cbd5e1; border-radius: 4px;">';
              html += '</div>';
          }
          
          html += '</div>';
          html += '<div style="background: #f1f5f9; padding: 12px 20px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">';
          html += '<span style="font-size: 0.9rem; color: var(--primary-color); font-weight: 600;">Total Secciones (Plan ' + plan + ')</span>';
          html += '<span id="tot-sec-plan-' + plan + '" class="tot-sec-plan-label" data-plan="' + plan + '" style="font-size: 1.1rem; color: #0f172a; font-weight: bold;">0</span>';
          html += '</div>';
          html += '</div>';
      };

      if (planesMG.length > 0) {
          html += '<div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; margin: -20px -20px 20px -20px;"><div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 1.2rem;">👨‍🏫</span><h3 style="margin: 0; font-size: 1rem; color: #1e293b;">Cantidad de Secciones por Año - Media General</h3></div><div><span style="font-size: 0.9rem; color: var(--primary-color); font-weight: 600;">Total Secciones Media Gen: </span><span id="tot-sec-media-gen" style="font-size: 1.1rem; color: #0f172a; font-weight: bold;">0</span></div></div>';
          planesMG.forEach(renderPlan);
      }
      if (planesMT.length > 0) {
          html += '<div style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; border-top: 1px solid #e2e8f0; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; margin: 0 -20px 20px -20px;"><div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 1.2rem;">⚙️</span><h3 style="margin: 0; font-size: 1rem; color: #1e293b;">Cantidad de Secciones por Año - Media Técnica</h3></div><div><span style="font-size: 0.9rem; color: var(--primary-color); font-weight: 600;">Total Secciones Media Téc: </span><span id="tot-sec-media-tec" style="font-size: 1.1rem; color: #0f172a; font-weight: bold;">0</span></div></div>';
          planesMT.forEach(renderPlan);
      }
      
      contDinamico.innerHTML = html;
}


function _renderizarMatriculaMedia(planes, guardadas = null) {
    const contMg = document.getElementById('cont-mat-media-general');
    const contMt = document.getElementById('cont-mat-media-tecnica');
    if (contMg) contMg.innerHTML = '';
    if (contMt) contMt.innerHTML = '';
    
    const matMedia = guardadas ? guardadas.media : null;
    const mgSaved = matMedia ? (matMedia["media-general"] || {}) : {};
    const mtSaved = matMedia ? (matMedia["media-tecnica"] || {}) : {};

    Object.keys(planes).sort().forEach(plan => {
        const info = planes[plan];
        let titulo = 'Plan ' + plan;
        if (info && info.mencion) titulo += ' (' + info.mencion + ')';

        if (plan.startsWith('3') && contMg) {
            const saved = mgSaved[plan] || {};
            let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc;">';
            html += '<div style="grid-column: span 2;"><h4 style="margin: 0; color: #1e40af; font-size: 0.95rem;">' + titulo + '</h4></div>';
            html += '<div><label style="font-size: 0.75rem; color: #64748b;">Femenino</label><input type="number" class="mat-input mat-media dyn-mg-fem" data-plan="' + plan + '" min="0" value="' + (saved.fem || '') + '" style="background: white; color: #0f172a; border-color: #cbd5e1; width: 100%;" /></div>';
            html += '<div><label style="font-size: 0.75rem; color: #64748b;">Masculino</label><input type="number" class="mat-input mat-media dyn-mg-mas" data-plan="' + plan + '" min="0" value="' + (saved.mas || '') + '" style="background: white; color: #0f172a; border-color: #cbd5e1; width: 100%;" /></div>';
            html += '</div>';
            contMg.innerHTML += html;
        } else if (plan.startsWith('4') && contMt) {
            const saved = mtSaved[plan] || {};
            let html = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc;">';
            html += '<div style="grid-column: span 2;"><h4 style="margin: 0; color: #1e40af; font-size: 0.95rem;">' + titulo + '</h4></div>';
            html += '<div><label style="font-size: 0.75rem; color: #64748b;">Femenino</label><input type="number" class="mat-input mat-media dyn-mt-fem" data-plan="' + plan + '" min="0" value="' + (saved.fem || '') + '" style="background: white; color: #0f172a; border-color: #cbd5e1; width: 100%;" /></div>';
            html += '<div><label style="font-size: 0.75rem; color: #64748b;">Masculino</label><input type="number" class="mat-input mat-media dyn-mt-mas" data-plan="' + plan + '" min="0" value="' + (saved.mas || '') + '" style="background: white; color: #0f172a; border-color: #cbd5e1; width: 100%;" /></div>';
            html += '</div>';
            contMt.innerHTML += html;
        }
    });
}

async function _abrirModalVacantes() {
    let mat = parseInt(document.getElementById('inp-sec-maternal')?.value) || 0;
    let pre = parseInt(document.getElementById('inp-sec-preescolar')?.value) || 0;
    let pri = parseInt(document.getElementById('inp-sec-primaria')?.value) || 0;

    const VAC = window._VACANTES_TEMP || {};

    // Auto-corrección
    if (mat === 0 && VAC['maternal'] && Object.keys(VAC['maternal']).length > 0) mat = Object.keys(VAC['maternal']).length;
    if (pre === 0 && VAC['preescolar'] && Object.keys(VAC['preescolar']).length > 0) pre = Object.keys(VAC['preescolar']).length;
    if (pri === 0 && VAC['primaria'] && Object.keys(VAC['primaria']).length > 0) pri = 6;

    if (mat === 0 && pre === 0 && pri === 0) {
        await showAlert('Secciones Requeridas', 'Primero declare las secciones en el formulario de matrícula para Educación Inicial o Primaria.', 'warning');
        return;
    }

    const contenido = document.getElementById('vacantes-contenido');
    if (!contenido) return;
    contenido.innerHTML = '';

    function _crearBloque(titulo, keyPlan, numSec, dataObj) {
        const tempData = dataObj ? JSON.parse(JSON.stringify(dataObj)) : {};
        const div = document.createElement('div');
        div.style.cssText = 'margin-bottom:1.2rem; border:1px solid #fde68a; border-radius:8px; padding:1rem; background:#fffbeb;';
        const h4 = document.createElement('h4');
        h4.textContent = titulo;
        h4.style.cssText = 'margin:0 0 0.75rem; font-size:0.95rem; color:#92400e; font-weight:700;';
        div.appendChild(h4);
        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:0.5rem;';
        
        for (let s = 0; s < numSec; s++) {
            const letra = _letraSec(s, numSec);
            const guardado = _getGuardado(tempData, letra);
            const wrap = document.createElement('div');
            wrap.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:0.5rem; background:#fff; padding:0.5rem 0.8rem; border-radius:4px; border:1px solid #e2e8f0;';
            
            const ident = keyPlan + '-' + letra;
            const inputsFemMas = document.querySelectorAll('.mat-input.mat-' + keyPlan + '[data-grupo="' + ident + '"]');
            let totalSec = 0;
            inputsFemMas.forEach(i => totalSec += (parseInt(i.value) || 0));
            
            const inp = document.createElement('input');
            inp.type = 'checkbox'; 
            inp.checked = (guardado !== 0 && guardado !== undefined && guardado !== "");
            inp.dataset.plan = keyPlan; inp.dataset.sec = letra;
            inp.className = 'vac-input';
            inp.style.cssText = 'width:18px; height:18px; cursor:pointer; accent-color:#f59e0b; margin:0 !important; padding:0 !important; flex-shrink:0;';
            inp.id = 'chk-vac-' + keyPlan + '-' + letra;
            
            const lbl = document.createElement('label');
            lbl.innerHTML = '<span style="color:#64748b; font-weight:normal; margin-right:4px;">(' + totalSec + ')</span> SECCIÓN ' + letra;
            lbl.style.cssText = 'font-size:0.85rem; color:#475569; font-weight:600; cursor:pointer; user-select:none; margin:0;';
            lbl.htmlFor = inp.id;
            
            wrap.appendChild(lbl); wrap.appendChild(inp);
            grid.appendChild(wrap);
        }
        div.appendChild(grid);
        return div;
    }

    if (mat > 0) contenido.appendChild(_crearBloque('MATERNAL', 'maternal', mat, VAC['maternal']));
    if (pre > 0) contenido.appendChild(_crearBloque('PREESCOLAR', 'preescolar', pre, VAC['preescolar']));

    if (pri > 0) {
        const dist = _distribuirSecciones(pri, 6);
        const ORDINALES = ['1ER','2DO','3ER','4TO','5TO','6TO'];
        const dataPri = VAC['primaria'] ? JSON.parse(JSON.stringify(VAC['primaria'])) : {};
        for (let g = 0; g < 6; g++) {
            if (dist[g] === 0) continue;
            const divG = document.createElement('div');
            divG.style.cssText = 'margin-bottom:1rem; border:1px solid #fde68a; border-radius:8px; padding:0.85rem; background:#fffbeb;';
            const hG = document.createElement('h4');
            hG.textContent = ORDINALES[g] + ' GRADO';
            hG.style.cssText = 'margin:0 0 0.6rem; font-size:0.9rem; color:#92400e; font-weight:700;';
            divG.appendChild(hG);
            const gridG = document.createElement('div');
            gridG.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:0.4rem;';
            
            for (let s = 0; s < dist[g]; s++) {
                const letra = _letraSec(s, dist[g]);
                const clave = String(g + 1) + letra;
                const guardado = _getGuardado(dataPri, clave);
                const wrapG = document.createElement('div');
                wrapG.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:0.5rem; background:#fff; padding:0.5rem 0.8rem; border-radius:4px; border:1px solid #e2e8f0;';
                
                const ident = 'primaria-' + (g + 1) + letra;
                const inputsFemMas = document.querySelectorAll('.mat-input.mat-primaria[data-grupo="' + ident + '"]');
                let totalSec = 0;
                inputsFemMas.forEach(i => totalSec += (parseInt(i.value) || 0));
                
                const inpG = document.createElement('input');
                inpG.type = 'checkbox'; 
                inpG.checked = (guardado !== 0 && guardado !== undefined && guardado !== "");
                inpG.dataset.plan = 'primaria'; inpG.dataset.grado = String(g + 1); inpG.dataset.sec = letra;
                inpG.className = 'vac-input';
                inpG.style.cssText = 'width:18px; height:18px; cursor:pointer; accent-color:#f59e0b; margin:0 !important; padding:0 !important; flex-shrink:0;';
                inpG.id = 'chk-vac-pri-' + (g+1) + '-' + letra;
                
                const lblG = document.createElement('label');
                lblG.innerHTML = '<span style="color:#64748b; font-weight:normal; margin-right:4px;">(' + totalSec + ')</span> ' + ORDINALES[g] + ' ' + letra;
                lblG.style.cssText = 'font-size:0.85rem; color:#475569; font-weight:600; cursor:pointer; user-select:none; margin:0;';
                lblG.htmlFor = inpG.id;
                
                wrapG.appendChild(lblG); wrapG.appendChild(inpG);
                gridG.appendChild(wrapG);
            }
            divG.appendChild(gridG);
            contenido.appendChild(divG);
        }
    }

    const modal = document.getElementById('modal-vacantes');
    modal.style.display = 'flex';
}

// Control del Modal de Vacantes
document.getElementById('btn-cancelar-vacantes')?.addEventListener('click', () => {
    document.getElementById('modal-vacantes').style.display = 'none';
});

document.getElementById('btn-confirmar-vacantes')?.addEventListener('click', () => {
    const inputs = document.querySelectorAll('#vacantes-contenido .vac-input');
    const vacFinal = { maternal: {}, preescolar: {}, primaria: {} };

    inputs.forEach(inp => {
        const val = inp.type === 'checkbox' ? (inp.checked ? 1 : 0) : (parseInt(inp.value, 10) || 0);
        if (val <= 0) return;
        const plan = inp.dataset.plan || '';
        const sec = inp.dataset.sec || '';
        const grado = inp.dataset.grado || '';

        if (plan === 'maternal' || plan === 'preescolar') {
            vacFinal[plan][sec] = val;
        } else if (plan === 'primaria') {
            vacFinal.primaria[grado + sec] = val;
        }
    });

    ['maternal', 'preescolar', 'primaria'].forEach(k => {
        if (Object.keys(vacFinal[k]).length === 0) delete vacFinal[k];
    });

    window._VACANTES_TEMP = vacFinal;
    document.getElementById('modal-vacantes').style.display = 'none';
    
    
});

// Selector de Vacantes SI/NO
document.getElementById('toggle-vacantes')?.addEventListener('click', (e) => {
    if (e.target.tagName.toLowerCase() === 'button') {
        const val = e.target.getAttribute('data-val');
        
        // Estilos del toggle
        document.querySelectorAll('#toggle-vacantes button').forEach(b => {
            b.style.background = 'transparent';
            b.style.color = 'var(--primary-color)';
            b.style.fontWeight = 'normal';
        });
        e.target.style.background = val === 'SI' ? '#fef3c7' : '#dcfce7';
        e.target.style.color = val === 'SI' ? '#b45309' : '#166534';
        e.target.style.fontWeight = 'bold';

        if (val === 'NO') {
            window._VACANTES_TEMP = {};
        } else if (val === 'SI') {
            _abrirModalVacantes();
        }
    }
});

async function checkPlantelData(codigoDEA) {
  try {
    const docRef = doc(db, "planteles", codigoDEA);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      // Verificamos si los datos requeridos existen
      // Siempre mostrar la pantalla de datos del plantel (formulario de matrícula/secciones)
      // ya no enviamos al dashboard-view antiguo.
      currentPlantel = data;
      mostrarCandado(codigoDEA, data);
    } else {
      // El plantel no existe en la base de datos! (Caso de planteles faltantes en CSV)
      mostrarCandado(codigoDEA, null);
    }
  } catch (error) {
    console.error("Error validando plantel en Firestore:", error);
    console.warn("Mostrando candado por defecto debido a error (posible falta de permisos o sin conexión)");
    mostrarCandado(codigoDEA, null);
  }
}

async function mostrarCandado(codigoDEA, dataParcial) {
    showView('lock-screen');
    
    // Poblar Datos de Solo Lectura desde el Diccionario
    const dp = await findPlantel(codigoDEA);
    if (dp) {
        document.getElementById('inp-estado').value = "MÉRIDA";
        document.getElementById('inp-municipio').value = dp.municipio || '';
        document.getElementById('inp-parroquia').value = dp.parroquia || '';
        document.getElementById('inp-dependencia-plantel').value = dp.dependencia || '';
        document.getElementById('inp-codigo-plantel').value = dp.codigos?.plantel || codigoDEA;
        document.getElementById('inp-cod-estadistico').value = dp.codigos?.estadistico || '';
        
        let codDep = dp.codigos?.dependencia;
        if (Array.isArray(codDep)) codDep = codDep.join(', ');
        document.getElementById('inp-cod-dependencia').value = codDep || '';

        document.getElementById('inp-denominacion').value = dp.denominacion || '';
        document.getElementById('inp-nombre-nominal').value = dp['nombre-plantel']?.nominal || '';
        document.getElementById('inp-nuevo-eponimo').value = dp['nombre-plantel']?.['nuevo-eponimo'] || '';

        document.getElementById('inp-niveles-modalidades').value = dp.nivel || '';
        
        document.getElementById('inp-ubicacion').value = dp['ubicacion-geografica'] || '';
        document.getElementById('inp-turnos-plantel').value = dp['turno-plantel'] || '';
        document.getElementById('inp-matricula-total').value = dp.matricula?.total || '';
        
        // Mantener el oculto para no romper compatibilidad en otras funciones
        const hiddenInp = document.getElementById('inp-nombre-plantel');
        if (hiddenInp) hiddenInp.value = dp['nombre-plantel']?.nominal || '';
    } else {
        document.getElementById('inp-codigo-plantel').value = codigoDEA;
        const hiddenInp = document.getElementById('inp-nombre-plantel');
        if (hiddenInp) hiddenInp.value = "Plantel no encontrado";
        document.getElementById('inp-nombre-nominal').value = "Plantel no encontrado";
    }

    // Lógica dinámica de visibilidad basada en planes_estudio
    const planes = dp ? (dp["planes-estudio"] || {}) : {};
    let mostrarInicial = "20000" in planes;
    let mostrarPrimaria = "21000" in planes;
    let mostrarMediaGen = false;
    let mostrarMediaTec = false;

    Object.keys(planes).forEach(cod => {
        if (cod.startsWith("3")) mostrarMediaGen = true;
        if (cod.startsWith("4")) mostrarMediaTec = true;
    });

    // Fallback: Si el DEA no existe en el diccionario (planes vacíos), mostrar todos los bloques para no dejar la pantalla vacía
    if (Object.keys(planes).length === 0) {
        mostrarInicial = true;
        mostrarPrimaria = true;
        mostrarMediaGen = true;
        mostrarMediaTec = true;
        document.getElementById('inp-nombre-plantel').value = "Plantel no encontrado en diccionario local";
    }

    // Ocultar todos primero y resetear inputs
    ['bloque-inicial', 'bloque-primaria', 'bloque-mediageneral', 'bloque-mediatecnica'].forEach(id => {
        document.getElementById(id).style.display = 'none';
    });

    if (mostrarInicial) document.getElementById('bloque-inicial').style.display = 'block';
    if (mostrarPrimaria) document.getElementById('bloque-primaria').style.display = 'block';
    if (mostrarMediaGen) document.getElementById('bloque-mediageneral').style.display = 'block';
    if (mostrarMediaTec) document.getElementById('bloque-mediatecnica').style.display = 'block';

    // Carga de Secciones Dinámicas para Media (Pasando los guardados)
    const savedSeccionesPlanes = dataParcial ? (dataParcial["secciones-planes"] || {}) : {};
    _renderizarDetalleSecciones(planes, savedSeccionesPlanes);
      const savedMatricula = dataParcial ? dataParcial.matricula : null;
      _renderizarMatriculaMedia(planes, savedMatricula);
        
        const tieneBasica = ("20000" in planes) || ("21000" in planes);
        const contVacantes = document.getElementById('contenedor-pregunta-vacantes');
        if (contVacantes) {
            contVacantes.style.display = tieneBasica ? 'flex' : 'none';
        }
        
        /* button always enabled initially */
        

    if (dataParcial && dataParcial.matricula) {
        const mat = dataParcial.matricula;
        const b20 = mat.basica ? (mat.basica["20000"] || {}) : {};
        const b21 = mat.basica ? (mat.basica["21000"] || {}) : {};
        
        // --- 1. MATERNAL ---
        if (b20.materna) {
            const numMat = Object.keys(b20.materna).length;
            if (document.getElementById('inp-sec-maternal')) document.getElementById('inp-sec-maternal').value = numMat;
            _renderCajasInicial('maternal', numMat);
            Object.keys(b20.materna).forEach(letra => {
                const f = document.querySelector('.mat-input.mat-maternal[data-grupo="maternal-' + letra + '"][data-sexo="F"]');
                const m = document.querySelector('.mat-input.mat-maternal[data-grupo="maternal-' + letra + '"][data-sexo="M"]');
                if (f) f.value = b20.materna[letra].fem || 0;
                if (m) m.value = b20.materna[letra].mas || 0;
            });
        }
        
        // --- 2. PREESCOLAR ---
        if (b20.preescolar) {
            const numPre = Object.keys(b20.preescolar).length;
            if (document.getElementById('inp-sec-preescolar')) document.getElementById('inp-sec-preescolar').value = numPre;
            _renderCajasInicial('preescolar', numPre);
            Object.keys(b20.preescolar).forEach(letra => {
                const f = document.querySelector('.mat-input.mat-preescolar[data-grupo="preescolar-' + letra + '"][data-sexo="F"]');
                const m = document.querySelector('.mat-input.mat-preescolar[data-grupo="preescolar-' + letra + '"][data-sexo="M"]');
                if (f) f.value = b20.preescolar[letra].fem || 0;
                if (m) m.value = b20.preescolar[letra].mas || 0;
            });
        }

        // --- 3. PRIMARIA ---
        if (Object.keys(b21).length > 0) {
            let totalPri = 0;
            for (let g = 1; g <= 6; g++) {
                if (b21[String(g)]) totalPri += Object.keys(b21[String(g)]).length;
            }
            if (document.getElementById('inp-sec-primaria')) document.getElementById('inp-sec-primaria').value = totalPri;
            _renderCajasPrimaria(totalPri);
            for (let g = 1; g <= 6; g++) {
                if (!b21[String(g)]) continue;
                Object.keys(b21[String(g)]).forEach(letra => {
                    const ident = 'primaria-' + g + letra;
                    const f = document.querySelector('.mat-input.mat-primaria[data-grupo="' + ident + '"][data-sexo="F"]');
                    const m = document.querySelector('.mat-input.mat-primaria[data-grupo="' + ident + '"][data-sexo="M"]');
                    if (f) f.value = b21[String(g)][letra].fem || 0;
                    if (m) m.value = b21[String(g)][letra].mas || 0;
                });
            }
        }
        
        // --- 4. MEDIA GENERAL Y TECNICA ---
          // Now handled by _renderizarMatriculaMedia
    } else if (dataParcial && dataParcial.matricula_detalle) {
        // Fallback legado si el plantel aún no tiene el JSON dinámico v2
        const md = dataParcial.matricula_detalle;
        ['matFem', 'matMas', 'secMat', 'preFem', 'preMas', 'secPre',
         'priFem', 'priMas', 'secPri', 'mgFem', 'mgMas', 'secMg', 'mtFem', 'mtMas', 'secMt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = md[id] || 0;
        });
    }
    
    // Restaurar vacantes
    if (dataParcial && dataParcial.vacantes !== undefined && Object.keys(dataParcial.vacantes).length > 0) {
        window._VACANTES_TEMP = dataParcial.vacantes;
        const keys = Object.keys(window._VACANTES_TEMP);
        // Si hay vacantes con datos, marcamos el toggle visualmente
        if (keys.length > 0 && keys.some(k => Object.keys(window._VACANTES_TEMP[k]).length > 0)) {
            const btnSi = document.querySelector('#toggle-vacantes button[data-val="SI"]');
            if (btnSi) btnSi.click();
        } else {
            const btnNo = document.querySelector('#toggle-vacantes button[data-val="NO"]');
            if (btnNo) btnNo.click();
        }
    }
    
    // Forzar recálculo
    document.getElementById('contenedor-matricula')?.dispatchEvent(new Event('input', { bubbles: true }));

    // Guardar los datos cuando el director llene el form
    const form = document.getElementById('plantel-form');
    if (form) {
      form.onsubmit = async (e) => {
          e.preventDefault();
          const btn = form.querySelector('button[type="submit"]');
          btn.textContent = "Guardando...";
          btn.disabled = true;

          const matTotal = parseInt(document.getElementById('lbl-matricula-total')?.textContent) || 0;
          
          let secTotal = 0;
          secTotal += parseInt(document.getElementById('inp-sec-maternal')?.value) || 0;
          secTotal += parseInt(document.getElementById('inp-sec-preescolar')?.value) || 0;
          secTotal += parseInt(document.getElementById('inp-sec-primaria')?.value) || 0;
          document.querySelectorAll('.sec-anio-input').forEach(inp => {
              const b1 = inp.closest('div[id^="bloque-"]'); const b2 = inp.closest('#cont-secciones-detalle'); if ((b1 && b1.style.display !== 'none') || (b2 && b2.style.display !== 'none')) {
                  secTotal += parseInt(inp.value) || 0;
              }
          });
          
          
            // Check if incomplete
            if (matTotal === 0 && secTotal === 0 && !window._forceSaveIncompleta) {
                const modalInc = document.getElementById('modal-confirm-incompleta');
                if (modalInc) modalInc.style.display = 'flex';
                btn.textContent = "Guardar Datos y Continuar";
                btn.disabled = false;
                return; // abort this save
            }
            window._forceSaveIncompleta = false;
const _dynMG = { "total-med-fem": 0, "total-med-mas": 0, "total-med-gen": 0 };
const _dynMT = { "total-med-fem": 0, "total-med-mas": 0, "total-med-tec": 0 };
const seccionesPlanes = {};
          const matricula = {
              "basica": {
                  "20000": {
                      "materna": {},
                      "total-mat-mas": 0,
                      "total-mat-fem": 0,
                      "total-mat": 0,
                      "preescolar": {},
                      "total-pre-mas": 0,
                      "total-pre-fem": 0,
                      "total-pre": 0,
                      "total-20000": 0
                  },
                  "21000": {
                      "1": {}, "2": {}, "3": {}, "4": {}, "5": {}, "6": {},
                      "total-21000-mas": 0,
                      "total-21000-fem": 0,
                      "total-21000": 0
                  }
              },
              "media": {
                    "media-general": _dynMG,
                    "media-tecnica": _dynMT,
                    "total-gen-med": {
                        "fem": 0,
                        "mas": 0,
                        "total": 0
                    }
                },
              "total": matTotal
          };

          // 1. MATERNAL Y PREESCOLAR
          ['maternal', 'preescolar'].forEach(tipo => {
              const inputs = document.querySelectorAll('.mat-input.mat-' + tipo);
              if (inputs.length > 0) {
                  if (!seccionesPlanes["20000"]) seccionesPlanes["20000"] = {};
              }
              inputs.forEach(inp => {
                  const b1 = inp.closest('div[id^="bloque-"]'); const b2 = inp.closest('#cont-secciones-detalle'); if ((b1 && b1.style.display !== 'none') || (b2 && b2.style.display !== 'none')) {
                      const grupo = inp.dataset.grupo; // ej: "maternal-A"
                      const secLetra = grupo.split('-')[1];
                      const val = parseInt(inp.value) || 0;
                      const isFem = inp.dataset.sexo === 'F';
                      
                      if (!seccionesPlanes["20000"]._vistas) seccionesPlanes["20000"]._vistas = new Set();
                      if (!seccionesPlanes["20000"]._vistas.has(grupo)) {
                          seccionesPlanes["20000"]._vistas.add(grupo);
                          seccionesPlanes["20000"][secLetra] = (seccionesPlanes["20000"][secLetra] || 0) + 1;
                      }

                      const key = tipo === 'maternal' ? 'materna' : 'preescolar';
                      if (!matricula.basica["20000"][key][secLetra]) {
                          matricula.basica["20000"][key][secLetra] = { mas: 0, fem: 0 };
                      }
                      
                      if (isFem) {
                          matricula.basica["20000"][key][secLetra].fem += val;
                          matricula.basica["20000"]["total-" + tipo.substring(0,3) + "-fem"] += val;
                      } else {
                          matricula.basica["20000"][key][secLetra].mas += val;
                          matricula.basica["20000"]["total-" + tipo.substring(0,3) + "-mas"] += val;
                      }
                      matricula.basica["20000"]["total-" + tipo.substring(0,3)] += val;
                      matricula.basica["20000"]["total-20000"] += val;
                  }
              });
              
              // Inyectar vacantes copiando matrícula (Plazas Docentes Vacantes)
              const pref = tipo.substring(0,3); // 'mat' o 'pre'
              const vacPlan = window._VACANTES_TEMP?.[tipo] || {};
              const key = tipo === 'maternal' ? 'materna' : 'preescolar';
              
              for (const secLetra of Object.keys(matricula.basica["20000"][key] || {})) {
                  if (vacPlan[secLetra] === 1) { // Checkbox marcado en el modal
                      if (!matricula.basica["20000"][key].vacantes) {
                          matricula.basica["20000"][key].vacantes = {};
                          matricula.basica["20000"][key]["total-vac-" + pref + "-mas"] = 0;
                          matricula.basica["20000"][key]["total-vac-" + pref + "-fem"] = 0;
                          matricula.basica["20000"][key]["total-vac-" + pref] = 0;
                      }
                      if (matricula.basica["20000"]["total-vac-20000-mas"] === undefined) {
                          matricula.basica["20000"]["total-vac-20000-mas"] = 0;
                          matricula.basica["20000"]["total-vac-20000-fem"] = 0;
                          matricula.basica["20000"]["total-vac-20000"] = 0;
                      }
                      
                      const matSec = matricula.basica["20000"][key][secLetra];
                      matricula.basica["20000"][key].vacantes[secLetra] = { mas: matSec.mas, fem: matSec.fem };
                      
                      matricula.basica["20000"][key]["total-vac-" + pref + "-mas"] += matSec.mas;
                      matricula.basica["20000"][key]["total-vac-" + pref + "-fem"] += matSec.fem;
                      matricula.basica["20000"][key]["total-vac-" + pref] += (matSec.mas + matSec.fem);
                      
                      matricula.basica["20000"]["total-vac-20000-mas"] += matSec.mas;
                      matricula.basica["20000"]["total-vac-20000-fem"] += matSec.fem;
                      matricula.basica["20000"]["total-vac-20000"] += (matSec.mas + matSec.fem);
                  }
              }
          });

          // 2. PRIMARIA
          const inputsPri = document.querySelectorAll('.mat-input.mat-primaria');
          if (inputsPri.length > 0) {
              if (!seccionesPlanes["21000"]) seccionesPlanes["21000"] = {};
          }
          inputsPri.forEach(inp => {
              const b1 = inp.closest('div[id^="bloque-"]'); const b2 = inp.closest('#cont-secciones-detalle'); if ((b1 && b1.style.display !== 'none') || (b2 && b2.style.display !== 'none')) {
                  const grupo = inp.dataset.grupo; // ej: "primaria-1A"
                  const match = grupo.match(/primaria-(\d)([A-Z])/);
                  if (match) {
                      const grado = match[1];
                      const secLetra = match[2];
                      const val = parseInt(inp.value) || 0;
                      const isFem = inp.dataset.sexo === 'F';

                      if (!seccionesPlanes["21000"]._vistas) seccionesPlanes["21000"]._vistas = new Set();
                      if (!seccionesPlanes["21000"]._vistas.has(grupo)) {
                          seccionesPlanes["21000"]._vistas.add(grupo);
                          seccionesPlanes["21000"][secLetra] = (seccionesPlanes["21000"][secLetra] || 0) + 1;
                      }
                      
                      if (!matricula.basica["21000"][grado][secLetra]) {
                          matricula.basica["21000"][grado][secLetra] = { mas: 0, fem: 0 };
                      }
                      
                      if (isFem) {
                          matricula.basica["21000"][grado][secLetra].fem += val;
                          matricula.basica["21000"]["total-21000-fem"] += val;
                      } else {
                          matricula.basica["21000"][grado][secLetra].mas += val;
                          matricula.basica["21000"]["total-21000-mas"] += val;
                      }
                      matricula.basica["21000"]["total-21000"] += val;
                      
                      // Totales dinámicos de sección en Primaria
                      const tKeyMas = "total-mat-seccion" + secLetra.toLowerCase() + "-mas";
                      const tKeyFem = "total-mat-seccion" + secLetra.toLowerCase() + "-fem";
                      const tKeyTot = "total-mat-seccion" + secLetra.toLowerCase();
                      
                      if (matricula.basica["21000"][grado][tKeyMas] === undefined) {
                          matricula.basica["21000"][grado][tKeyMas] = 0;
                          matricula.basica["21000"][grado][tKeyFem] = 0;
                          matricula.basica["21000"][grado][tKeyTot] = 0;
                      }
                      
                      if (isFem) {
                          matricula.basica["21000"][grado][tKeyFem] += val;
                      } else {
                          matricula.basica["21000"][grado][tKeyMas] += val;
                      }
                      matricula.basica["21000"][grado][tKeyTot] += val;
                  }
              }
          });

          // Calcular Vacantes de Primaria (Plazas Docentes Vacantes)
          const vacPri = window._VACANTES_TEMP?.primaria || {};
          for (let g = 1; g <= 6; g++) {
              const gradoStr = String(g);
              if (!matricula.basica["21000"][gradoStr] || Object.keys(matricula.basica["21000"][gradoStr]).length === 0) continue;
              
              for (const secLetra of Object.keys(matricula.basica["21000"][gradoStr])) {
                  if (secLetra.length !== 1) continue; // Omitir totales
                  
                  if (vacPri[gradoStr + secLetra] === 1) { // Checkbox marcado
                      if (!matricula.basica["21000"][gradoStr].vacantes) {
                          matricula.basica["21000"][gradoStr].vacantes = {};
                      }
                      if (matricula.basica["21000"]["total-vac-21000-mas"] === undefined) {
                          matricula.basica["21000"]["total-vac-21000-mas"] = 0;
                          matricula.basica["21000"]["total-vac-21000-fem"] = 0;
                          matricula.basica["21000"]["total-vac-21000"] = 0;
                      }
                      
                      const tKeyVMas = "total-vac-mat-seccion" + secLetra.toLowerCase() + "-mas";
                      const tKeyVFem = "total-vac-mat-seccion" + secLetra.toLowerCase() + "-fem";
                      const tKeyVTot = "total-vac-mat-seccion" + secLetra.toLowerCase();
                      
                      if (matricula.basica["21000"][gradoStr][tKeyVMas] === undefined) {
                          matricula.basica["21000"][gradoStr][tKeyVMas] = 0;
                          matricula.basica["21000"][gradoStr][tKeyVFem] = 0;
                          matricula.basica["21000"][gradoStr][tKeyVTot] = 0;
                      }
                      
                      const matSec = matricula.basica["21000"][gradoStr][secLetra];
                      matricula.basica["21000"][gradoStr].vacantes[secLetra] = { mas: matSec.mas, fem: matSec.fem };
                      
                      matricula.basica["21000"][gradoStr][tKeyVMas] += matSec.mas;
                      matricula.basica["21000"][gradoStr][tKeyVFem] += matSec.fem;
                      matricula.basica["21000"][gradoStr][tKeyVTot] += (matSec.mas + matSec.fem);
                      
                      matricula.basica["21000"]["total-vac-21000-mas"] += matSec.mas;
                      matricula.basica["21000"]["total-vac-21000-fem"] += matSec.fem;
                      matricula.basica["21000"]["total-vac-21000"] += (matSec.mas + matSec.fem);
                  }
              }
          }

          // 3. MEDIA (Secciones)
          let codMg = null;
          let codMt = null;
          document.querySelectorAll('.sec-anio-input').forEach(inp => {
              const b1 = inp.closest('div[id^="bloque-"]'); const b2 = inp.closest('#cont-secciones-detalle'); if ((b1 && b1.style.display !== 'none') || (b2 && b2.style.display !== 'none')) {
                  const plan = inp.dataset.plan;
                  const anio = inp.dataset.anio;
                  const val = parseInt(inp.value) || 0;
                  
                  if (!seccionesPlanes[plan]) seccionesPlanes[plan] = {};
                  seccionesPlanes[plan][anio] = val;

                  if (plan.startsWith('3')) codMg = plan;
                  if (plan.startsWith('4')) codMt = plan;
              }
          });

          // Fallbacks en caso de DEA no catalogado
          if (!codMg) codMg = "31059";
          if (!codMt) codMt = "41052";

          // 4. MEDIA (Matrícula Global)
          if (document.getElementById('bloque-mediageneral').style.display !== 'none') {
                document.querySelectorAll('.dyn-mg-fem').forEach(inp => {
                    const plan = inp.dataset.plan;
                    const fVal = parseInt(inp.value || 0);
                    const mInp = document.querySelector(`.dyn-mg-mas[data-plan="${plan}"]`);
                    const mVal = mInp ? parseInt(mInp.value || 0) : 0;
                    
                    if (matricula.media["media-general"][plan]) {
                        matricula.media["media-general"][plan].fem += fVal;
                        matricula.media["media-general"][plan].mas += mVal;
                        matricula.media["media-general"][plan].total += (fVal + mVal);
                    }
                    if (matricula.media["media-general"][`total-med-${plan}-fem`] !== undefined) {
                        matricula.media["media-general"][`total-med-${plan}-fem`] += fVal;
                        matricula.media["media-general"][`total-med-${plan}-mas`] += mVal;
                        matricula.media["media-general"][`total-med-${plan}`] += (fVal + mVal);
                    } else {
                        matricula.media["media-general"][`total-med-${plan}-fem`] = fVal;
                        matricula.media["media-general"][`total-med-${plan}-mas`] = mVal;
                        matricula.media["media-general"][`total-med-${plan}`] = (fVal + mVal);
                    }

                    matricula.media["media-general"]["total-med-fem"] += fVal;
                    matricula.media["media-general"]["total-med-mas"] += mVal;
                    matricula.media["media-general"]["total-med-gen"] += (fVal + mVal);
                });
            }
  
            if (document.getElementById('bloque-mediatecnica').style.display !== 'none') {
                document.querySelectorAll('.dyn-mt-fem').forEach(inp => {
                    const plan = inp.dataset.plan;
                    const fVal = parseInt(inp.value || 0);
                    const mInp = document.querySelector(`.dyn-mt-mas[data-plan="${plan}"]`);
                    const mVal = mInp ? parseInt(mInp.value || 0) : 0;
                    
                    if (matricula.media["media-tecnica"][plan]) {
                        matricula.media["media-tecnica"][plan].fem += fVal;
                        matricula.media["media-tecnica"][plan].mas += mVal;
                        matricula.media["media-tecnica"][plan].total += (fVal + mVal);
                    }
                    if (matricula.media["media-tecnica"][`total-med-${plan}-fem`] !== undefined) {
                        matricula.media["media-tecnica"][`total-med-${plan}-fem`] += fVal;
                        matricula.media["media-tecnica"][`total-med-${plan}-mas`] += mVal;
                        matricula.media["media-tecnica"][`total-med-${plan}`] += (fVal + mVal);
                    } else {
                        matricula.media["media-tecnica"][`total-med-${plan}-fem`] = fVal;
                        matricula.media["media-tecnica"][`total-med-${plan}-mas`] = mVal;
                        matricula.media["media-tecnica"][`total-med-${plan}`] = (fVal + mVal);
                    }

                    matricula.media["media-tecnica"]["total-med-fem"] += fVal;
                    matricula.media["media-tecnica"]["total-med-mas"] += mVal;
                    matricula.media["media-tecnica"]["total-med-tec"] += (fVal + mVal);
                });
            }

            matricula.media["total-gen-med"].fem = matricula.media["media-general"]["total-med-fem"] + matricula.media["media-tecnica"]["total-med-fem"];
          matricula.media["total-gen-med"].mas = matricula.media["media-general"]["total-med-mas"] + matricula.media["media-tecnica"]["total-med-mas"];
          matricula.media["total-gen-med"].total = matricula.media["total-gen-med"].fem + matricula.media["total-gen-med"].mas;

          try {
              const docRef = doc(db, "planteles", codigoDEA);
              
              delete seccionesPlanes["20000"]?._vistas;
              delete seccionesPlanes["21000"]?._vistas;
              // --- ESCOBA DIGITAL (Zero-Waste) ---
              const sweepZeros = (obj) => {
                  Object.keys(obj).forEach(key => {
                      if (obj[key] === 0) {
                          delete obj[key];
                      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                          sweepZeros(obj[key]);
                          if (Object.keys(obj[key]).length === 0) {
                              delete obj[key];
                          }
                      }
                  });
              };
              sweepZeros(matricula);
              sweepZeros(seccionesPlanes);
              // -----------------------------------
              
              const payload = {
                  secciones: deleteField(),
                  "secciones-planes": seccionesPlanes,
                  matricula: matricula,
                  vacantes: deleteField(),
                  datos_completados: true,
                  ultima_actualizacion: new Date().toISOString()
              };
              
              // Reemplazo Total Exclusivo
              await safeSetDoc(docRef, payload, { mergeFields: ['secciones', 'secciones-planes', 'matricula', 'vacantes', 'datos_completados', 'ultima_actualizacion'] });
              
              // showView('dashboard-view'); // Removido por el motor dinámico
              showToast("¡Datos del plantel actualizados con éxito!", "success");
              
          } catch (error) {
              console.error("Error guardando el plantel:", error);
              showToast("Ocurrió un error al guardar los datos.", "error");
                  } finally {
            if (btn) {
                btn.textContent = "Guardar y Desbloquear Sistema";
                btn.disabled = false;
            }
        }
      };
    }
}

// --- Cerrar Sesión ---
document.getElementById('btn-logout')?.addEventListener('click', async () => {
    await signOut(auth);
});
document.getElementById('btn-logout-lock')?.addEventListener('click', async () => {
    await signOut(auth);
});
document.getElementById('btn-logout-munic')?.addEventListener('click', async () => {
    await signOut(auth);
});
document.getElementById('btn-logout-admin')?.addEventListener('click', async () => {
    await signOut(auth);
});

// --- HAMBURGER MENU LOGIC (GLOBAL) ---
const btnHamburger = document.getElementById('btn-hamburger');
const sidebar = document.getElementById('admin-sidebar');
const overlay = document.getElementById('admin-sidebar-overlay');
const mainContent = document.getElementById('admin-main');

window.closeSidebar = function() {
   if(!sidebar) return;
   sidebar.style.transform = 'translateX(-100%)';
   if(overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.style.display = 'none', 300);
   }
   if(mainContent) {
      mainContent.style.opacity = '1';
      mainContent.style.pointerEvents = 'auto';
   }
};

if (btnHamburger) {
   btnHamburger.addEventListener('click', () => {
      if(!sidebar) return;
      const isClosed = sidebar.style.transform === 'translateX(-100%)' || sidebar.style.transform === '';
      if (isClosed) {
         sidebar.style.transform = 'translateX(0)';
         if(overlay) {
            overlay.style.display = 'block';
            setTimeout(() => overlay.style.opacity = '1', 10);
         }
         if(mainContent) {
            mainContent.style.opacity = '0.5';
            mainContent.style.pointerEvents = 'none';
         }
      } else {
         window.closeSidebar();
      }
   });
}

if (overlay) overlay.addEventListener('click', window.closeSidebar);


// --- Modal Declaración Incompleta ---
document.getElementById('btn-cancelar-incompleta')?.addEventListener('click', () => {
    document.getElementById('modal-confirm-incompleta').style.display = 'none';
});
document.getElementById('btn-aceptar-incompleta')?.addEventListener('click', () => {
    document.getElementById('modal-confirm-incompleta').style.display = 'none';
    window._forceSaveIncompleta = true;
    
    const form = document.getElementById('plantel-form');
    if (form) {
        // Create and dispatch a submit event
        form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    }
});
