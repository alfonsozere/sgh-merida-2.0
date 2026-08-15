
window.showLoading = (msg) => {
    const modal = document.getElementById('global-loading-modal');
    if(modal) {
        document.getElementById('global-loading-text').textContent = msg || 'Cargando...';
        modal.style.display = 'flex';
    }
};
window.hideLoading = () => {
    const modal = document.getElementById('global-loading-modal');
    if(modal) modal.style.display = 'none';
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
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
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
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
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
        });
    }
}

// --- Lógica Central de Autenticación (Guardián) ---
initAuth(auth, db, {
  onLogout: () => {
    localStorage.removeItem('sgh_catalogos');
    sessionStorage.removeItem('sgh_despliegue_config');
    document.getElementById('login-form')?.reset();
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
        showView('dashboard-view');
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
        window.hideLoading();
        }
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Registrarse';
        const formElements = document.getElementById('register-form').querySelectorAll('input, select');
    formElements.forEach(el => el.disabled = false);
    const linkLogin = document.getElementById('link-go-login');
    if (linkLogin) { linkLogin.style.pointerEvents = 'auto'; linkLogin.style.opacity = '1'; }
    }
});

// --- Lógica del "Candado de Navegación" ---
// Cálculo automático de totales
document.getElementById('contenedor-matricula')?.addEventListener('input', (e) => {
    if (e.target.tagName.toLowerCase() === 'input') {
        let matTotal = 0;
        let secTotal = 0;
        
        const sumInputs = (selector) => {
            let sum = 0;
            document.querySelectorAll(selector).forEach(inp => {
                if (inp.closest('div[id^="bloque-"]').style.display !== 'none') {
                    sum += parseInt(inp.value || 0);
                }
            });
            return sum;
        };

        // Subtotales
        const totIni = sumInputs('.mat-inicial');
        const totPri = sumInputs('.mat-primaria');
        const totMed = sumInputs('.mat-media');
        const totTec = sumInputs('.mat-tecnica');
        
        if(document.getElementById('tot-inicial')) document.getElementById('tot-inicial').textContent = totIni;
        if(document.getElementById('tot-primaria')) document.getElementById('tot-primaria').textContent = totPri;
        if(document.getElementById('tot-media')) document.getElementById('tot-media').textContent = totMed;
        if(document.getElementById('tot-tecnica')) document.getElementById('tot-tecnica').textContent = totTec;

        // Sumar todos los inputs de matrícula
        document.querySelectorAll('.mat-input').forEach(input => {
            if (input.closest('div[id^="bloque-"]').style.display !== 'none') {
                matTotal += parseInt(input.value || 0);
            }
        });
        
        // Sumar todos los inputs de secciones
        document.querySelectorAll('.sec-input').forEach(input => {
            if (input.closest('div[id^="bloque-"]').style.display !== 'none') {
                secTotal += parseInt(input.value || 0);
            }
        });
        
        document.getElementById('lbl-matricula-total').textContent = matTotal;
        document.getElementById('lbl-secciones-total').textContent = secTotal;
    }
});

// --- Lógicas Algorítmicas Migradas de sgh_gas ---
window._VACANTES_TEMP = {};

function _letraSec(s, nTotal) {
    return nTotal === 1 ? 'U' : String.fromCharCode(65 + s);
}

function _distribuirSecciones(numSec, numGrados) {
    const base = Math.floor(numSec / numGrados);
    const resto = numSec % numGrados;
    const dist = [];
    for (let g = 0; g < numGrados; g++) {
        dist.push(base + (g < resto ? 1 : 0));
    }
    return dist;
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

function _renderizarDetalleSecciones(planes) {
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
    
    // Asumimos un objeto vacío de secciones previas
    const seccionesGuardadas = {}; 
    
    mediaPlanes.forEach(plan => {
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
        
        html += '</div></div>';
    });
    
    contDinamico.innerHTML = html;
}

async function _abrirModalVacantes() {
    let mat = parseInt(document.getElementById('secMat')?.value) || 0;
    let pre = parseInt(document.getElementById('secPre')?.value) || 0;
    let pri = parseInt(document.getElementById('secPri')?.value) || 0;

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
            wrap.style.cssText = 'display:flex; flex-direction:column; gap:0.2rem;';
            const lbl = document.createElement('label');
            lbl.textContent = 'SECCIÓN ' + letra;
            lbl.style.cssText = 'font-size:0.8rem; color:#78350f; font-weight:600;';
            const inp = document.createElement('input');
            inp.type = 'number'; inp.min = '0'; inp.value = String(guardado);
            inp.dataset.plan = keyPlan; inp.dataset.sec = letra;
            inp.className = 'vac-input';
            inp.style.cssText = 'padding:0.4rem; font-size:0.9rem; text-align:center; border: 1px solid #f59e0b; border-radius: 4px;';
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
                wrapG.style.cssText = 'display:flex; flex-direction:column; gap:0.2rem;';
                const lblG = document.createElement('label');
                lblG.textContent = ORDINALES[g] + ' GRADO ' + letra;
                lblG.style.cssText = 'font-size:0.78rem; color:#78350f; font-weight:600;';
                const inpG = document.createElement('input');
                inpG.type = 'number'; inpG.min = '0'; inpG.value = String(guardado);
                inpG.dataset.plan = 'primaria'; inpG.dataset.grado = String(g + 1); inpG.dataset.sec = letra;
                inpG.className = 'vac-input';
                inpG.style.cssText = 'padding:0.35rem; font-size:0.88rem; text-align:center; border: 1px solid #f59e0b; border-radius: 4px;';
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
        const val = parseInt(inp.value, 10) || 0;
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
    
    // Habilitar botón de guardar
    const btnGuardar = document.getElementById('btn-guardar-matricula');
    if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.style.cursor = 'pointer';
        btnGuardar.style.opacity = '1';
    }
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

        const btnGuardar = document.getElementById('btn-guardar-matricula');
        if (val === 'NO') {
            window._VACANTES_TEMP = {};
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.style.cursor = 'pointer';
                btnGuardar.style.opacity = '1';
            }
        } else if (val === 'SI') {
            if (btnGuardar) {
                btnGuardar.disabled = true;
                btnGuardar.style.cursor = 'not-allowed';
                btnGuardar.style.opacity = '0.5';
            }
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
      if (data.matricula !== undefined && data.secciones !== undefined && data.datos_completados === true) {
        // Todo en orden, ocultar candado
        currentPlantel = data;
        showView('dashboard-view');
      } else {
        // Faltan datos, mostrar candado
        mostrarCandado(codigoDEA, data);
      }
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
        document.getElementById('inp-codigo-plantel').value = codigoDEA;
        document.getElementById('inp-nombre-plantel').value = dp.nombre_plantel || '';
        document.getElementById('inp-estado').value = "MERIDA";
        document.getElementById('inp-municipio').value = dp.municipio || dp.municipio_nombre || '';
        document.getElementById('inp-dependencia-plantel').value = dp.dependencia || '';
        document.getElementById('inp-turnos-plantel').value = dp.turno || '';
    } else {
        document.getElementById('inp-codigo-plantel').value = codigoDEA;
        document.getElementById('inp-nombre-plantel').value = "Plantel no encontrado";
    }

    // Lógica dinámica de visibilidad basada en planes_estudio
    const planes = dp ? (dp.planes_estudio || {}) : {};
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

    // Renderizar secciones dinámicas si hay media
    _renderizarDetalleSecciones(planes);

    if (dataParcial && dataParcial.matricula_detalle) {
        // Restaurar matrícula si ya existe
        const md = dataParcial.matricula_detalle;
        ['matFem', 'matMas', 'secMat', 'preFem', 'preMas', 'secPre',
         'priFem', 'priMas', 'secPri', 'mgFem', 'mgMas', 'secMg', 'mtFem', 'mtMas', 'secMt'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = md[id] || 0;
        });
    }
    
    // Restaurar vacantes
    if (dataParcial && dataParcial.vacantes !== undefined) {
        document.getElementById('inp-vacantes').value = dataParcial.vacantes;
    }
    
    // Forzar recálculo
    document.getElementById('matFem')?.dispatchEvent(new Event('input', { bubbles: true }));

    // Guardar los datos cuando el director llene el form
    const form = document.getElementById('plantel-form');
    if (form) {
      form.onsubmit = async (e) => {
          e.preventDefault();
          const btn = form.querySelector('button[type="submit"]');
          btn.textContent = "Guardando...";
          btn.disabled = true;

          const matTotal = parseInt(document.getElementById('lbl-matricula-total').textContent);
          const secTotal = parseInt(document.getElementById('lbl-secciones-total').textContent);
          
          // Recopilar detalle básico
          const detalle = {};
          document.querySelectorAll('.mat-input, .sec-input').forEach(input => {
              detalle[input.id] = parseInt(input.value || 0);
          });

          // Recopilar secciones por año dinámicas (Media)
          const seccionesPorAnio = {};
          document.querySelectorAll('.sec-anio-input').forEach(inp => {
              const plan = inp.dataset.plan;
              const anio = inp.dataset.anio;
              const val = parseInt(inp.value) || 0;
              if (!seccionesPorAnio[plan]) seccionesPorAnio[plan] = {};
              seccionesPorAnio[plan][anio] = val;
          });

          try {
              const docRef = doc(db, "planteles", codigoDEA);
              
              const payload = {
                  matricula: matTotal,
                  secciones: secTotal,
                  vacantes: window._VACANTES_TEMP || {},
                  matricula_detalle: detalle,
                  secciones_por_anio: seccionesPorAnio,
                  datos_completados: true,
                  ultima_actualizacion: new Date().toISOString()
              };
              
              await safeSetDoc(docRef, payload, { merge: true });
              
              // Desbloqueamos
              showView('dashboard-view');
              showToast("¡Datos del plantel actualizados con éxito!", "success");
              
          } catch (error) {
              console.error("Error guardando el plantel:", error);
              showToast("Ocurrió un error al guardar los datos.", "error");
          } finally {
              btn.textContent = "Guardar y Desbloquear Sistema";
              btn.disabled = false;
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
