import './dashboard.css'
import { db, auth, secondaryAuth, secondaryDb } from './firebase.js';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, getCountFromServer } from "firebase/firestore";
import { signOut, onAuthStateChanged, createUserWithEmailAndPassword } from "firebase/auth";
import { initAdminPanel, MUNICIPIOS_MERIDA } from "./adminManager.js";
import { initApprovalPanel } from "./approvalManager.js";

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
  // Escuchar estado de autenticación para cargar perfil
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const docRef = doc(db, 'usuarios', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const perfil = docSnap.data();

          if (perfil.estado_aprobacion !== 'APROBADO') {
            showToast('Acceso denegado o revocado. Contacte al administrador.', 'error');
            await signOut(auth);
            window.location.href = '/';
            return;
          }
          
          // Verificar Mega-Documento en caché (fallback para recargas)
          if (!localStorage.getItem('sgh_catalogos')) {
            try {
              const catalogosRef = doc(db, 'sistema', 'catalogos_maestros');
              const catalogosSnap = await getDoc(catalogosRef);
              if (catalogosSnap.exists()) {
                localStorage.setItem('sgh_catalogos', JSON.stringify(catalogosSnap.data()));
              }
            } catch (err) {
              console.error('Error cargando catálogos maestros en dashboard:', err);
            }
          }
          
          // Inyectar datos en la UI
          if (window.poblarSelectoresDesdeCache) {
            window.poblarSelectoresDesdeCache();
          }
          
          // Actualizar UI con datos reales
          const defaultName = perfil.nombre || perfil.email.split('@')[0].toUpperCase();
          document.getElementById('user-name').innerText = defaultName;
          
          const btnVip = document.getElementById('btn-vip-nav');
          const btnPersonal = document.getElementById('btn-personal-nav');
          const roleBadge = document.getElementById('user-role-badge');
          
          if (perfil.rol === 'superadmin') {
            btnVip.style.display = 'block';
            btnPersonal.style.display = 'none'; // Altos mandos no llenan nómina
            const navAdmin = document.getElementById('nav-group-admin');
            if (navAdmin) navAdmin.style.display = 'block';
            
            roleBadge.innerText = perfil.departamento || 'Super Usuario';
            document.getElementById('subtitulo-resumen').innerText = perfil.ubicacion || `Vista Global: Estado Mérida`;
            
            // Cargar lista dinámica de usuarios en el cargo
            loadVipUsers();
          } else if (perfil.rol === 'zonadmin') {
            btnVip.style.display = 'none'; // zonadmin ya no crea a otros VIP
            btnPersonal.style.display = 'none';
            roleBadge.innerText = perfil.departamento || 'Jefe de Zona';
            document.getElementById('subtitulo-resumen').innerText = perfil.ubicacion || `Vista Global: Estado Mérida`;
            } else if (perfil.rol === 'munadmin') {
            btnVip.style.display = 'none'; // munadmin no crea a otros
            btnPersonal.style.display = 'none';
            roleBadge.innerText = perfil.departamento || 'Jefe de Municipio';
            document.getElementById('subtitulo-resumen').innerText = perfil.ubicacion || `Vista Municipal: ${perfil.jerarquia?.municipio || ''}`;
          } else {
            // plaadmin
            btnVip.style.display = 'none';
            btnPersonal.style.display = 'block';
            roleBadge.innerText = perfil.departamento || 'Director de Plantel';
            document.getElementById('subtitulo-resumen').innerText = perfil.ubicacion || `Vista Local: Plantel ${perfil.jerarquia?.plantel_codigo || ''}`;
            
            // Consultar catálogo local en JSON para obtener los datos completos del plantel
            if (perfil.jerarquia?.plantel_codigo) {
              try {
                // Primero usar el nombre del usuario o auth
                document.getElementById('user-name').innerText = perfil.jerarquia.plantel_codigo;
                
                // Conectar directamente a la colección 'planteles' recién creada (Costo: 1 lectura)
                window.currentPlantelCode = perfil.jerarquia.plantel_codigo;
                const plantelRef = doc(db, 'planteles', perfil.jerarquia.plantel_codigo);
                const plantelSnap = await getDoc(plantelRef);
                
                if (plantelSnap.exists()) {
                  const pData = plantelSnap.data();
                  
                  const nombrePlantel = pData['nombre-plantel']?.nominal || pData['nombre-plantel']?.['nuevo-eponimo'] || defaultName;
                  document.getElementById('user-name').innerText = nombrePlantel;
                  document.getElementById('subtitulo-resumen').innerText = perfil.ubicacion || `${pData.municipio || ''} - ${perfil.jerarquia.plantel_codigo}`;
                  
                  // Mapeo UI con las nuevas llaves estandarizadas
                  document.getElementById('info-estado').innerText = 'MÉRIDA'; // El estado no viene en el Excel, asumimos Mérida
                  document.getElementById('info-municipio').innerText = pData.municipio || '...';

                  // Precargar Matrícula (Pares Dinámicos)
                  const setVal = (id, val) => { const el = document.getElementById(id); if (el && val) el.value = val; };
                  
                  const matSecs = pData['secciones-planes']?.['20000']?.maternal || {};
                  const preSecs = pData['secciones-planes']?.['20000']?.preescolar || {};
                  const priSecs = pData['secciones-planes']?.['21000'] || {};
                  
                  const numMat = Object.keys(matSecs).filter(k => k !== 'total').length;
                  const numPre = Object.keys(preSecs).filter(k => k !== 'total').length;
                  const numPri = Object.keys(priSecs).filter(k => k !== 'total').length;

                  if (numMat > 0) {
                    setVal('numSecMat', numMat);
                    if (typeof window.generarCajasPares === 'function') window.generarCajasPares(numMat, document.getElementById('cont-dinamico-mat'), 'mat', 'Sec.');
                    document.querySelectorAll('.sec-mat-fem').forEach(inp => inp.value = matSecs[inp.dataset.nivel]?.fem || '');
                    document.querySelectorAll('.sec-mat-mas').forEach(inp => inp.value = matSecs[inp.dataset.nivel]?.mas || '');
                  }
                  
                  if (numPre > 0) {
                    setVal('numSecPre', numPre);
                    if (typeof window.generarCajasPares === 'function') window.generarCajasPares(numPre, document.getElementById('cont-dinamico-pre'), 'pre', 'Sec.');
                    document.querySelectorAll('.sec-pre-fem').forEach(inp => inp.value = preSecs[inp.dataset.nivel]?.fem || '');
                    document.querySelectorAll('.sec-pre-mas').forEach(inp => inp.value = preSecs[inp.dataset.nivel]?.mas || '');
                  }
                  
                  if (numPri > 0) {
                    setVal('numSecPri', numPri);
                    if (typeof window.generarCajasPares === 'function') window.generarCajasPares(numPri, document.getElementById('cont-dinamico-pri'), 'pri', 'Grado');
                    document.querySelectorAll('.sec-pri-fem').forEach(inp => inp.value = priSecs[inp.dataset.nivel]?.fem || '');
                    document.querySelectorAll('.sec-pri-mas').forEach(inp => inp.value = priSecs[inp.dataset.nivel]?.mas || '');
                  }
                  
                  // Forzar recálculo visual
                  if (typeof _checkMatriculaValida === 'function') {
                    _checkMatriculaValida();
                  }
                  document.getElementById('info-parroquia').innerText = pData.parroquia || '...';
                  document.getElementById('info-plantel').innerText = pData['nombre-plantel']?.nominal || '...';
                  document.getElementById('info-nuevo-eponimo').innerText = pData['nombre-plantel']?.['nuevo-eponimo'] || '...';
                  document.getElementById('info-denominacion').innerText = pData.denominacion || '...';
                  document.getElementById('info-cod-plantel').innerText = pData.codigos?.plantel || perfil.jerarquia.plantel_codigo || '...';
                  document.getElementById('info-cod-dep1').innerText = (pData.codigos?.dependencia && pData.codigos.dependencia[0]) || '...';
                  document.getElementById('info-cod-dep2').innerText = (pData.codigos?.dependencia && pData.codigos.dependencia[1]) || '...';
                  document.getElementById('info-cod-est').innerText = pData.codigos?.estadistico || '...';
                  document.getElementById('info-dependencia').innerText = pData.dependencia || '...';
                  document.getElementById('info-nivel').innerText = pData.nivel || '...';
                  document.getElementById('info-modalidad').innerText = 'N/A';
                  document.getElementById('info-turnos').innerText = pData['turno-plantel'] || '...';
                  document.getElementById('info-ubic-geo').innerText = pData['ubicacion-geografica'] || '...';
                  document.getElementById('info-metros2').innerText = 'N/A';
                  document.getElementById('info-observaciones').innerText = '...';

                  // Construir el objeto de planes de estudio leyendo del nuevo schema (ahora es un map, no un array)
                  const planesPlantel = {};
                  if (pData['planes-estudio'] && typeof pData['planes-estudio'] === 'object') {
                    Object.keys(pData['planes-estudio']).forEach(planCod => {
                      planesPlantel[String(planCod)] = true;
                    });
                  }

                  // Renderizar Secciones Dinámicamente basándose en los planes reales y pasar pData para precarga
                  window._renderizarDetalleSecciones(planesPlantel, pData);
                }
                
                // Load Real Personal into table
                loadPlaAdminPersonal(perfil.jerarquia.plantel_codigo);
              } catch (err) {
                console.error("Error cargando info del plantel:", err);
              }
            }
          }
          
          // Cargar Estadísticas Reales
          loadRealDashboardStats(perfil);
          
          // Inicializar panel de administración y de aprobaciones si aplica
          initAdminPanel(perfil);
          initApprovalPanel(perfil);
          
        }
      } catch(e) {
        console.error("Error cargando perfil:", e);
      }
    } else {
      // Redirigir al login si no hay sesión
      window.location.href = '/';
    }
  });

  // 0. Toggle Sidebar (Responsive)
  const btnMenuToggle = document.getElementById('btn-menu-toggle');
  const sidebar = document.getElementById('sidebar');
  if (btnMenuToggle && sidebar) {
    btnMenuToggle.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar que el clic cierre inmediatamente
      sidebar.classList.toggle('open');
    });

    // Cerrar al hacer clic fuera del sidebar
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 900 && sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
        sidebar.classList.remove('open');
      }
    });
  }

  // Navigation Logic
  const navButtons = document.querySelectorAll('.nav-btn[data-target]');
  const viewSections = document.querySelectorAll('.view-section');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      navButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      viewSections.forEach(sec => sec.style.display = 'none');
      const targetId = btn.getAttribute('data-target');
      document.getElementById(targetId).style.display = 'block';

      // Cerrar sidebar en pantallas pequeñas tras navegar
      if (window.innerWidth <= 900 && sidebar && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    });
  });

  // Animación de números
  const animateNumbers = () => {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
      // Evitar múltiples intervalos si se llama a animateNumbers repetidamente
      if (stat.dataset.animInterval) {
        clearInterval(parseInt(stat.dataset.animInterval));
      }

      const targetAttr = stat.getAttribute('data-target-num');
      if (!targetAttr) return; // Si no tiene target, no animar (evita contar hasta el infinito)
      
      const target = parseInt(targetAttr);
      if (isNaN(target)) return;

      // Duración dinámica: más larga para números grandes, más corta para pequeños
      const duration = target > 5000 ? 2500 : (target > 500 ? 1500 : 800);
      
      // Tiempo fijo por paso para que siempre se vea fluido (~50 FPS)
      const stepTime = 20; 
      
      // Calculamos cuánto sumar en cada paso para completar en el tiempo deseado
      const totalSteps = Math.max(1, Math.floor(duration / stepTime));
      let increment = Math.ceil(target / totalSteps);
      if (increment < 1) increment = 1;

      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        
        if (current >= target) {
          stat.innerText = target.toLocaleString('en-US');
          clearInterval(timer);
          stat.dataset.animInterval = '';
        } else {
          stat.innerText = current.toLocaleString('en-US');
        }
      }, stepTime > 0 ? stepTime : 10);

      stat.dataset.animInterval = timer;
    });
  };

  // Cargar estadísticas reales desde Firebase (o catálogo local)
  async function loadRealDashboardStats(perfil) {
    const labelStat1 = document.getElementById('label-stat-1');
    const labelStat2 = document.getElementById('label-stat-2');
    const stat1 = document.querySelector('#label-stat-1 + .stat-number');
    const stat2 = document.querySelector('#label-stat-2 + .stat-number');
    
    if(!labelStat1 || !stat1) return;

    let val1 = 0;
    let val2 = 0;
    
    const _setStats = (v1, v2) => {
      stat1.setAttribute('data-target-num', v1);
      stat2.setAttribute('data-target-num', v2);
      if (v1 === 0) stat1.innerText = '0'; 
      if (v2 === 0) stat2.innerText = '0';
      if (v1 > 0 || v2 > 0) animateNumbers();
    };

    try {
      if (perfil.rol === 'superadmin' || perfil.rol === 'zonadmin') {
        labelStat1.innerText = 'Total Planteles';
        labelStat2.innerText = 'Total Personal (Estado)';
        // ✅ ZERO-COST: Contar planteles desde Firebase basándonos en los usuarios registrados como plaadmin
        try {
          const qUsuarios = window.firebaseQuery(collection(db, 'usuarios'), window.firebaseWhere('rol', '==', 'plaadmin'));
          const snap1 = await getCountFromServer(qUsuarios);
          val1 = snap1.data().count;
        } catch(e) {
          console.error("Error contando planteles", e);
          val1 = 2; // Fallback
        }

        // Personal: usar getCountFromServer (cuesta 1 lectura, no documentos)
        try {
          const snap2 = await getCountFromServer(collection(db, 'cargos_personal'));
          val2 = snap2.data().count;
        } catch(_) {
          // Si la cuota está agotada, mostrar el último valor conocido
          val2 = 25613; // Último conteo conocido del export
        }
        
      } else if (perfil.rol === 'munadmin') {
        labelStat1.innerText = 'Planteles del Municipio';
        labelStat2.innerText = 'Personal del Municipio';
        const municipio = perfil.jerarquia?.municipio || '';
        if (municipio) {
          // Planteles del municipio desde catálogo local
          const resP = await fetch('/planteles.json');
          const planteles = await resP.json();
          val1 = Object.values(planteles).filter(p => p.municipio === municipio).length;
          
          // Personal del municipio — requiere Firestore
          try {
            const snap2 = await getCountFromServer(query(collection(db, 'cargos_personal'), where('municipio', '==', municipio)));
            val2 = snap2.data().count;
          } catch(_) { val2 = 0; }
        }
      } else {
        // plaadmin
        labelStat1.innerText = 'Total Aulas';
        labelStat2.innerText = 'Personal del Plantel';
        const plantelCod = perfil.jerarquia?.plantel_codigo || '';
        val1 = 0;
        if (plantelCod) {
          try {
            const snap2 = await getCountFromServer(query(collection(db, 'cargos_personal'), where('codigo-plantel', '==', plantelCod)));
            val2 = snap2.data().count;
          } catch(_) { val2 = 0; }
        }
      }
      
      _setStats(val1, val2);

    } catch (e) {
      console.error("Error al cargar estadisticas:", e);
      if (stat1) stat1.innerText = '--';
      if (stat2) stat2.innerText = '--';
    }
  }

  // Ejecutar animación inicial visual
  animateNumbers();


  // ==========================================
  // Lógica Matrícula Escolar y Vacantes
  // ==========================================
  
  // 1. Simulación de carga de niveles autorizados (Pronto de Firestore)
  const nivelesMock = ['INICIAL', 'PRIMARIA']; // Supongamos que este plantel tiene ambos
  if (nivelesMock.includes('INICIAL')) document.getElementById('card-inicial').style.display = 'block';
  if (nivelesMock.includes('PRIMARIA')) document.getElementById('card-primaria').style.display = 'block';

  // 2. Cálculos automáticos de matrícula (No sumar secciones al total de alumnos)
  const inputsInicial = ['matFem', 'matMas', 'secMat', 'preFem', 'preMas', 'secPre'];
  const camposSumaInicial = ['matFem', 'matMas', 'preFem', 'preMas'];
  
  inputsInicial.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => {
      const t = camposSumaInicial.reduce((sum, currentId) => sum + (parseInt(document.getElementById(currentId).value) || 0), 0);
      document.getElementById('totInicial').innerText = t;
    });
  });

  const inputsPrimaria = ['priFem', 'priMas', 'secPri'];
  const camposSumaPrimaria = ['priFem', 'priMas'];
  
  inputsPrimaria.forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('input', () => {
      const t = camposSumaPrimaria.reduce((sum, currentId) => sum + (parseInt(document.getElementById(currentId).value) || 0), 0);
      document.getElementById('totPrimaria').innerText = t;
    });
  });

  // 3. Lógica del Botón Guardar Matrícula (Desbloquear Personal)
  const formMatricula = document.getElementById('form-matricula');
  const btnNuevoPersonal = document.getElementById('btn-nuevo-personal');
  const badgeMatricula = document.getElementById('badge-matricula-status');

    formMatricula.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!window.currentPlantelCode) {
      showToast('Error: No se ha cargado el código del plantel.', 'error');
      return;
    }
    
    const getVal = (id) => parseInt(document.getElementById(id)?.value) || 0;
    
        let payload = {
        'matricula': {
          'total': 0
        },
        'secciones-planes': {}
    };
    
    let totalGeneral = 0;

    // Helper para agregar nivel si hay estudiantes
    const addNivel = (nivel, f, m) => {
      if (f > 0 || m > 0) {
        payload.matricula[nivel] = { fem: f, mas: m, total: f + m };
        totalGeneral += (f + m);
      }
    };

    // Función auxiliar para leer sumatorias de cajas dinámicas pares
    const sumCls = (cls) => Array.from(document.querySelectorAll(cls)).reduce((s, el) => s + (parseInt(el.value) || 0), 0);
    
    const matF = sumCls('.sec-mat-fem');
    const matM = sumCls('.sec-mat-mas');
    addNivel('maternal', matF, matM);
    
    const preF = sumCls('.sec-pre-fem');
    const preM = sumCls('.sec-pre-mas');
    addNivel('preescolar', preF, preM);
    
    if (matF > 0 || matM > 0 || preF > 0 || preM > 0) {
      payload.matricula['inicial'] = { 
        fem: matF + preF, 
        mas: matM + preM, 
        total: matF + matM + preF + preM 
      };
    }

    const priF = sumCls('.sec-pri-fem');
    const priM = sumCls('.sec-pri-mas');
    addNivel('primaria', priF, priM);

    // Leer estudiantes dinámicos por plan de estudio (Media General y Técnica)
    document.querySelectorAll('.plan-mat-fem').forEach(inp => {
       const plan = inp.dataset.plan;
       const nivel = inp.dataset.nivel; // 'media-general' o 'media-tecnica'
       const mInp = document.querySelector(`.plan-mat-mas[data-plan="${plan}"]`);
       
       const f = parseInt(inp.value) || 0;
       const m = parseInt(mInp ? mInp.value : 0) || 0;
       
       if (f > 0 || m > 0) {
          if (!payload.matricula[nivel]) payload.matricula[nivel] = {};
          payload.matricula[nivel][plan] = { fem: f, mas: m, total: f + m };
          totalGeneral += (f + m);
       }
    });
    
    payload.matricula.total = totalGeneral;
    // Leer secciones dinámicas (Pares)
    payload['secciones-planes']['20000'] = { maternal: {}, preescolar: {} };
    let matTotalF = 0, matTotalM = 0;
    document.querySelectorAll('.sec-mat-fem').forEach(inp => {
      const f = parseInt(inp.value) || 0;
      const m = parseInt(document.querySelector(`.sec-mat-mas[data-nivel="${inp.dataset.nivel}"]`)?.value) || 0;
      payload['secciones-planes']['20000']['maternal'][inp.dataset.nivel] = { fem: f, mas: m };
      matTotalF += f;
      matTotalM += m;
    });
    if ((matTotalF + matTotalM) > 0) {
      payload['secciones-planes']['20000']['maternal']['total-fem'] = matTotalF;
      payload['secciones-planes']['20000']['maternal']['total-mas'] = matTotalM;
      payload['secciones-planes']['20000']['maternal']['total'] = matTotalF + matTotalM;
    }

    let preTotalF = 0, preTotalM = 0;
    document.querySelectorAll('.sec-pre-fem').forEach(inp => {
      const f = parseInt(inp.value) || 0;
      const m = parseInt(document.querySelector(`.sec-pre-mas[data-nivel="${inp.dataset.nivel}"]`)?.value) || 0;
      payload['secciones-planes']['20000']['preescolar'][inp.dataset.nivel] = { fem: f, mas: m };
      preTotalF += f;
      preTotalM += m;
    });
    if ((preTotalF + preTotalM) > 0) {
      payload['secciones-planes']['20000']['preescolar']['total-fem'] = preTotalF;
      payload['secciones-planes']['20000']['preescolar']['total-mas'] = preTotalM;
      payload['secciones-planes']['20000']['preescolar']['total'] = preTotalF + preTotalM;
    }
    
    // Leer secciones de Primaria
    payload['secciones-planes']['21000'] = {};
    let priTotalF = 0, priTotalM = 0;
    document.querySelectorAll('.sec-pri-fem').forEach(inp => {
      const f = parseInt(inp.value) || 0;
      const m = parseInt(document.querySelector(`.sec-pri-mas[data-nivel="${inp.dataset.nivel}"]`)?.value) || 0;
      payload['secciones-planes']['21000'][inp.dataset.nivel] = { fem: f, mas: m };
      priTotalF += f;
      priTotalM += m;
    });
    if ((priTotalF + priTotalM) > 0) {
      payload['secciones-planes']['21000']['total-fem'] = priTotalF;
      payload['secciones-planes']['21000']['total-mas'] = priTotalM;
      payload['secciones-planes']['21000']['total'] = priTotalF + priTotalM;
    }

    // Leer secciones de Media General y Técnica
    document.querySelectorAll('.sec-anio-input').forEach(inp => {
      const plan = inp.dataset.plan;
      const anio = inp.dataset.anio;
      const val = parseInt(inp.value) || 0;
      if (!payload['secciones-planes'][plan]) payload['secciones-planes'][plan] = {};
      payload['secciones-planes'][plan][anio] = val;
    });

    try {
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) btn.innerText = 'Guardando...';
      
      const plantelRef = doc(db, 'planteles', window.currentPlantelCode);
      await updateDoc(plantelRef, payload);
      
      showToast('Matrícula y secciones guardadas exitosamente en Firestore.', 'success');
      
      // Desbloquear botón
      btnNuevoPersonal.removeAttribute('disabled');
      btnNuevoPersonal.style.cursor = 'pointer';
      btnNuevoPersonal.style.opacity = '1';
      btnNuevoPersonal.style.background = '#3b82f6';
      btnNuevoPersonal.innerText = '+ Nuevo Trabajador';
      
      // Cambiar badge
      badgeMatricula.innerText = 'Guardada ✔';
      badgeMatricula.style.background = '#10b981'; // green
      
      if (btn) btn.innerText = 'Guardar Matrícula y Habilitar Sistema';
    } catch (err) {
      console.error(err);
      showToast('Error guardando en Firestore: ' + err.message, 'error');
    }
  });

  // 4. Lógica de Vacantes Dinámicas y Validación de Matrícula
  const modalVacantes = document.getElementById('modal-vacantes');
  const btnAbrirVacantes = document.getElementById('btn-abrir-vacantes');
  const btnCerrarVacantes = document.getElementById('btn-cerrar-vacantes');
  const btnCancelarVacantes = document.getElementById('btn-cancelar-vacantes');
  const btnConfirmarVacantes = document.getElementById('btn-confirmar-vacantes');
  const listaVacantes = document.getElementById('lista-vacantes');
  const selTieneVacantes = document.getElementById('sel-tiene-vacantes');
  const contBtnVacantes = document.getElementById('cont-btn-vacantes');
  const btnGuardarMatricula = document.getElementById('btn-guardar-matricula');

  window._VACANTES_TEMP = {};

    window._renderizarDetalleSecciones = (planes, pData = {}) => {
    const planesArr = Object.keys(planes).sort();
    const mostrarInicial = planesArr.includes('20000');
    const mostrarPrimaria = planesArr.includes('21000');
    const mediaPlanes = planesArr.filter(p => p !== '20000' && p !== '21000');
    
    const tieneMg = mediaPlanes.some(p => p.startsWith('3'));
    const tieneMt = mediaPlanes.some(p => p.startsWith('4'));

    document.getElementById('card-inicial').style.display = mostrarInicial ? 'block' : 'none';
    document.getElementById('card-primaria').style.display = mostrarPrimaria ? 'block' : 'none';
    
    // Mostramos u ocultamos los divs vacíos (el html ya no tiene los campos de mgFem/mgMas)
    document.getElementById('card-mediageneral').style.display = tieneMg ? 'block' : 'none';
    document.getElementById('card-mediatecnica').style.display = tieneMt ? 'block' : 'none';

    const contDinamico = document.getElementById('cont-secciones-dinamicas');
    if (!contDinamico) return; // Si no existe, no hacemos nada (aunque debería por el HTML)
    contDinamico.innerHTML = '';

    if (mediaPlanes.length === 0) {
      document.getElementById('cont-secciones-detalle').style.display = 'none';
      return;
    }

    document.getElementById('cont-secciones-detalle').style.display = 'block';
    
    let html = '<div style="margin-bottom:1rem; display:flex; align-items:center; gap:10px;"><span style="font-size: 1.5rem">📚</span><h3 style="margin:0; font-size: 16px; color: #cbd5e1;">Matrícula y Secciones por Plan de Estudio</h3></div>';

    mediaPlanes.forEach(plan => {
      const isMt = plan.startsWith('4');
      const anios = isMt ? 6 : 5;
      
      let especialidad = "";
      let mencion = "";
      if (pData['planes-estudio'] && pData['planes-estudio'][plan]) {
        especialidad = pData['planes-estudio'][plan].especialidad || "";
        mencion = pData['planes-estudio'][plan].mencion || "";
      }
      
      let titulo = `Plan ${plan}`;
      if (mencion) titulo += ` (${mencion})`;
      else if (especialidad) titulo += ` (${especialidad})`;

      // Recuperar matricula guardada para este plan
      let fVal = '';
      let mVal = '';
      const nivel = isMt ? 'media-tecnica' : 'media-general';
      if (pData.matricula && pData.matricula[nivel] && pData.matricula[nivel][plan]) {
        fVal = pData.matricula[nivel][plan].fem || '';
        mVal = pData.matricula[nivel][plan].mas || '';
      }

      html += `<div style="margin-bottom: 1.5rem; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 1rem; background: rgba(0,0,0,0.2);">`;
      html += `<h4 style="margin: 0 0 1rem; color: #60a5fa; font-size: 13px;">${titulo}</h4>`;
      
      // Fila 1: Estudiantes
      html += `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px dashed rgba(255,255,255,0.1);">`;
      html += `  <div class="input-group">
                   <label style="font-size: 11px;">Alumnas Femeninas</label>
                   <input type="number" class="plan-mat-fem" data-plan="${plan}" data-nivel="${nivel}" value="${fVal}" min="0" style="padding: 0.4rem; text-align: center;">
                 </div>`;
      html += `  <div class="input-group">
                   <label style="font-size: 11px;">Alumnos Masculinos</label>
                   <input type="number" class="plan-mat-mas" data-plan="${plan}" data-nivel="${nivel}" value="${mVal}" min="0" style="padding: 0.4rem; text-align: center;">
                 </div>`;
      html += `</div>`;

      // Fila 2: Secciones
      html += `<h5 style="margin: 0 0 0.5rem; font-size: 11px; color: #94a3b8;">Secciones:</h5>`;
      html += `<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 1rem;">`;

      for (let i = 1; i <= anios; i++) {
        let savedVal = '';
        if (pData['secciones-planes'] && pData['secciones-planes'][plan] && pData['secciones-planes'][plan][i]) {
          savedVal = pData['secciones-planes'][plan][i];
        }

        html += `<div class="input-group">`;
        html += `<label style="font-size: 11px;">${i}º Año</label>`;
        html += `<input type="number" class="sec-anio-input" data-plan="${plan}" data-anio="${i}" min="0" value="${savedVal}" style="padding: 0.4rem; text-align: center;">`;
        html += `</div>`;
      }

      html += `</div></div>`;
    });

    contDinamico.innerHTML = html;
  };


  const _checkMatriculaValida = () => {
    // 1. Auto-sumar secciones de Media General y Media Técnica
    let totalSecMg = 0;
    let totalSecMt = 0;
    
    document.querySelectorAll('.sec-anio-input').forEach(inp => {
      const plan = inp.dataset.plan || '';
      const val = parseInt(inp.value) || 0;
      if (plan.startsWith('3')) totalSecMg += val;
      if (plan.startsWith('4')) totalSecMt += val;
    });

    const elSecMg = document.getElementById('secMg');
    if (elSecMg) elSecMg.value = totalSecMg > 0 ? totalSecMg : '';
    
    const elSecMt = document.getElementById('secMt');
    if (elSecMt) elSecMt.value = totalSecMt > 0 ? totalSecMt : '';

    const sumCls = (cls) => Array.from(document.querySelectorAll(cls)).reduce((s, el) => s + (parseInt(el.value) || 0), 0);
    const mat = sumCls('.sec-mat-fem') + sumCls('.sec-mat-mas');
    const pre = sumCls('.sec-pre-fem') + sumCls('.sec-pre-mas');
    const pri = sumCls('.sec-pri-fem') + sumCls('.sec-pri-mas');

    let seccionesLlenas = (mat > 0 || pre > 0 || pri > 0 || totalSecMg > 0 || totalSecMt > 0);
    
    // Verificar vacantes
    let vacantesValidas = false;
    if (selTieneVacantes.value === 'NO') {
      vacantesValidas = true;
    } else if (selTieneVacantes.value === 'SI') {
      // Si dice SI, debe haber guardado al menos una vacante en memoria
      const v = window._VACANTES_TEMP || {};
      if (v.maternal || v.preescolar || v.primaria || v.mediageneral || v.mediatecnica) {
        vacantesValidas = true;
      }
    }

    if (seccionesLlenas && vacantesValidas && selTieneVacantes.value !== '') {
      btnGuardarMatricula.removeAttribute('disabled');
      btnGuardarMatricula.style.cursor = 'pointer';
      btnGuardarMatricula.style.background = '#3b82f6';
      btnGuardarMatricula.style.borderColor = '#3b82f6';
    } else {
      btnGuardarMatricula.setAttribute('disabled', 'true');
      btnGuardarMatricula.style.cursor = 'not-allowed';
      btnGuardarMatricula.style.background = '#64748b';
      btnGuardarMatricula.style.borderColor = '#64748b';
    }
  };

  // Helper para dibujar cajas pares (Fem/Mas)
  window.generarCajasPares = (num, cont, levelPrefix, prefixLabel) => {
    if (!cont) return;
    cont.innerHTML = '';
    for (let i = 1; i <= num; i++) {
      cont.innerHTML += `<div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); padding: 10px; border-radius: 8px; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);">
        <span style="font-size:12px; font-weight:bold; color:#e2e8f0; letter-spacing: 0.5px;">${prefixLabel} ${i}</span>
        <div style="display:flex; gap:8px; width: 100%;">
          <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:10px; color:#f472b6; margin-bottom:3px; text-transform:uppercase;">Niñas</span>
            <input type="number" class="sec-${levelPrefix}-fem" data-nivel="${i}" min="0" style="width:100%; padding: 6px 4px; text-align: center; font-size:13px; border-radius:6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.25); color:white; outline:none; transition: border 0.2s;" onfocus="this.style.borderColor='#f472b6'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>
          <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
            <span style="font-size:10px; color:#60a5fa; margin-bottom:3px; text-transform:uppercase;">Niños</span>
            <input type="number" class="sec-${levelPrefix}-mas" data-nivel="${i}" min="0" style="width:100%; padding: 6px 4px; text-align: center; font-size:13px; border-radius:6px; border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.25); color:white; outline:none; transition: border 0.2s;" onfocus="this.style.borderColor='#60a5fa'" onblur="this.style.borderColor='rgba(255,255,255,0.15)'">
          </div>
        </div>
      </div>`;
    }
    cont.querySelectorAll(`input`).forEach(el => {
      el.addEventListener('input', () => {
        if (typeof _checkMatriculaValida === 'function') _checkMatriculaValida();
        if (typeof _calcularTotales === 'function') _calcularTotales();
      });
    });
    if (typeof _checkMatriculaValida === 'function') _checkMatriculaValida();
    if (typeof _calcularTotales === 'function') _calcularTotales();
  };

  const numSecMat = document.getElementById('numSecMat');
  const numSecPre = document.getElementById('numSecPre');
  const numSecPri = document.getElementById('numSecPri');
  
  const contMat = document.getElementById('cont-dinamico-mat');
  const contPre = document.getElementById('cont-dinamico-pre');
  const contPri = document.getElementById('cont-dinamico-pri');

  if (numSecMat) {
    numSecMat.addEventListener('input', (e) => {
      window.generarCajasPares(parseInt(e.target.value) || 0, contMat, 'mat', 'Sec.');
    });
  }
  if (numSecPre) {
    numSecPre.addEventListener('input', (e) => {
      window.generarCajasPares(parseInt(e.target.value) || 0, contPre, 'pre', 'Sec.');
    });
  }
  if (numSecPri) {
    numSecPri.addEventListener('input', (e) => {
      window.generarCajasPares(parseInt(e.target.value) || 0, contPri, 'pri', 'Grado');
    });
  }

  // Lógica de totales automáticos (Matrícula)
  const _calcularTotales = () => {
    const sumCls = (cls) => Array.from(document.querySelectorAll(cls)).reduce((s, el) => s + (parseInt(el.value) || 0), 0);
    
    // Inicial
    const matFem = sumCls('.sec-mat-fem');
    const matMas = sumCls('.sec-mat-mas');
    const preFem = sumCls('.sec-pre-fem');
    const preMas = sumCls('.sec-pre-mas');
    
    const totInicial = document.getElementById('totInicial');
    if (totInicial) totInicial.innerText = matFem + matMas + preFem + preMas;

    // Primaria
    const priFem = sumCls('.sec-pri-fem');
    const priMas = sumCls('.sec-pri-mas');
    
    const totPrimaria = document.getElementById('totPrimaria');
    if (totPrimaria) totPrimaria.innerText = priFem + priMas;

    // Media General y Técnica dinámicos
    let sumMg = 0;
    let sumMt = 0;
    
    document.querySelectorAll('.plan-mat-fem, .plan-mat-mas').forEach(inp => {
       const val = parseInt(inp.value) || 0;
       if (inp.dataset.nivel === 'media-general') sumMg += val;
       if (inp.dataset.nivel === 'media-tecnica') sumMt += val;
    });

    const totMg = document.getElementById('totMediaGeneral');
    const totMt = document.getElementById('totMediaTecnica');
    if (totMg) totMg.innerText = sumMg;
    if (totMt) totMt.innerText = sumMt;

    // GRAN TOTAL
    const granTotal = document.getElementById('granTotal');
    const totGenFem = document.getElementById('totGenFem');
    const totGenMas = document.getElementById('totGenMas');
    
    if (granTotal && totGenFem && totGenMas) {
      const sumMgF = sumCls('.plan-mat-fem[data-nivel="media-general"]');
      const sumMgM = sumCls('.plan-mat-mas[data-nivel="media-general"]');
      const sumMtF = sumCls('.plan-mat-fem[data-nivel="media-tecnica"]');
      const sumMtM = sumCls('.plan-mat-mas[data-nivel="media-tecnica"]');
      
      const totalFem = matFem + preFem + priFem + sumMgF + sumMtF;
      const totalMas = matMas + preMas + priMas + sumMgM + sumMtM;
      
      totGenFem.innerText = totalFem;
      totGenMas.innerText = totalMas;
      granTotal.innerText = totalFem + totalMas;
    }
  };
  
  // Delegación de eventos para inputs dinámicos en la tarjeta
  const contDinamico = document.getElementById('cont-secciones-dinamicas');
  if (contDinamico) {
    contDinamico.addEventListener('input', (e) => {
      if (e.target.classList.contains('plan-mat-fem') || e.target.classList.contains('plan-mat-mas')) {
        _calcularTotales();
      }
      _checkMatriculaValida();
    });
  }

  selTieneVacantes.addEventListener('change', (e) => {
    if (e.target.value === 'SI') {
      contBtnVacantes.style.display = 'block';
    } else {
      contBtnVacantes.style.display = 'none';
      window._VACANTES_TEMP = {}; // Limpiar si cambia a NO
    }
    _checkMatriculaValida();
  });

  const cerrarVacantes = () => modalVacantes.style.display = 'none';
  btnCerrarVacantes.addEventListener('click', cerrarVacantes);
  btnCancelarVacantes.addEventListener('click', cerrarVacantes);

  // Funciones heredadas de sgh_gas
  const _letraSecVac = (s, nTotal) => nTotal === 1 ? 'U' : String.fromCharCode(65 + s);
  
  const _distribuirSecVac = (numSec, numGrados) => {
    const base = Math.floor(numSec / numGrados);
    const resto = numSec % numGrados;
    const dist = [];
    for (let g = 0; g < numGrados; g++) dist.push(base + (g < resto ? 1 : 0));
    return dist;
  };

  const _crearBloqueVacante = (titulo, keyPlan, numSec, dataObj) => {
    let html = `<div style="margin-bottom:15px; border:1px solid #fcd34d; border-radius:8px; padding:15px; background:rgba(252,211,77,0.1);">`;
    html += `<h4 style="margin:0 0 10px; font-size:14px; color:#fbbf24;">${titulo}</h4>`;
    html += `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px;">`;
    
    for (let s = 0; s < numSec; s++) {
      const letra = _letraSecVac(s, numSec);
      const guardado = (dataObj && dataObj[letra]) ? dataObj[letra] : '';
      html += `
        <div style="display:flex; flex-direction:column; gap:5px;">
          <label style="font-size:11px; color:#cbd5e1;">SECCIÓN ${letra}</label>
          <input type="number" min="0" data-plan="${keyPlan}" data-sec="${letra}" class="form-input vac-input" placeholder="Alumnos sin docente" value="${guardado}" style="padding:8px; border-radius:5px; background:rgba(0,0,0,0.3); color:white; border:1px solid #f59e0b; text-align:center;">
        </div>`;
    }
    html += `</div></div>`;
    return html;
  };

  btnAbrirVacantes.addEventListener('click', () => {
    const mat = parseInt(document.getElementById('secMat')?.value) || 0;
    const pre = parseInt(document.getElementById('secPre')?.value) || 0;
    const pri = parseInt(document.getElementById('secPri')?.value) || 0;
    const VAC = window._VACANTES_TEMP || {};

    if (mat === 0 && pre === 0 && pri === 0) {
      showToast('Primero declare las secciones en los bloques de Matrícula (Maternal, Preescolar o Primaria).', 'warning');
      return;
    }

    listaVacantes.innerHTML = '';
    let html = '';

    if (mat > 0) html += _crearBloqueVacante('MATERNAL', 'maternal', mat, VAC['maternal']);
    if (pre > 0) html += _crearBloqueVacante('PREESCOLAR', 'preescolar', pre, VAC['preescolar']);

    if (pri > 0) {
      const dist = _distribuirSecVac(pri, 6);
      const ORDINALES = ['1ER', '2DO', '3ER', '4TO', '5TO', '6TO'];
      const dataPri = VAC['primaria'] || {};
      
      for (let g = 0; g < 6; g++) {
        if (dist[g] === 0) continue;
        html += `<div style="margin-bottom:15px; border:1px solid #fcd34d; border-radius:8px; padding:15px; background:rgba(252,211,77,0.1);">`;
        html += `<h4 style="margin:0 0 10px; font-size:14px; color:#fbbf24;">${ORDINALES[g]} GRADO</h4>`;
        html += `<div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(120px,1fr)); gap:10px;">`;
        for (let s = 0; s < dist[g]; s++) {
          const letra = _letraSecVac(s, dist[g]);
          const clave = String(g + 1) + letra;
          const guardado = dataPri[clave] ? dataPri[clave] : '';
          html += `
            <div style="display:flex; flex-direction:column; gap:5px;">
              <label style="font-size:11px; color:#cbd5e1;">SECCIÓN ${letra}</label>
              <input type="number" min="0" data-plan="primaria" data-grado="${g+1}" data-sec="${letra}" class="form-input vac-input" placeholder="Alumnos" value="${guardado}" style="padding:8px; border-radius:5px; background:rgba(0,0,0,0.3); color:white; border:1px solid #f59e0b; text-align:center;">
            </div>`;
        }
        html += `</div></div>`;
      }
    }

    listaVacantes.innerHTML = html;
    modalVacantes.style.display = 'flex';
  });

  btnConfirmarVacantes.addEventListener('click', () => {
    const inputs = document.querySelectorAll('.vac-input');
    const vacFinal = { maternal: {}, preescolar: {}, primaria: {} };

    inputs.forEach(inp => {
      const val = parseInt(inp.value, 10) || 0;
      if (val <= 0) return;
      const plan = inp.dataset.plan;
      const sec = inp.dataset.sec;
      const grado = inp.dataset.grado;

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
    cerrarVacantes();
    _checkMatriculaValida();
    
    // Cambiar texto del botón para feedback
    btnAbrirVacantes.innerHTML = '✅ Vacantes Reportadas (Editar)';
    btnAbrirVacantes.style.borderColor = '#10b981';
    btnAbrirVacantes.style.color = '#34d399';
    btnAbrirVacantes.style.background = 'rgba(16, 185, 129, 0.2)';
  });

  // ==========================================
  // Lógica del Módulo 4  // 1. Buscador Inteligente
  const buscadorPersonal = document.getElementById('buscador-personal');
  
  buscadorPersonal.addEventListener('keyup', (e) => {
    const texto = e.target.value.toLowerCase();
    const tablaPersonalTrs = document.querySelectorAll('#tabla-personal-tbody tr');
    
    tablaPersonalTrs.forEach(tr => {
      // Ignorar fila vacía o de carga
      if (tr.cells.length < 2) return;
      
      // Tomamos el texto de las dos primeras columnas (Cédula y Nombre)
      const cedula = tr.cells[0].innerText.toLowerCase();
      const nombre = tr.cells[1].innerText.toLowerCase();
      
      if (cedula.includes(texto) || nombre.includes(texto)) {
        tr.style.display = '';
      } else {
        tr.style.display = 'none';
      }
    });
  });

  window.abrirModalEditar = async (cedula) => {
    try {
      showToast('Cargando datos...', 'info');
      const docRef = doc(db, 'cargos_personal', cedula);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        abrirModal('EDITAR', data);
      } else {
        // Tratar de buscar si la cedula vino como numero
        const q2 = query(collection(db, 'cargos_personal'), where('cedula', '==', parseInt(cedula)));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          abrirModal('EDITAR', snap2.docs[0].data());
        } else {
          showToast('No se encontró el trabajador', 'warning');
        }
      }
    } catch (err) {
      console.error(err);
      showToast('Error cargando datos', 'error');
    }
  };

  window.eliminarPersonal = async (cedula) => {
    const confirmed = await window.showCustomConfirm(`¿Estás seguro de que deseas eliminar al trabajador con cédula ${cedula}? Esta acción generará un histórico.`);
    if (confirmed) {
      try {
        const nota = await window.showCustomPrompt('Por favor, indica el motivo de la eliminación:');
        if (!nota) {
          showToast('Eliminación cancelada. Se requiere un motivo.', 'warning');
          return;
        }

        showToast('Eliminando y creando histórico...', 'info');
        let data = null;
        const docRef = doc(db, 'cargos_personal', cedula);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          data = docSnap.data();
        } else {
          const q2 = query(collection(db, 'cargos_personal'), where('cedula', '==', parseInt(cedula)));
          const snap2 = await getDocs(q2);
          if (!snap2.empty) {
            data = snap2.docs[0].data();
          }
        }

        if (data) {
          data.motivo_eliminacion = nota;
          data.eliminado_en = new Date().toISOString();
          
          // Guardar en histórico
          await setDoc(doc(db, 'personal_historico', cedula), data);
          
          // Borrar original
          await deleteDoc(docRef);
          
          showToast('Trabajador eliminado y guardado en histórico.', 'success');
          
          // Recargar tabla
          const plantelActual = document.getElementById('info-cod-plantel').innerText;
          if (plantelActual && plantelActual !== '...') {
            loadPlaAdminPersonal(plantelActual);
          }
        } else {
          showToast('No se encontró el trabajador para eliminar.', 'error');
        }
      } catch (err) {
        console.error(err);
        showToast('Error al eliminar', 'error');
      }
    }
  };

  // Función para cargar personal del plaadmin
  window.loadPlaAdminPersonal = async (plantelCod) => {
    try {
      const tbody = document.querySelector('#tabla-personal tbody');
      if (!tbody) return;
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Cargando personal...</td></tr>';
      
      const q = query(collection(db, 'cargos_personal'), where('codigo-plantel', '==', plantelCod));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#cbd5e1;">No hay personal registrado en este plantel.</td></tr>';
        return;
      }
      
      let html = '';
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const statusColor = (d['situacion-laboral'] || '').toUpperCase() === 'ACTIVO' ? '#34d399' : '#ef4444';
        
        html += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
            <td style="padding: 12px; color: white;">V-${d['cedula']}</td>
            <td style="padding: 12px; color: white; font-weight: bold;">${d['nombre-apellido'] || ''}</td>
            <td style="padding: 12px; color: var(--text-secondary);">${d['cargo'] || d['tipo-personal'] || ''}</td>
            <td style="padding: 12px;">
              <span style="background: rgba(255,255,255,0.1); color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px;">
                ${d['situacion-laboral'] || 'Desconocido'}
              </span>
            </td>
            <td style="padding: 12px; text-align: right;">
              <button class="icon-btn" title="Editar" onclick="window.abrirModalEditar('${d['cedula']}')">✏️</button>
              <button class="icon-btn" title="Eliminar" onclick="window.eliminarPersonal('${d['cedula']}')">🗑️</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
      
    } catch(err) {
      console.error("Error loading personal:", err);
    }
  };

  // 2. Wizard Lógica (UI)
  const modalCrud = document.getElementById('modal-crud');
  const btnCerrarModal = document.getElementById('btn-cerrar-modal');
  const btnCancelarModal = document.getElementById('btn-cancelar-modal');
  const formCrud = document.getElementById('form-crud');
  const modalTitle = document.getElementById('modal-title');
  const btnsEditar = document.querySelectorAll('.edit-btn');
  const btnsEliminar = document.querySelectorAll('.delete-btn');

  // WIZARD ELEMENTS
  const steps = document.querySelectorAll('.wizard-step');
  const stepIndicators = document.querySelectorAll('.step');
  const btnPrev = document.getElementById('btn-wizard-prev');
  const btnNext = document.getElementById('btn-wizard-next');
  const btnSubmit = document.getElementById('btn-wizard-submit');
  let currentStep = 1;
  const totalSteps = steps.length;

  const updateWizardUI = (preventScroll = false) => {
    steps.forEach((step, idx) => {
      step.style.display = (idx + 1 === currentStep) ? 'block' : 'none';
      step.classList.toggle('active', idx + 1 === currentStep);
    });
    
    // Subir el scroll al inicio del modal (si no se previene)
    if (!preventScroll) {
      const modalBox = document.querySelector('#modal-crud .modal-box');
      if (modalBox) modalBox.scrollTop = 0;
    }
    
    stepIndicators.forEach((indicator, idx) => {
      if (idx + 1 === currentStep) {
        indicator.style.color = '#60a5fa';
        indicator.style.fontWeight = 'bold';
      } else {
        indicator.style.color = '#94a3b8';
        indicator.style.fontWeight = 'normal';
      }
    });

    btnPrev.style.display = currentStep > 1 ? 'block' : 'none';
    
    // Si estamos en el paso de Cuadratura (Paso 3) y se está configurando, ocultamos btnNext
    const isConfiguringCuadratura = document.getElementById('cont-cuadratura-inline') && document.getElementById('cont-cuadratura-inline').style.display === 'block';
    
    if (isConfiguringCuadratura) {
      btnNext.style.display = 'none';
      btnSubmit.style.display = 'none';
    } else if (currentStep === totalSteps) {
      btnNext.style.display = 'none';
      btnSubmit.style.display = 'block';
    } else {
      btnNext.style.display = 'block';
      btnSubmit.style.display = 'none';
    }
  };

  const validateStep = (stepNumber) => {
    const stepEl = document.getElementById(`step-${stepNumber}`);
    const requiredInputs = stepEl.querySelectorAll('[required]');
    let isValid = true;
    requiredInputs.forEach(input => {
      if (!input.checkValidity()) {
        input.reportValidity();
        isValid = false;
      }
    });
    
    if (stepNumber === 1 && isValid) {
      const edadStr = document.getElementById('inp-edad').value;
      if (!edadStr || parseInt(edadStr) < 18 || parseInt(edadStr) > 75) {
        document.getElementById('error-edad').style.display = 'block';
        isValid = false;
      } else {
        document.getElementById('error-edad').style.display = 'none';
      }
    }
    
    if (stepNumber === 2 && isValid) {
      const antiStr = document.getElementById('inp-antiguedad').value;
      if (antiStr.includes('Inválida')) {
        document.getElementById('error-antiguedad').style.display = 'block';
        isValid = false;
      } else {
        document.getElementById('error-antiguedad').style.display = 'none';
      }
    }

    return isValid;
  };

  btnNext.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      // Validar si requiere cuadratura (Paso 2)
      if (currentStep === 2) {
        const atiende = document.getElementById('sel-atiende-matricula').value;
        const nivel = document.getElementById('sel-nivel-modalidad').value;
        if (atiende === 'SI' && nivel) {
          const cuadData = window._CUADRATURA_TEMP || {};
          if (Object.keys(cuadData).length === 0) {
            showToast('Debe configurar y confirmar la cuadratura antes de continuar.', 'warning');
            return;
          }
        }
      }
      currentStep++;
      updateWizardUI();
    }
  });

  btnPrev.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      updateWizardUI();
    }
  });

  // ==========================================
  // VALIDACIONES AUTOMÁTICAS Y LÓGICA DE CARGOS
  // ==========================================
  const inpFechaNac = document.getElementById('inp-fecha-nacimiento');
  const inpEdad = document.getElementById('inp-edad');
  inpFechaNac.addEventListener('change', (e) => {
    const fecha = new Date(e.target.value);
    const hoy = new Date();
    let edad = hoy.getFullYear() - fecha.getFullYear();
    const m = hoy.getMonth() - fecha.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--;
    inpEdad.value = !isNaN(edad) ? edad : '';
    if (edad < 18 || edad > 75) {
      document.getElementById('error-edad').style.display = 'block';
    } else {
      document.getElementById('error-edad').style.display = 'none';
    }
  });

  const inpFechaIngreso = document.getElementById('inp-fecha-ingreso');
  const inpAntiguedad = document.getElementById('inp-antiguedad');
  inpFechaIngreso.addEventListener('change', (e) => {
    const fecha = new Date(e.target.value);
    const hoy = new Date();
    if (fecha > hoy) {
      inpAntiguedad.value = 'Inválida (Futura)';
      document.getElementById('error-antiguedad').style.display = 'block';
      return;
    }
    let anos = hoy.getFullYear() - fecha.getFullYear();
    const m = hoy.getMonth() - fecha.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) anos--;
    
    if (anos > 30) {
      inpAntiguedad.value = 'Inválida (>30 años)';
      document.getElementById('error-antiguedad').style.display = 'block';
    } else {
      inpAntiguedad.value = isNaN(anos) ? '' : `${anos} años`;
      document.getElementById('error-antiguedad').style.display = 'none';
    }
  });

  // Lógica Atiende Matrícula
  const selAtiendeMatricula = document.getElementById('sel-atiende-matricula');
  const contNivelEspecialidad = document.getElementById('cont-nivel-especialidad');
  const contBtnCuadratura = document.getElementById('cont-btn-cuadratura');
  const selNivelModalidad = document.getElementById('sel-nivel-modalidad');
  const inpEspecialidadImparte = document.getElementById('inp-especialidad-imparte');

  selAtiendeMatricula.addEventListener('change', (e) => {
    if (e.target.value === 'SI') {
      contNivelEspecialidad.style.display = 'grid';
      contBtnCuadratura.style.display = 'block';
      selNivelModalidad.setAttribute('required', 'true');
      inpEspecialidadImparte.setAttribute('required', 'true');
    } else {
      contNivelEspecialidad.style.display = 'none';
      contBtnCuadratura.style.display = 'none';
      selNivelModalidad.removeAttribute('required');
      inpEspecialidadImparte.removeAttribute('required');
    }
  });

  // Lógica Situación Laboral
  const selSituacionLaboral = document.getElementById('sel-situacion-laboral');
  const inpDescripcionEstatus = document.getElementById('inp-descripcion-estatus');
  
  selSituacionLaboral.addEventListener('change', (e) => {
    const rawCache = localStorage.getItem('sgh_catalogos');
    if (rawCache) {
      try {
        const cat = JSON.parse(rawCache);
        if (cat.situacion_laboral && cat.situacion_laboral[e.target.value]) {
          inpDescripcionEstatus.value = cat.situacion_laboral[e.target.value];
        } else {
          inpDescripcionEstatus.value = '';
        }
      } catch (err) {
        console.error('Error leyendo caché para estatus:', err);
      }
    }
  });

  const selDependencia = document.getElementById('sel-dependencia');
  const selTipoPersonal = document.getElementById('sel-tipo-personal');
  const contSubcat = document.getElementById('cont-subcategoria');
  const selSubcat = document.getElementById('sel-subcategoria');
  const selCargo = document.getElementById('sel-cargo');
  const selCodRac = document.getElementById('sel-codigo-rac');

  selDependencia.addEventListener('change', () => {
    selTipoPersonal.disabled = !selDependencia.value;
    selTipoPersonal.value = '';
    selTipoPersonal.dispatchEvent(new Event('change'));
  });

  selTipoPersonal.addEventListener('change', () => {
    const dep = selDependencia.value;
    const tipo = selTipoPersonal.value.toLowerCase();
    selCargo.innerHTML = '<option value="">Selecciona cargo...</option>';
    selCodRac.innerHTML = '<option value="">Selecciona RAC...</option>';
    selCargo.disabled = true;
    selCodRac.disabled = true;
    contSubcat.style.display = 'none';
    selSubcat.removeAttribute('required');

    if (!dep || !tipo) return;
    
    const rawCache = localStorage.getItem('sgh_catalogos');
    if (!rawCache) return;
    const catalogos = JSON.parse(rawCache);
    const depData = catalogos.clasificacion_cargos?.[dep.toUpperCase()];
    if (!depData || !depData[tipo]) return;
    const tipoData = depData[tipo];

    if (tipo === 'obrero') {
      contSubcat.style.display = 'flex';
      selSubcat.setAttribute('required', 'true');
      selSubcat.innerHTML = '<option value="">Selecciona rango...</option>';
      
      const rangosAgregados = new Set();
      Object.keys(tipoData).forEach(codigo => {
        const rangoStr = tipoData[codigo].rango;
        if (rangoStr && !rangosAgregados.has(rangoStr)) {
          rangosAgregados.add(rangoStr);
          selSubcat.innerHTML += `<option value="${codigo}">${rangoStr}</option>`;
        }
      });
    } else {
      selCargo.disabled = false;
      const descripcionesUnicas = [...new Set(Object.values(tipoData))].sort();
      descripcionesUnicas.forEach(c => {
        selCargo.innerHTML += `<option value="${c}">${c}</option>`;
      });
    }
  });

  selSubcat.addEventListener('change', () => {
    const dep = selDependencia.value;
    const tipo = selTipoPersonal.value.toLowerCase();
    const codigoRango = selSubcat.value;
    selCargo.innerHTML = '<option value="">Selecciona cargo...</option>';
    selCodRac.innerHTML = '<option value="">Selecciona RAC...</option>';
    selCodRac.disabled = true;

    if (!codigoRango) {
      selCargo.disabled = true;
      return;
    }

    const rawCache = localStorage.getItem('sgh_catalogos');
    if (!rawCache) return;
    const catalogos = JSON.parse(rawCache);
    const tipoData = catalogos.clasificacion_cargos?.[dep.toUpperCase()]?.[tipo];
    
    if (tipoData && tipoData[codigoRango] && tipoData[codigoRango].cargos) {
      selCargo.disabled = false;
      tipoData[codigoRango].cargos.forEach(c => {
        selCargo.innerHTML += `<option value="${c}">${c}</option>`;
      });
    }
  });

  selCargo.addEventListener('change', () => {
    const dep = selDependencia.value;
    const tipo = selTipoPersonal.value.toLowerCase();
    const cargo = selCargo.value;
    selCodRac.innerHTML = '<option value="">Selecciona RAC...</option>';
    
    if (!cargo) {
      selCodRac.disabled = true;
      return;
    }
    
    selCodRac.disabled = false;
    const rawCache = localStorage.getItem('sgh_catalogos');
    if (!rawCache) return;
    const catalogos = JSON.parse(rawCache);
    const tipoData = catalogos.clasificacion_cargos?.[dep.toUpperCase()]?.[tipo];
    if (!tipoData) return;

    if (tipo === 'obrero') {
      const codigoRango = selSubcat.value;
      if (codigoRango) {
        selCodRac.innerHTML += `<option value="${codigoRango}" selected>${codigoRango}</option>`;
      }
    } else {
      Object.keys(tipoData).forEach(cod => {
        if (tipoData[cod] === cargo) {
          selCodRac.innerHTML += `<option value="${cod}">${cod}</option>`;
        }
      });
      // Seleccionar automáticamente si solo hay una opción válida (el valor "" + la opción)
      if (selCodRac.options.length === 2) {
        selCodRac.selectedIndex = 1;
      }
    }

    // Deshabilitar CÓDIGO RAC para administrativo y obrero
    if (tipo === 'administrativo' || tipo === 'obrero') {
      selCodRac.disabled = true;
      selCodRac.removeAttribute('required');
      selCodRac.style.background = 'rgba(0,0,0,0.5)';
    } else {
      selCodRac.setAttribute('required', 'true');
      selCodRac.style.background = '';
    }
  });

  const abrirModal = (modo, data = {}) => {
    modalCrud.style.display = 'flex';
    currentStep = 1;
    updateWizardUI();
    
    // Habilitar cédula por defecto
    document.getElementById('inp-cedula').removeAttribute('readonly');
    document.getElementById('inp-cedula').style.background = 'rgba(15, 23, 42, 0.5)';

    if(modo === 'NUEVO') {
      modalTitle.innerText = 'Registrar Trabajador';
      formCrud.reset();
      selDependencia.dispatchEvent(new Event('change'));
      selTipoPersonal.dispatchEvent(new Event('change'));
      selAtiendeMatricula.dispatchEvent(new Event('change'));
      selSituacionLaboral.dispatchEvent(new Event('change'));
      window._CUADRATURA_TEMP = {};
      window._VACANTES_TEMP = {};
    } else {
      modalTitle.innerText = 'Editar Trabajador';
      
      // Mapeo dinámico inverso
      const inputs = formCrud.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.id && !input.id.startsWith('btn') && input.type !== 'submit') {
          let baseKey = input.id.replace('inp-', '').replace('sel-', '');
          
          // La base de datos ahora tiene keys estándar (kebab-case)
          let val = data[baseKey] || data[baseKey.toUpperCase()] || data[baseKey.replace(/-/g, ' ').toUpperCase()];
          
          // Convertir fechas D/M/YYYY o D/M/YY -> YYYY-MM-DD para los <input type=date>
          if ((input.type === 'date') && val && typeof val === 'string' && val.includes('/')) {
            const partes = val.split('/');
            if (partes.length === 3) {
              const d = partes[0].padStart(2, '0');
              const m = partes[1].padStart(2, '0');
              const y = partes[2].length === 2 ? '20' + partes[2] : partes[2];
              val = `${y}-${m}-${d}`;
            }
          }
          
          if (val !== undefined && val !== null && val !== '') {
            input.value = val;
          }
        }
      });
      
      // === CARGA DIRECTA DE CASCADA PARA MODO EDITAR ===
      // No se usan los eventos 'change' porque el de selDependencia borra
      // el valor de selTipoPersonal antes de que podamos setearlo.
      // En su lugar, leemos el catálogo directamente y poblamos los selects.
      const cargarCascadaEdicion = () => {
        const dep = data['dependencia'] || data['DEPENDENCIA'] || '';
        const tipoPersonal = (data['tipo-personal'] || data.tipo_personal || data['TIPO PERSONAL'] || '').toLowerCase();
        const cargoGuardado = data['cargo'] || data.cargo_especifico || data['CARGO'] || '';
        const racGuardado = data['codigo-rac'] || data['CODIGO RAC'] || '';

        // 1. Poner Dependencia (habilita selTipoPersonal)
        selDependencia.value = dep;
        selTipoPersonal.disabled = !dep;

        // 2. Poner Tipo de Personal (las opciones del <select> están en minúscula)
        selTipoPersonal.value = tipoPersonal; // tipoPersonal ya viene en toLowerCase()

        // 3. Leer catálogo del cache local y poblar Cargo directamente
        const rawCache = localStorage.getItem('sgh_catalogos');
        if (rawCache && dep && tipoPersonal) {
          const catalogos = JSON.parse(rawCache);
          const tipoData = catalogos.clasificacion_cargos?.[dep.toUpperCase()]?.[tipoPersonal];

          if (tipoData) {
            selCargo.innerHTML = '<option value="">Selecciona cargo...</option>';

            if (tipoPersonal === 'obrero') {
              // Poblar subcategoría y cargo para Obrero
              contSubcat.style.display = 'flex';
              selSubcat.setAttribute('required', 'true');
              selSubcat.innerHTML = '<option value="">Selecciona rango...</option>';
              const rangosAgregados = new Set();
              Object.keys(tipoData).forEach(codigo => {
                const rangoStr = tipoData[codigo].rango;
                if (rangoStr && !rangosAgregados.has(rangoStr)) {
                  rangosAgregados.add(rangoStr);
                  selSubcat.innerHTML += `<option value="${codigo}">${rangoStr}</option>`;
                }
              });
            } else {
              // Poblar cargos directamente
              selCargo.disabled = false;
              const descripcionesUnicas = [...new Set(Object.values(tipoData))].sort();
              descripcionesUnicas.forEach(c => {
                selCargo.innerHTML += `<option value="${c}">${c}</option>`;
              });
            }

            // 4. Seleccionar el cargo guardado
            selCargo.value = cargoGuardado;

            // 5. Poblar y seleccionar Código RAC
            selCodRac.innerHTML = '<option value="">Selecciona RAC...</option>';
            if (tipoPersonal === 'administrativo' || tipoPersonal === 'obrero') {
              selCodRac.value = '';
              selCodRac.setAttribute('disabled', 'true');
              selCodRac.style.background = 'rgba(0,0,0,0.5)';
            } else {
              // Poblar opciones RAC para el cargo seleccionado
              Object.keys(tipoData).forEach(cod => {
                if (tipoData[cod] === cargoGuardado) {
                  selCodRac.innerHTML += `<option value="${cod}">${cod}</option>`;
                }
              });
              selCodRac.removeAttribute('disabled');
              selCodRac.style.background = 'rgba(15, 23, 42, 0.5)';
              selCodRac.value = racGuardado;
              // Auto-seleccionar si solo hay una opción
              if (selCodRac.options.length === 2) selCodRac.selectedIndex = 1;
            }
          }
        }
      };
      cargarCascadaEdicion();

      
      selAtiendeMatricula.dispatchEvent(new Event('change'));
      selSituacionLaboral.dispatchEvent(new Event('change'));
      
      window._CUADRATURA_TEMP = data.cuadratura || {};
      window._VACANTES_TEMP = data.vacantes || {};
      
      // Deshabilitar edición de cédula
      document.getElementById('inp-cedula').setAttribute('readonly', 'true');
      document.getElementById('inp-cedula').style.background = 'rgba(0,0,0,0.5)';
    }
  };

  const cerrarModal = async (force = false) => {
    if (force === true) {
      modalCrud.style.display = 'none';
      return;
    }
    const ced = document.getElementById('inp-cedula').value.trim();
    const nom = document.getElementById('inp-nombre-apellido').value.trim();
    if (ced || nom) {
      const confirmed = await window.showCustomConfirm('¿Estás seguro de que deseas salir del formulario? Se perderán los datos no guardados.');
      if (confirmed) {
        formCrud.reset();
        modalCrud.style.display = 'none';
      }
    } else {
      modalCrud.style.display = 'none';
    }
  };

  btnNuevoPersonal.addEventListener('click', (e) => {
    if (btnNuevoPersonal.hasAttribute('disabled')) {
      e.preventDefault();
      return;
    }
    abrirModal('NUEVO');
  });
  
  btnCerrarModal.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    cerrarModal();
  });
  btnCancelarModal.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    cerrarModal();
  });

  // Cerrar haciendo clic afuera desactivado a petición del usuario
  // modalCrud.addEventListener('click', (e) => {
  //   if (e.target === modalCrud) cerrarModal();
  // });

  // Validaciones de Cédula y Teléfonos
  const telCelular = document.getElementById('inp-tel-celular');
  const telHabitacion = document.getElementById('inp-tel-habitacion');
  const telOficina = document.getElementById('inp-tel-oficina');
  const inpCedula = document.getElementById('inp-cedula');
  const inpNacionalidad = document.getElementById('inp-nacionalidad');

  const validarCedula = () => {
    const val = parseInt(inpCedula.value);
    const nac = inpNacionalidad.value;
    if (!val) {
      inpCedula.setCustomValidity('');
      return;
    }
    if (nac === 'V') {
      if (val < 900000 || val > 35999999) {
        inpCedula.setCustomValidity('La cédula V debe estar entre 900.000 y 35.999.999');
      } else {
        inpCedula.setCustomValidity('');
      }
    } else {
      if (val < 900000 || val > 84999999) {
        inpCedula.setCustomValidity('La cédula E debe estar entre 900.000 y 84.999.999');
      } else {
        inpCedula.setCustomValidity('');
      }
    }
  };

  inpCedula.addEventListener('input', validarCedula);
  inpCedula.addEventListener('blur', () => { validarCedula(); inpCedula.reportValidity(); });
  inpNacionalidad.addEventListener('change', () => { validarCedula(); inpCedula.reportValidity(); });

  const regexCelular = /^(0416|0426|0414|0424|0412|0422)[0-9]{7}$/;
  const regexFijo = /^(0271|0272|0274|0275|0276|0277|0278)[0-9]{7}$/;
  
  const soloNumeros = (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, '');
  };
  
  telCelular.addEventListener('input', soloNumeros);
  telHabitacion.addEventListener('input', soloNumeros);
  telOficina.addEventListener('input', soloNumeros);

  const validarTelefono = (input, regex, tipo) => {
    if (!input.value) {
      input.setCustomValidity('');
      return;
    }
    if (!regex.test(input.value)) {
      input.setCustomValidity(`Formato inválido. Ejemplo: ${tipo === 'cel' ? '04141234567' : '02741234567'} (sin guiones ni espacios)`);
    } else {
      input.setCustomValidity('');
    }
  };

  telCelular.addEventListener('input', () => validarTelefono(telCelular, regexCelular, 'cel'));
  telHabitacion.addEventListener('input', () => validarTelefono(telHabitacion, regexFijo, 'fijo'));
  telOficina.addEventListener('input', () => validarTelefono(telOficina, regexFijo, 'fijo'));

  telCelular.addEventListener('blur', () => { validarTelefono(telCelular, regexCelular, 'cel'); telCelular.reportValidity(); });
  telHabitacion.addEventListener('blur', () => { validarTelefono(telHabitacion, regexFijo, 'fijo'); telHabitacion.reportValidity(); });
  telOficina.addEventListener('blur', () => { validarTelefono(telOficina, regexFijo, 'fijo'); telOficina.reportValidity(); });

  // Auto-seleccionar todo el texto al hacer focus
  const allInputs = formCrud.querySelectorAll('input, textarea');
  allInputs.forEach(inp => {
    inp.addEventListener('focus', function() {
      this.select();
    });
  });

  // Habilitar/Deshabilitar Código RAC
  selTipoPersonal.addEventListener('change', (e) => {
    const val = (e.target.value || '').toUpperCase();
    if (selCodRac) {
      if (val === 'ADMINISTRATIVO' || val === 'OBRERO') {
        selCodRac.value = '';
        selCodRac.setAttribute('disabled', 'true');
        selCodRac.style.background = 'rgba(0,0,0,0.5)';
      } else {
        selCodRac.removeAttribute('disabled');
        selCodRac.style.background = 'rgba(15, 23, 42, 0.5)';
      }
    }
  });


  btnsEliminar.forEach(btn => {
    btn.onclick = async () => {
      const confirmed = await window.showCustomConfirm('¿Estás seguro de que deseas eliminar este trabajador del sistema? Esta acción es irreversible.');
      if(confirmed) {
        showToast('Simulación: El trabajador ha sido eliminado de la base de datos.', 'info');
      }
    };
  });

  // ==========================================
  // LÓGICA DE CUADRATURA INLINE
  // ==========================================
  const btnAbrirCuadratura = document.getElementById('btn-abrir-cuadratura');
  const contCuadInline = document.getElementById('cont-cuadratura-inline');
  const btnCancelarCuadInline = document.getElementById('btn-cancelar-cuadratura-inline');
  const btnConfirmarCuadInline = document.getElementById('btn-confirmar-cuadratura-inline');
  const cuadInlineContenido = document.getElementById('cuad-inline-contenido');
  const cuadInlineDesc = document.getElementById('cuad-inline-descripcion');
  
  const contCuadraturaResumen = document.getElementById('cont-cuadratura-resumen');
  const cuadraturaResumenTexto = document.getElementById('cuadratura-resumen-texto');

  window._CUADRATURA_TEMP = {};

  selNivelModalidad.addEventListener('change', (e) => {
    const nivel = e.target.value;
    const atiende = document.getElementById('sel-atiende-matricula').value;
    if (nivel && atiende === 'SI') {
      document.getElementById('cont-btn-cuadratura').style.display = 'block';
    } else {
      document.getElementById('cont-btn-cuadratura').style.display = 'none';
      contCuadInline.style.display = 'none';
    }
    // Reiniciar al cambiar
    window._CUADRATURA_TEMP = {};
    contCuadraturaResumen.style.display = 'none';
  });

  const _letraSec = (s, nTotal) => nTotal === 1 ? 'U' : String.fromCharCode(65 + s);
  
  const _distribuirSecciones = (numSec, numGrados) => {
    const base = Math.floor(numSec / numGrados);
    const resto = numSec % numGrados;
    const dist = [];
    for (let g = 0; g < numGrados; g++) {
      dist.push(base + (g < resto ? 1 : 0));
    }
    return dist;
  };

  const _renderBloqueInicial = (titulo, keyPlan, numSec) => {
    const CUAD = window._CUADRATURA_TEMP || {};
    const dataInicialObj = CUAD[keyPlan] || {};
    let html = `<div style="margin-bottom:15px; border:1px solid #475569; border-radius:8px; padding:15px; background:rgba(0,0,0,0.2);">`;
    html += `<h4 style="margin:0 0 10px; font-size: 14px; color:#fbbf24;">${titulo}</h4>`;
    html += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px;">`;
    for (let s = 0; s < numSec; s++) {
      const letra = _letraSec(s, numSec);
      const guardado = dataInicialObj[letra] || 0;
      html += `
        <div style="display:flex; flex-direction:column; gap:5px;">
          <label style="font-size:12px; color:#cbd5e1;">SECCIÓN ${letra}</label>
          <input type="number" min="0" data-plan="${keyPlan}" data-sec="${letra}" class="cuad-input form-input" placeholder="Alumnos" value="${guardado === 0 ? '' : guardado}" style="padding:8px; border-radius:5px; background:rgba(255,255,255,0.1); border:none; color:white; text-align:center;">
        </div>`;
    }
    html += `</div></div>`;
    return html;
  };

  const _renderBloquesPrimaria = (numSec) => {
    const dist = _distribuirSecciones(numSec, 6);
    const ORDINALES = ['1ER', '2DO', '3ER', '4TO', '5TO', '6TO'];
    const dataPri = (window._CUADRATURA_TEMP || {})['primaria'] || {};
    let html = '';
    for (let g = 0; g < 6; g++) {
      if (dist[g] === 0) continue;
      html += `<div style="margin-bottom:15px; border:1px solid #475569; border-radius:8px; padding:15px; background:rgba(0,0,0,0.2);">`;
      html += `<h4 style="margin:0 0 10px; font-size: 14px; color:#fbbf24;">${ORDINALES[g]} GRADO</h4>`;
      html += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(130px, 1fr)); gap:10px;">`;
      for (let s = 0; s < dist[g]; s++) {
        const letra = _letraSec(s, dist[g]);
        const guardado = dataPri[`${g+1}${letra}`] || 0;
        html += `
          <div style="display:flex; flex-direction:column; gap:5px;">
            <label style="font-size:12px; color:#cbd5e1;">SECCIÓN ${letra}</label>
            <input type="number" min="0" data-plan="primaria" data-grado="${g+1}" data-sec="${letra}" class="cuad-input form-input" placeholder="Alumnos" value="${guardado === 0 ? '' : guardado}" style="padding:8px; border-radius:5px; background:rgba(255,255,255,0.1); border:none; color:white; text-align:center;">
          </div>`;
      }
      html += `</div></div>`;
    }
    return html;
  };

  const _renderBloquesMedia = (codigoPlan, isTecnica = false) => {
    const dataPlan = (window._CUADRATURA_TEMP || {})[`p${codigoPlan}`] || {};
    
    // Leer asignaturas reales del plan desde el caché local
    let grados = null;
    const rawCache = localStorage.getItem('sgh_catalogos');
    if (rawCache) {
      try {
        const catalogos = JSON.parse(rawCache);
        const planData = catalogos.planes_estudio?.[String(codigoPlan)];
        if (planData && planData.grados && planData.grados.length > 0) {
          grados = planData.grados;
        }
      } catch(e) { console.error('Error leyendo planes_estudio del caché:', e); }
    }
    
    // Si no hay datos reales, mostrar error en lugar de datos falsos
    if (!grados) {
      return `<div style="padding:15px; color:#ef4444; border:1px solid #ef4444; border-radius:8px;">
        ⚠️ No se encontraron las asignaturas del Plan ${codigoPlan} en el catálogo. Recarga la página.
      </div>`;
    }
    
    let html = `<div style="margin-bottom:15px; border:1px solid #475569; border-radius:8px; padding:0; background:rgba(0,0,0,0.2); overflow:hidden;">`;
    html += `<div style="background:#fbbf24; color:#0f172a; padding:10px 15px; font-weight:bold; font-size:14px;">PLAN ${codigoPlan}</div>`;
    html += `<div style="padding: 15px;">`;
    
    grados.forEach(grado => {
      const anio = grado.anio;
      const label = grado.label || `${anio}° AÑO`;
      const asignaturas = grado.asignaturas || [];
      
      html += `<div style="margin-bottom: 15px; border-bottom: 1px dashed #475569; padding-bottom: 15px;">`;
      html += `<h5 style="margin:0 0 10px; font-size:13px; color:#94a3b8;">${label}</h5>`;
      html += `<div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">`;
      
      asignaturas.forEach(asig => {
        const nombreAsig = asig.nombre || asig;
        const guardado = dataPlan[`${anio}_${nombreAsig}`] || 0;
        html += `
          <div style="display:flex; flex-direction:column; gap:5px;">
            <label style="font-size:11px; color:#cbd5e1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${nombreAsig}">${nombreAsig}</label>
            <input type="number" min="0" data-plan="${codigoPlan}" data-anio="${anio}" data-materia="${nombreAsig}" class="cuad-input form-input" placeholder="Hrs" value="${guardado === 0 ? '' : guardado}" style="padding:8px; border-radius:5px; background:rgba(255,255,255,0.1); border:none; color:white; text-align:center;">
          </div>`;
      });
      
      html += `</div></div>`;
    });
    
    html += `</div></div>`;
    return html;
  };


  btnAbrirCuadratura.addEventListener('click', () => {
    const nivel = selNivelModalidad.value;
    cuadInlineContenido.innerHTML = '';
    
    let html = '';
    if (nivel === 'INICIAL') {
      const mat = parseInt(document.getElementById('secMat').value) || 0;
      const pre = parseInt(document.getElementById('secPre').value) || 0;
      cuadInlineDesc.innerText = 'Ingrese la cantidad de alumnos que atiende este trabajador por sección para Maternal y Preescolar.';
      if (mat > 0) html += _renderBloqueInicial(`MATERNAL (${mat} secciones)`, 'maternal', mat);
      if (pre > 0) html += _renderBloqueInicial(`PREESCOLAR (${pre} secciones)`, 'preescolar', pre);
      if (mat === 0 && pre === 0) html = '<p style="color:#ef4444;">No declaró secciones de Inicial en Matrícula.</p>';
    } 
    else if (nivel === 'PRIMARIA') {
      const priSec = parseInt(document.getElementById('secPri').value) || 0; 
      if (priSec === 0) {
        cuadInlineDesc.innerText = '';
        html = '<p style="color:#ef4444;">⚠️ Debe declarar primero las secciones de Primaria en el Módulo de Matrícula.</p>';
      } else {
        cuadInlineDesc.innerText = 'Ingrese la cantidad de alumnos que atiende por grado y sección.';
        html = _renderBloquesPrimaria(priSec);
      }
    }
    else if (nivel === 'MEDIA GENERAL' || nivel === 'MEDIA TECNICA' || nivel === 'MEDIA GENERAL - MEDIA TECNICA') {
      cuadInlineDesc.innerText = 'Ingrese las horas académicas que imparte por materia y año.';
      const planesDisponibles = new Set();
      document.querySelectorAll('.sec-anio-input').forEach(inp => {
        const plan = inp.dataset.plan;
        if (nivel.includes('MEDIA GENERAL') && plan.startsWith('3')) planesDisponibles.add(plan);
        if (nivel.includes('MEDIA TECNICA') && plan.startsWith('4')) planesDisponibles.add(plan);
      });
      
      if (planesDisponibles.size === 0) {
        html = '<p style="color:#ef4444;">⚠️ Este plantel no tiene planes de estudio registrados para esta modalidad o no has declarado secciones.</p>';
      } else {
        planesDisponibles.forEach(plan => {
          html += _renderBloquesMedia(plan, plan.startsWith('4'));
        });
      }
    }
    else {
      cuadInlineDesc.innerText = '';
      html = `<p style="color:#94a3b8;">Lógica de ${nivel} (Sigue la misma matemática)</p>`;
    }
    
    cuadInlineContenido.innerHTML = html;
    contCuadInline.style.display = 'block';
    updateWizardUI(true); // Prevenir que el scroll salte arriba
    
    // Hacer scroll suave hacia el contenedor inline
    contCuadInline.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  const ocultarInlineCuadratura = () => {
    contCuadInline.style.display = 'none';
    updateWizardUI(true); // Prevenir que el scroll salte arriba
  };
  
  btnCancelarCuadInline.addEventListener('click', ocultarInlineCuadratura);

  btnConfirmarCuadInline.addEventListener('click', () => {
    const inputs = document.querySelectorAll('.cuad-input');
    const resultado = {};
    let totalAsignados = 0;
    
    inputs.forEach(inp => {
      const val = parseInt(inp.value);
      if (val > 0) {
        const plan = inp.dataset.plan;
        if (plan === 'maternal' || plan === 'preescolar') {
          if(!resultado[plan]) resultado[plan] = {};
          resultado[plan][inp.dataset.sec] = val;
        } else if (plan === 'primaria') {
          if(!resultado['primaria']) resultado['primaria'] = {};
          resultado['primaria'][`${inp.dataset.grado}${inp.dataset.sec}`] = val;
        } else {
          // Media / Media Técnica
          const pKey = `p${plan}`;
          if(!resultado[pKey]) resultado[pKey] = {};
          resultado[pKey][`${inp.dataset.anio}_${inp.dataset.materia}`] = val;
        }
        totalAsignados++;
      }
    });
    
    window._CUADRATURA_TEMP = resultado;
    ocultarInlineCuadratura();
    
    if (totalAsignados > 0) {
      contCuadraturaResumen.style.display = 'block';
      cuadraturaResumenTexto.innerText = `Guardados ${totalAsignados} asignaciones en cuadratura (Formato SGH GAS).`;
      contCuadraturaResumen.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      contCuadraturaResumen.style.display = 'none';
    }
  });

  // Guardar Formulario
  // Guardar Formulario en Firebase
  formCrud.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;
    
    // Capturar todos los datos del formulario
    const cedula = document.getElementById('inp-cedula').value.trim();
    if (!cedula) {
      showToast('La cédula es requerida.', 'warning');
      return;
    }
    
    // Deshabilitar botón para evitar dobles envíos
    const btnSubmit = document.getElementById('btn-wizard-submit');
    const oldText = btnSubmit.innerText;
    btnSubmit.innerText = 'Guardando...';
    btnSubmit.disabled = true;

    try {
      const payload = {};
      // Campos de solo lectura e informativos que NO se guardan en Firestore
      const CAMPOS_EXCLUIDOS = ['inp-descripcion-estatus'];
      const inputs = formCrud.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.id && !input.id.startsWith('btn') && input.type !== 'submit' && !CAMPOS_EXCLUIDOS.includes(input.id)) {
          let val = input.value.trim();
          // Transformar todo a mayúscula excepto correo electrónico
          if (input.type !== 'email' && typeof val === 'string') {
            val = val.toUpperCase();
          }
          let key = input.id.replace('inp-', '').replace('sel-', '');
          payload[key] = val;
        }
      });
      
      // Añadir objetos complejos
      payload.cuadratura = window._CUADRATURA_TEMP || {};
      payload.vacantes = window._VACANTES_TEMP || {};
      payload.creado_en = new Date().toISOString();
      payload.actualizado_en = new Date().toISOString();

      // Guardar en la colección cargos_personal con el ID = cédula
      await setDoc(doc(db, 'cargos_personal', cedula), payload);
      
      showToast(`¡Éxito! Los datos del trabajador ${payload['nombre-apellido'] || payload.cedula} han sido guardados en Firestore.`, 'success');
      
      // Limpiar todo y volver al inicio
      formCrud.reset();
      window._CUADRATURA_TEMP = {};
      window._VACANTES_TEMP = {};
      document.getElementById('cuad-inline-contenido').innerHTML = '';
      document.getElementById('cont-btn-cuadratura').style.display = 'none';
      document.getElementById('cont-cuadratura-inline').style.display = 'none';
      document.getElementById('cont-cuadratura-resumen').style.display = 'none';
      // Ocultar resumen de vacantes solo si existe (algunos planteles la crean, otros no)
      const elVacResumen = document.getElementById('cont-vacantes-resumen');
      if (elVacResumen) elVacResumen.style.display = 'none';
      
      currentStep = 1;
      updateWizardUI();
      cerrarModal(true);

    } catch (error) {
      console.error('Error guardando documento:', error);
      showToast('Error al guardar: ' + error.message, 'error');
    } finally {
      btnSubmit.innerText = oldText;
      btnSubmit.disabled = false;
    }
  });

  // ==========================================
  
  // Lógica del Trono del Todopoderoso (Crear Altos Cargos)
  const formCrearJefe = document.getElementById('form-crear-jefe');
  if (formCrearJefe) {
    const selVipRol = document.getElementById('vip-rol');
    const groupMunicipio = document.getElementById('group-municipio');
    const selVipMunicipio = document.getElementById('vip-municipio');
    
    // Cargar municipios dinámicamente desde el catálogo
    if (selVipMunicipio && selVipMunicipio.options.length <= 4) {
      selVipMunicipio.innerHTML = '<option value="">Selecciona...</option>';
      MUNICIPIOS_MERIDA.forEach(mun => {
        selVipMunicipio.add(new Option(mun, mun));
      });
    }
    
    selVipRol.addEventListener('change', (e) => {
      // Mostrar selector de municipio solo si es Jefe de Municipio
      if (e.target.value === 'munadmin') {
        groupMunicipio.style.display = 'block';
        document.getElementById('vip-municipio').required = true;
      } else {
        groupMunicipio.style.display = 'none';
        document.getElementById('vip-municipio').required = false;
      }
    });

    formCrearJefe.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const btnSubmit = formCrearJefe.querySelector('button[type="submit"]') || formCrearJefe.querySelector('.btn');
      const oldText = btnSubmit ? btnSubmit.innerText : 'Crear';
      if (btnSubmit) { btnSubmit.innerText = 'Creando...'; btnSubmit.disabled = true; }

      try {
        console.log("Iniciando creación de VIP...");
        const rol = selVipRol.value;
        const nombre = document.getElementById('vip-nombre').value.trim();
        const ubicacion = document.getElementById('vip-ubicacion').value.trim();
        const email = document.getElementById('vip-email').value.trim();
        const password = document.getElementById('vip-password').value;
        const municipio = document.getElementById('vip-municipio').value;
        
        console.log("Datos recolectados:", {rol, nombre, ubicacion, email, municipio});

        // 1. Crear usuario fantasma (sin cerrar la sesión del todopoderoso)
        console.log("Creando usuario fantasma en Firebase Auth...");
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        const newUser = userCredential.user;
        console.log("Usuario Auth creado exitosamente. UID:", newUser.uid);
        
        // 2. Crear documento de perfil en Firestore usando la base de datos de la sesión fantasma
        const jerarquia = { estado: 'MERIDA' };
        if (rol === 'munadmin') {
          jerarquia.municipio = municipio.toUpperCase();
        }

        console.log("Guardando documento en Firestore usando secondaryDb...");
        await setDoc(doc(secondaryDb, 'usuarios', newUser.uid), {
          email: email,
          nombre: nombre,
          ubicacion: ubicacion,
          rol: rol,
          estado_aprobacion: 'APROBADO', // Nace aprobado por decreto divino
          jerarquia: jerarquia,
          creado_en: new Date().toISOString()
        });
        console.log("Documento guardado en Firestore con éxito.");

        showToast(`La cuenta VIP (${email}) para ${nombre} ha sido creada con éxito.`, 'success');
        formCrearJefe.reset();
        groupMunicipio.style.display = 'none';
        
        loadVipUsers(); // Recargar la lista

        // 3. Destruir la sesión fantasma
        console.log("Cerrando sesión fantasma...");
        await signOut(secondaryAuth);
        console.log("Operación completada al 100%.");
        
      } catch (error) {
        console.error("================ ERROR AL CREAR VIP ================");
        console.error("Código de error:", error.code);
        console.error("Mensaje detallado:", error.message);
        console.error("Stack trace:", error.stack);
        showToast('Error: ' + error.message, 'error');
      } finally {
        if (btnSubmit) { btnSubmit.innerText = oldText; btnSubmit.disabled = false; }
      }
    });
  }

  // ==========================================
  // Función para cargar usuarios activos
  async function loadVipUsers() {
    const listContainer = document.getElementById('vip-users-list');
    if (!listContainer) return;
    listContainer.innerHTML = '<p style="color: #94a3b8; font-size: 13px;">Cargando usuarios...</p>';

    try {
      const q = query(collection(db, 'usuarios'), where('estado_aprobacion', '==', 'APROBADO'));
      const querySnapshot = await getDocs(q);
      
      listContainer.innerHTML = '';
      
      let count = 0;
      querySnapshot.forEach((documento) => {
        const u = documento.data();
        if (u.rol === 'superadmin') return; // No listar al todopoderoso
        
        const loc = u.jerarquia?.municipio || u.jerarquia?.plantel_codigo || 'Estado';
        const name = u.nombre || u.email;
        count++;

        const div = document.createElement('div');
        div.className = 'jefe-item';
        div.innerHTML = `
          <div class="jefe-info">
            <strong>${name}</strong>
            <span class="jefe-rol">${u.rol} (${loc})</span>
          </div>
          <button class="btn danger-btn btn-revocar" data-uid="${documento.id}">Desvincular</button>
        `;
        listContainer.appendChild(div);
      });

      if (count === 0) {
        listContainer.innerHTML = '<p style="color: #94a3b8; font-size: 13px;">No hay directores registrados aún.</p>';
      }

      // Add event listeners for revocar
      const btnsRevocar = listContainer.querySelectorAll('.btn-revocar');
      btnsRevocar.forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const uid = e.target.getAttribute('data-uid');
          const confirmed = await window.showCustomConfirm('¿Estás seguro de desvincular a este usuario? Ya no podrá acceder al sistema.');
          if (confirmed) {
            try {
              e.target.innerText = 'Desvinculando...';
              e.target.disabled = true;
              await updateDoc(doc(db, 'usuarios', uid), {
                estado_aprobacion: 'REVOCADO'
              });
              showToast('Usuario desvinculado permanentemente.', 'success');
              loadVipUsers();
            } catch (err) {
              console.error(err);
              showToast('Error al desvincular: ' + err.message, 'error');
              e.target.innerText = 'Desvincular';
              e.target.disabled = false;
            }
          }
        });
      });

    } catch(err) {
      console.error("Error al cargar VIPs", err);
      listContainer.innerHTML = '<p style="color: red; font-size: 13px;">Error al cargar la lista.</p>';
    }
  }
  // ==========================================

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch(e) {
      console.error(e);
      window.location.href = "/";
    }
  });
});

// ==========================================
// LÓGICA DE CATÁLOGOS MAESTROS (MEGA-DOCUMENTO)
// ==========================================
window.poblarSelectoresDesdeCache = function() {
  const rawCache = localStorage.getItem('sgh_catalogos');
  if (!rawCache) return;

  try {
    const catalogos = JSON.parse(rawCache);
    const listas = catalogos.listas_desplegables || {};
    
    // Función ayudante para llenar selects
    const llenarSelect = (id, arrayValores) => {
      const select = document.getElementById(id);
      if (!select || !arrayValores || !Array.isArray(arrayValores)) return;
      
      // Limpiar opciones previas (excepto la primera)
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      arrayValores.forEach(val => {
        const option = document.createElement('option');
        const strVal = String(val).toUpperCase();
        option.value = strVal;
        option.text = strVal;
        select.appendChild(option);
      });
    };

    // Llenar Vivienda
    llenarSelect('sel-tipo-vivienda', listas.tipo_vivienda);
    llenarSelect('sel-condicion-vivienda', listas.condicion_vivienda);
    
    // Llenar Datos Personales
    llenarSelect('sel-estado-civil', listas.estado_civil);
    llenarSelect('sel-instruccion', listas.instruccion);
    
    // Llenar Nivel y Modalidad (los unimos y filtramos las mixtas indeseadas)
    const excluidos = [
      "INICIAL-PRIMARIA-MEDIA GENERAL", 
      "INICIAL-PRIMARIA-MEDIA TECNICA", 
      "PRIMARIA - MEDIA GENERAL", 
      "PRIMARIA - MEDIA TECNICA"
    ];
    let nivelesFiltrados = (listas.niveles_educativos || []).filter(n => !excluidos.includes(n));
    const nivelModalidad = [...nivelesFiltrados, ...(listas.modalidades || [])].filter(n => {
      const up = String(n).toUpperCase();
      return !up.includes('ADULTO') && !up.includes('ESPECIAL');
    });
    llenarSelect('sel-nivel-modalidad', nivelModalidad);
    
    // Llenar Dependencia
    const depExcluidas = ["MUNICIPAL", "SUBVENCIONADA", "PRIVADO", "AUTONOMA"];
    const dependenciasFiltradas = (listas.dependencia || []).filter(d => !depExcluidas.includes(String(d).toUpperCase()));
    llenarSelect('admin-plantel-dependencia', dependenciasFiltradas);
    llenarSelect('sel-dependencia', dependenciasFiltradas);

    // Llenar Estatus (Situación Laboral)
    const selEstatus = document.getElementById('sel-situacion-laboral');
    if (selEstatus && catalogos.situacion_laboral) {
      while (selEstatus.options.length > 1) selEstatus.remove(1);
      Object.keys(catalogos.situacion_laboral).forEach(key => {
        const option = document.createElement('option');
        option.value = key;
        option.text = key;
        selEstatus.appendChild(option);
      });
    }

  } catch (err) {
    console.error('Error poblando selectores desde caché:', err);
  }
};









