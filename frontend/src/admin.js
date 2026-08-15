import { doc, getDoc, setDoc, updateDoc, collection, query, where, getCountFromServer, getDocs, deleteDoc } from 'firebase/firestore';

export function initAdminDashboard(db, userData) {
  // Lógica de Pestañas (Sidebar)
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const button = e.target.closest('.sidebar-btn');
      if(!button) return;

      // Logica de Acordeon
      if (button.classList.contains('accordion-btn')) {
         button.classList.toggle('open');
         const content = button.nextElementSibling;
         if (content && content.classList.contains('accordion-content')) {
            if (content.style.display === 'flex') {
               content.style.display = 'none';
               button.querySelector('.arrow').style.transform = 'rotate(0deg)';
            } else {
               content.style.display = 'flex';
               button.querySelector('.arrow').style.transform = 'rotate(-180deg)';
            }
         }
         return; // No navegar ni cerrar el sidebar
      }

      // Navegacion normal
      document.querySelectorAll('.sidebar-btn').forEach(b => {
         if(!b.classList.contains('accordion-btn')) b.classList.remove('active');
      });
      document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
      
      button.classList.add('active');
      const targetId = button.getAttribute('data-target');
      if(targetId) {
         document.getElementById(targetId).classList.add('active');
         if (targetId === 'admin-tab-planteles' && typeof currentPlanteles !== 'undefined' && currentPlanteles.length === 0) { loadPlanteles(); }
         if (targetId === 'admin-tab-planes' && typeof catalogosGlobal !== 'undefined' && (!catalogosGlobal['planes-estudio'] || Object.keys(catalogosGlobal['planes-estudio']).length === 0)) { loadCatalogos(); }
         if (targetId === 'admin-tab-listas') { 
            const lista = button.getAttribute('data-lista');
            const tipo = button.getAttribute('data-tipo');
            if(typeof window.loadListasMaestras === 'function') window.loadListasMaestras(lista, tipo); 
         }
      }
      
      if(typeof window.closeSidebar === 'function') window.closeSidebar();
    });
  });

  // Cargar Estadísticas (Tab por Defecto)
  async function loadEstadisticas() {
    try {
      // Plan Cero Costo: getCountFromServer (1 read por 1000 documentos)
      const snapPersonal = await getCountFromServer(collection(db, 'cargos_personal'));
      const totalPersonal = snapPersonal.data().count;
      
      const snapUsuarios = await getCountFromServer(collection(db, 'usuarios'));
      const totalUsuarios = snapUsuarios.data().count;

      const qPlanteles = query(collection(db, 'usuarios'), where('rol', '==', 'plaadmin'));
      const snapPlanteles = await getCountFromServer(qPlanteles);
      const totalPlanteles = snapPlanteles.data().count;

      const elUsuarios = document.getElementById('stat-usuarios');
      const elPersonal = document.getElementById('stat-personal');
      const elPlanteles = document.getElementById('stat-planteles');
      
      if(elUsuarios) elUsuarios.textContent = totalUsuarios;
      
      if(elPersonal) elPersonal.textContent = totalPersonal;
      if(elPlanteles) elPlanteles.textContent = totalPlanteles;
    } catch(err) {
      console.error("Error cargando estadísticas", err);
    }
  }
  
  loadEstadisticas();

  // --- LÓGICA DE VALIDACIÓN DE USUARIOS ---
  const tbodyUsuarios = document.getElementById('tbody-usuarios');
  const filterEstado = document.getElementById('filter-estado');
  let usuariosLocales = []; // Cache local para filtrar

  async function loadUsuariosList() {
    try {
      if(tbodyUsuarios) tbodyUsuarios.innerHTML = '<tr><td colspan="4" style="padding: 30px; text-align: center; color: var(--text-muted);">Cargando usuarios...</td></tr>';
      
      const q = query(collection(db, 'usuarios')); // Traemos todos para filtrar en cliente rápido
      const snap = await getDocs(q);
      
      usuariosLocales = [];
      snap.forEach(doc => {
        const u = doc.data();
        u.uid = doc.id;
        // Evitar que un superadmin se borre a sí mismo accidentalmente o a otros admins
        if (u.rol !== 'admin' && u.rol !== 'superadmin') {
          usuariosLocales.push(u);
        }
      });
      
      renderUsuariosList();
    } catch(err) {
      console.error("Error cargando lista de usuarios", err);
      if(tbodyUsuarios) tbodyUsuarios.innerHTML = '<tr><td colspan="4" style="padding: 30px; text-align: center; color: var(--danger);">Error cargando usuarios</td></tr>';
    }
  }

  
  // --- CUSTOM CONFIRM DIALOG ---
  function showConfirm(title, text, type = 'danger') {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-confirm');
      const titleEl = document.getElementById('confirm-title');
      const textEl = document.getElementById('confirm-text');
      const iconEl = document.getElementById('confirm-icon');
      const btnOk = document.getElementById('btn-confirm-ok');
      const btnCancel = document.getElementById('btn-confirm-cancel');
      
      titleEl.textContent = title;
      textEl.textContent = text;
      
      if (type === 'success') {
        iconEl.textContent = '✅';
        btnOk.style.background = 'var(--success)';
      } else {
        iconEl.textContent = '⚠️';
        btnOk.style.background = 'var(--danger)';
      }
      
      modal.style.display = 'flex';
      
      const cleanup = () => {
        btnOk.onclick = null;
        btnCancel.onclick = null;
        modal.style.display = 'none';
      };
      
      btnOk.onclick = () => { cleanup(); resolve(true); };
      btnCancel.onclick = () => { cleanup(); resolve(false); };
    });
  }
  
  
  function showPromptDual(title, text, defaultKey = '', defaultVal = '') {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-prompt-dual');
      const titleEl = document.getElementById('prompt-dual-title');
      const textEl = document.getElementById('prompt-dual-text');
      const keyEl = document.getElementById('prompt-dual-key');
      const valEl = document.getElementById('prompt-dual-val');
      const btnOk = document.getElementById('btn-prompt-dual-ok');
      const btnCancel = document.getElementById('btn-prompt-dual-cancel');
      
      titleEl.textContent = title;
      textEl.textContent = text;
      keyEl.value = defaultKey;
      valEl.value = defaultVal;
      
      modal.style.display = 'flex';
      keyEl.focus();
      
      const cleanup = () => {
        btnOk.onclick = null;
        btnCancel.onclick = null;
        modal.style.display = 'none';
      };
      
      btnOk.onclick = () => { cleanup(); resolve({ key: keyEl.value, val: valEl.value }); };
      btnCancel.onclick = () => { cleanup(); resolve(null); };
    });
  }

  function showPrompt(title, text, defaultValue = '') {
    return new Promise((resolve) => {
      const modal = document.getElementById('modal-prompt');
      const titleEl = document.getElementById('prompt-title');
      const textEl = document.getElementById('prompt-text');
      const inputEl = document.getElementById('prompt-input');
      const btnOk = document.getElementById('btn-prompt-ok');
      const btnCancel = document.getElementById('btn-prompt-cancel');
      
      titleEl.textContent = title;
      textEl.textContent = text;
      inputEl.value = defaultValue;
      
      modal.style.display = 'flex';
      inputEl.focus();
      
      const cleanup = () => {
        btnOk.onclick = null;
        btnCancel.onclick = null;
        modal.style.display = 'none';
      };
      
      btnOk.onclick = () => { cleanup(); resolve(inputEl.value); };
      btnCancel.onclick = () => { cleanup(); resolve(null); };
      
      // Also allow Enter key
      inputEl.onkeydown = (e) => {
         if (e.key === 'Enter') {
             cleanup(); resolve(inputEl.value);
         }
      };
    });
  }

  function renderUsuariosList() {
    if (!tbodyUsuarios) return;
    
    const filtro = filterEstado.value; // "TODOS", "PENDIENTE", "APROBADO"
    const filtrados = usuariosLocales.filter(u => filtro === 'TODOS' ? true : u.estado_aprobacion === filtro);

    if (filtrados.length === 0) {
      tbodyUsuarios.innerHTML = '<tr><td colspan="4" style="padding: 30px; text-align: center; color: var(--text-muted);">No se encontraron usuarios</td></tr>';
      return;
    }

    tbodyUsuarios.innerHTML = filtrados.map(u => {
      // Determinar ubicación
      let ubicacion = 'N/A';
      if (u.jerarquia) {
        if (u.rol === 'plaadmin' && u.jerarquia.plantel_codigo) ubicacion = `Plantel: ${u.jerarquia.plantel_codigo}`;
        else if (u.jerarquia.municipio) ubicacion = `Municipio: ${u.jerarquia.municipio}`;
        else ubicacion = `Estado: ${u.jerarquia.estado || 'MERIDA'}`;
      }

      const isAprobado = u.estado_aprobacion === 'APROBADO';
      
      return `
        <tr style="border-bottom: 1px solid var(--glass-border); transition: background 0.2s;">
          <td style="padding: 15px 20px;">
            <div style="font-weight: 600; color: var(--text-main);">${u.nombre || 'Sin nombre'}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${u.email} <br> C.I: ${u.cedula}</div>
          </td>
          <td style="padding: 15px 20px;">
            <div style="font-weight: 500; color: var(--primary-color);">${u.rol.toUpperCase()}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">${ubicacion}</div>
          </td>
          <td style="padding: 15px 20px;">
            <span style="padding: 5px 10px; border-radius: 20px; font-size: 0.75rem; font-weight: bold; 
              background: ${isAprobado ? '#dcfce7' : '#fef3c7'}; 
              color: ${isAprobado ? '#166534' : '#b45309'};">
              ${u.estado_aprobacion || 'DESCONOCIDO'}
            </span>
          </td>
          <td style="padding: 15px 20px; text-align: right; display: flex; gap: 8px; justify-content: flex-end;">
            ${!isAprobado ? `<button class="btn-aprobar" data-uid="${u.uid}" style="width: auto; padding: 6px 12px; font-size: 0.85rem; background: var(--success);">Aprobar</button>` : ''}
            <button class="btn-eliminar btn-secondary" data-uid="${u.uid}" style="width: auto; padding: 6px 12px; font-size: 0.85rem; border-color: var(--danger); color: var(--danger);">${isAprobado ? 'Eliminar' : 'Rechazar'}</button>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de botones
    document.querySelectorAll('.btn-aprobar').forEach(btn => {
      btn.onclick = async (e) => {
        const uid = e.target.getAttribute('data-uid');
        const conf = await showConfirm("¿Aprobar Acceso?", "El usuario tendrá permiso para ingresar al sistema.", "success");
        if(conf) {
          e.target.disabled = true;
          e.target.textContent = '...';
          try {
            await updateDoc(doc(db, 'usuarios', uid), { estado_aprobacion: 'APROBADO' });
            await loadUsuariosList();
            loadEstadisticas(); // Actualiza contadores
          } catch(err) {
            console.error(err);
            showConfirm("Error", "Ocurrió un problema al aprobar el usuario.", "danger");
          }
        }
      };
    });

    document.querySelectorAll('.btn-eliminar').forEach(btn => {
      btn.onclick = async (e) => {
        const uid = e.target.getAttribute('data-uid');
        const conf = await showConfirm("Eliminar Perfil", "Esta acción es irreversible. El usuario perderá acceso al sistema.", "danger");
        if(conf) {
          e.target.disabled = true;
          e.target.textContent = '...';
          try {
            await deleteDoc(doc(db, 'usuarios', uid));
            await loadUsuariosList();
            loadEstadisticas(); // Actualiza contadores
          } catch(err) {
            console.error(err);
            showConfirm("Error", "Ocurrió un problema al eliminar el usuario.", "danger");
          }
        }
      };
    });
  }

  if (filterEstado) {
    filterEstado.addEventListener('change', renderUsuariosList);
  }

  // Cargar lista al iniciar
  loadUsuariosList();
  // ----------------------------------------

  // Variables para Despliegue
  const grid = document.getElementById('despliegue-grid');
  const expList = document.getElementById('excepciones-list');
  const btnSave = document.getElementById('btn-save-despliegue');
  const btnAddExp = document.getElementById('btn-add-excepcion');
  const inpNewExp = document.getElementById('inp-new-excepcion');
  const statusSpan = document.getElementById('despliegue-status');
  const btnLogout = document.getElementById('btn-logout-admin');

  if (btnLogout) {
    btnLogout.onclick = () => {
       import('firebase/auth').then(({ getAuth, signOut }) => {
           signOut(getAuth());
       });
    };
  }

  const MUNICIPIOS_MERIDA = [
    "ALBERTO ADRIANI", "ANDRES BELLO", "ANTONIO PINTO SALINAS", // Note: En bd_sgh.json it's SALINAS or SALINA?
    "ARICAGUA", "ARZOBISPO CHACON", "CAMPO ELIAS",
    "CARACCIOLO PARRA", "CARDENAL QUINTERO", "GUARAQUE",
    "JULIO CESAR", "JUSTO BRICEÑO", "LIBERTADOR",
    "MIRANDA", "OBISPO RAMOS DE LORA", "PADRE NOGUERA",
    "PUEBLO LLANO", "RANGEL", "RIVAS DAVILA",
    "SANTOS MARQUINA", "SUCRE", "TOVAR",
    "TULIO FEBRES", "ZEA"
  ];

  let configActual = { municipios_activos: [], excepciones: [] };
  const docRef = doc(db, 'configuracion', 'despliegue');

  async function loadConfig() {
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        configActual = snap.data();
      } else {
        await setDoc(docRef, configActual);
      }
      if (!configActual.municipios_activos) configActual.municipios_activos = [];
      if (!configActual.excepciones) configActual.excepciones = [];
      
      renderGrid();
      renderExcepciones();
    } catch(err) {
      console.error("Error cargando configuración", err);
    }
  }

  function renderGrid() {
    grid.innerHTML = MUNICIPIOS_MERIDA.map(mun => {
      const isActive = configActual.municipios_activos.includes(mun);
      return `
      <div style="background:white; border-radius:8px; padding:16px; display:flex; align-items:center; justify-content:space-between; border:1px solid ${isActive ? '#10B981' : '#e2e8f0'};">
        <span style="font-size:0.9rem; font-weight:600; color:${isActive ? '#10B981' : 'var(--text-muted)'};">${mun}</span>
        <label style="position:relative; display:inline-block; width:46px; height:24px; cursor:pointer;">
          <input type="checkbox" data-mun="${mun}" class="mun-toggle" ${isActive ? 'checked' : ''} style="opacity:0;width:0;height:0;">
          <span style="position:absolute; top:0; left:0; right:0; bottom:0; background:${isActive ? '#10B981' : 'rgba(255,255,255,0.2)'}; border-radius:24px; transition:0.3s;"></span>
          <span style="position:absolute; top:3px; left:${isActive ? '25px' : '3px'}; width:18px; height:18px; background:#fff; border-radius:50%; transition:0.3s;"></span>
        </label>
      </div>`;
    }).join('');

    // Bind events
    document.querySelectorAll('.mun-toggle').forEach(chk => {
      chk.onchange = (e) => {
        const mun = e.target.dataset.mun;
        if (e.target.checked) {
          if (!configActual.municipios_activos.includes(mun)) configActual.municipios_activos.push(mun);
        } else {
          configActual.municipios_activos = configActual.municipios_activos.filter(m => m !== mun);
        }
        renderGrid();
      };
    });
  }

  function renderExcepciones() {
    if (configActual.excepciones.length === 0) {
      expList.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No hay excepciones registradas.</p>';
      return;
    }
    expList.innerHTML = configActual.excepciones.map(cod => `
      <div style="background:white; padding:10px 15px; border-radius:6px; display:flex; justify-content:space-between; align-items:center; border:1px solid #e2e8f0;">
        <span>${cod}</span>
        <button class="btn-remove-exp" data-cod="${cod}" style="background:transparent; border:none; color:#dc3545; cursor:pointer; font-weight:bold;">X</button>
      </div>
    `).join('');

    document.querySelectorAll('.btn-remove-exp').forEach(btn => {
      btn.onclick = (e) => {
        const cod = e.target.dataset.cod;
        configActual.excepciones = configActual.excepciones.filter(c => c !== cod);
        renderExcepciones();
      };
    });
  }

  btnAddExp.onclick = () => {
    const val = inpNewExp.value.trim().toUpperCase();
    if (val && !configActual.excepciones.includes(val)) {
      configActual.excepciones.push(val);
      inpNewExp.value = '';
      renderExcepciones();
    }
  };

  btnSave.onclick = async () => {
    try {
      btnSave.textContent = 'Guardando...';
      btnSave.disabled = true;
      await updateDoc(docRef, {
        municipios_activos: configActual.municipios_activos,
        excepciones: configActual.excepciones
      });
      // Update cache
      sessionStorage.setItem('sgh_despliegue_config', JSON.stringify(configActual));
      statusSpan.textContent = '¡Guardado con éxito!';
      setTimeout(() => statusSpan.textContent = '', 3000);
    } catch(err) {
      console.error(err);
      statusSpan.textContent = 'Error al guardar';
      statusSpan.style.color = '#dc3545';
    } finally {
      btnSave.textContent = 'Guardar Despliegue';
      btnSave.disabled = false;
    }
  };

  loadConfig();

    // --- GESTOR DE BD: CATALOGOS MAESTROS (PLANES DE ESTUDIO) ---
  let catalogosGlobal = {};
  let editingPlan = null; // Stores a deep copy of the plan being edited
  let currentYearTab = 1;

  const btnNuevoPlan = document.getElementById('btn-nuevo-plan');
  const btnVolverGrid = document.getElementById('btn-volver-grid-planes');
  const btnGuardarPlan = document.getElementById('btn-guardar-plan');
  const vistaGrid = document.getElementById('cat-vista-grid');
  const vistaEditor = document.getElementById('cat-vista-editor');
  const gridPlanes = document.getElementById('grid-planes-estudio');
  const tabsAnios = document.getElementById('ep-tabs-anios');
  const tbodyMaterias = document.getElementById('ep-tbody-materias');
  
  // Bind tabs navigation to load catalogos if not loaded
  document.querySelectorAll('.db-subtab-btn').forEach(btn => {
     btn.addEventListener('click', (e) => {
        if(e.target.getAttribute('data-target') === 'db-catalogos' && Object.keys(catalogosGlobal).length === 0) {
           loadCatalogos();
        }
     });
  });

  async function loadCatalogos() {
    if(!gridPlanes) return;
    try {
      const snap = await getDoc(doc(db, "sistema", "catalogos_maestros"));
      if(snap.exists()) {
        catalogosGlobal = snap.data();
        renderPlanesGrid();
      }
    } catch(err) {
      console.error("Error loading catalogos:", err);
      gridPlanes.innerHTML = '<p style="color:var(--danger);">Error cargando catálogos.</p>';
    }
  }

  function renderPlanesGrid() {
    if(!gridPlanes || !catalogosGlobal.planes_estudio) return;
    gridPlanes.innerHTML = '';
    
    const planes = catalogosGlobal.planes_estudio;
    Object.keys(planes).forEach(cod => {
       const plan = planes[cod];
       const card = document.createElement('div');
       card.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between;';
       
       card.innerHTML = `
         <div>
           <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
             <span style="background: rgba(37,99,235,0.1); color: var(--primary-color); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-family: monospace; font-weight: bold;">${cod}</span>
             <span style="font-size: 0.8rem; color: var(--text-muted);">${plan.numAnios || '?'} Años</span>
           </div>
           <h4 style="margin: 0 0 5px; color: var(--text-main); font-size: 1.1rem;">${plan.especialidad || 'Sin Especialidad'}</h4>
           <p style="margin: 0; color: var(--text-muted); font-size: 0.9rem;">${plan.mencion || 'Sin Mención'}</p>
         </div>
         <button class="btn-config-plan" data-cod="${cod}" style="margin-top: 20px; width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; color: var(--primary-color); padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold;">⚙️ Configurar</button>
       `;
       gridPlanes.appendChild(card);
    });

    document.querySelectorAll('.btn-config-plan').forEach(b => {
       b.onclick = () => openPlanEditor(b.getAttribute('data-cod'));
    });
  }

  if(btnNuevoPlan) {
    btnNuevoPlan.onclick = () => {
      editingPlan = { isNew: true, codigo: '', especialidad: '', mencion: '', numAnios: 1, grados: [{ anio: 1, label: "1ER AÑO", asignaturas: [] }] };
      currentYearTab = 1;
      showEditor();
    };
  }

  if(btnVolverGrid) {
    btnVolverGrid.onclick = () => {
       vistaEditor.style.display = 'none';
       vistaGrid.style.display = 'block';
    };
  }

  function openPlanEditor(cod) {
     const planOriginal = catalogosGlobal.planes_estudio[cod];
     // Deep copy to not mutate global state until save
     editingPlan = JSON.parse(JSON.stringify(planOriginal));
     editingPlan.isNew = false;
     editingPlan.oldCodigo = cod;
     
     if(!editingPlan.grados) editingPlan.grados = [];
     
     currentYearTab = editingPlan.grados.length > 0 ? editingPlan.grados[0].anio : 1;
     showEditor();
  }

  function showEditor() {
     document.getElementById('titulo-editor-plan').innerText = editingPlan.isNew ? 'Nuevo Plan de Estudio' : `Editando Plan ${editingPlan.codigo}`;
     
     document.getElementById('ep-codigo').value = editingPlan.codigo || '';
     document.getElementById('ep-especialidad').value = editingPlan.especialidad || '';
     document.getElementById('ep-mencion').value = editingPlan.mencion || '';
     document.getElementById('ep-numanios').value = editingPlan.numAnios || 1;
     
     renderYearTabs();
     renderMaterias();
     
     vistaGrid.style.display = 'none';
     vistaEditor.style.display = 'block';
  }

  document.getElementById('ep-numanios')?.addEventListener('change', (e) => {
     const val = parseInt(e.target.value) || 1;
     editingPlan.numAnios = val;
     // Re-adjust grados array
     const currentGrados = editingPlan.grados || [];
     const newGrados = [];
     for(let i = 1; i <= val; i++) {
        const existing = currentGrados.find(g => g.anio === i);
        if(existing) newGrados.push(existing);
        else {
           const labels = ['1ER', '2DO', '3ER', '4TO', '5TO', '6TO'];
           newGrados.push({ anio: i, label: `${labels[i-1] || i} AÑO`, asignaturas: [] });
        }
     }
     editingPlan.grados = newGrados;
     if(currentYearTab > val) currentYearTab = val;
     renderYearTabs();
     renderMaterias();
  });

  function renderYearTabs() {
    tabsAnios.innerHTML = '';
    (editingPlan.grados || []).forEach(g => {
       const b = document.createElement('button');
       b.innerText = g.label;
       b.style.cssText = `padding: 8px 16px; border: none; background: ${currentYearTab === g.anio ? 'white' : 'transparent'}; border-top-left-radius: 6px; border-top-right-radius: 6px; cursor: pointer; font-weight: ${currentYearTab === g.anio ? 'bold' : 'normal'}; color: ${currentYearTab === g.anio ? 'var(--primary-color)' : 'var(--text-muted)'}; border: 1px solid ${currentYearTab === g.anio ? '#e2e8f0' : 'transparent'}; border-bottom: none; margin-bottom: -2px;`;
       if(currentYearTab === g.anio) b.style.boxShadow = '0 -2px 5px rgba(0,0,0,0.02)';
       
       b.onclick = () => {
          currentYearTab = g.anio;
          renderYearTabs();
          renderMaterias();
       };
       tabsAnios.appendChild(b);
    });
  }

  function renderMaterias() {
     tbodyMaterias.innerHTML = '';
     const grado = (editingPlan.grados || []).find(g => g.anio === currentYearTab);
     if(!grado) return;

     grado.asignaturas.forEach((asig, index) => {
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #e2e8f0';
        tr.innerHTML = `
          <td style="padding: 10px 15px; color: var(--text-main);">${asig.nombre}</td>
          <td style="padding: 10px 15px; color: var(--text-main);">${asig.horas}</td>
          <td style="padding: 10px 15px; text-align: right;">
            <button class="btn-del-mat" data-idx="${index}" style="background: transparent; border: none; color: var(--danger); cursor: pointer; font-size: 1.1rem;">🗑️</button>
          </td>
        `;
        tbodyMaterias.appendChild(tr);
     });

     document.querySelectorAll('.btn-del-mat').forEach(b => {
        b.onclick = () => {
           grado.asignaturas.splice(b.getAttribute('data-idx'), 1);
           renderMaterias();
        };
     });
  }

  if(document.getElementById('btn-add-materia')) {
     document.getElementById('btn-add-materia').onclick = () => {
        const inpN = document.getElementById('ep-nueva-materia');
        const inpH = document.getElementById('ep-nuevas-horas');
        const nombre = inpN.value.toUpperCase().trim();
        const horas = parseInt(inpH.value);
        
        if(!nombre || isNaN(horas) || horas < 1) {
           showConfirm("Atención", "Debes ingresar un nombre y horas válidas.", "danger");
           return;
        }

        const grado = (editingPlan.grados || []).find(g => g.anio === currentYearTab);
        if(grado) {
           grado.asignaturas.push({ nombre, horas });
           inpN.value = '';
           inpH.value = '';
           renderMaterias();
        }
     };
  }

  if(btnGuardarPlan) {
     btnGuardarPlan.onclick = async () => {
        const codigoForm = document.getElementById('ep-codigo').value.trim();
        const esp = document.getElementById('ep-especialidad').value.toUpperCase().trim();
        const men = document.getElementById('ep-mencion').value.toUpperCase().trim();
        const numA = parseInt(document.getElementById('ep-numanios').value) || 1;

        if(!codigoForm || !esp) {
           showConfirm("Atención", "Código y Especialidad son requeridos.", "danger");
           return;
        }

        btnGuardarPlan.disabled = true;
        btnGuardarPlan.innerText = 'Guardando...';

        try {
           // Compute global asignaturas array unique
           const asignaturasSet = new Set();
           (editingPlan.grados || []).forEach(g => {
              g.asignaturas.forEach(a => asignaturasSet.add(a.nombre));
           });

           const planFinal = {
              codigo: parseInt(codigoForm),
              especialidad: esp,
              mencion: men || null,
              numAnios: numA,
              grados: editingPlan.grados,
              asignaturas: Array.from(asignaturasSet)
           };

           const updates = {};
           
           if(editingPlan.isNew) {
              updates[`planes_estudio.${codigoForm}`] = planFinal;
           } else {
              // Edit existing
              if(codigoForm !== editingPlan.oldCodigo) {
                 // Changed code, delete old, create new
                 updates[`planes_estudio.${editingPlan.oldCodigo}`] = deleteField();
                 updates[`planes_estudio.${codigoForm}`] = planFinal;
              } else {
                 updates[`planes_estudio.${codigoForm}`] = planFinal;
              }
           }

           await updateDoc(doc(db, "sistema", "catalogos_maestros"), updates);
           
           // Reload
           await loadCatalogos();
           vistaEditor.style.display = 'none';
           vistaGrid.style.display = 'block';

        } catch(e) {
           console.error(e);
           showConfirm("Error", "Ocurrió un problema guardando el plan.", "danger");
        } finally {
           btnGuardarPlan.disabled = false;
           btnGuardarPlan.innerText = '💾 Guardar Plan';
        }
     };
  }


  // --- GESTOR DE BD: PLANTELES ---
  const tbodyPlanteles = document.getElementById('tbody-planteles');
  const inpBuscarPlantel = document.getElementById('inp-buscar-plantel');
  const modalPlantel = document.getElementById('modal-plantel');
  const formPlantel = document.getElementById('form-plantel');
  let currentPlanteles = []; // Cache of downloaded planteles

  // Subtabs Logic
  document.querySelectorAll('.db-subtab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.db-subtab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.db-subtab').forEach(t => t.style.display = 'none');
      e.target.classList.add('active');
      document.getElementById(e.target.getAttribute('data-target')).style.display = 'block';
      if(e.target.getAttribute('data-target') === 'db-planteles' && currentPlanteles.length === 0) {
        loadPlanteles();
      }
    });
  });

  async function loadPlanteles() {
    if(!tbodyPlanteles) return;
    try {
      const snap = await getDocs(collection(db, "planteles"));
      currentPlanteles = [];
      snap.forEach(doc => {
        currentPlanteles.push({ id: doc.id, ...doc.data() });
      });
      renderPlantelesList();
    } catch(err) {
      console.error("Error loading planteles:", err);
    }
  }

  function renderPlantelesList() {
    if(!tbodyPlanteles) return;
    tbodyPlanteles.innerHTML = '';
    
    const term = inpBuscarPlantel.value.toLowerCase().trim();
    let filtered = currentPlanteles;
    if(term) {
      filtered = currentPlanteles.filter(p => {
         const d = p.codigos?.plantel?.toLowerCase() || '';
         const n = (p['nombre-plantel']?.nominal || '').toLowerCase();
         const m = (p.municipio || '').toLowerCase();
         return d.includes(term) || n.includes(term) || m.includes(term);
      });
    }

    if(filtered.length === 0) {
      tbodyPlanteles.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-muted);">No se encontraron planteles.</td></tr>';
      return;
    }

    filtered.forEach(p => {
       const tr = document.createElement('tr');
       tr.style.borderBottom = '1px solid var(--glass-border)';
       tr.innerHTML = `
         <td style="padding: 15px 20px;">
           <span style="background: rgba(37,99,235,0.1); color: var(--primary-color); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-family: monospace;">${p.codigos?.plantel || 'N/A'}</span>
         </td>
         <td style="padding: 15px 20px; font-weight: 500; color: var(--text-main);">${p['nombre-plantel']?.nominal || 'SIN NOMBRE'}</td>
         <td style="padding: 15px 20px; color: var(--text-muted); font-size: 0.9rem;">${p.municipio || 'N/A'}</td>
         <td style="padding: 15px 20px; color: var(--text-muted); font-size: 0.9rem;">${p.nivel || 'N/A'}</td>
         <td style="padding: 15px 20px; text-align: right;">
           <button class="btn-edit-plantel" data-id="${p.id}" style="background: rgba(37,99,235,0.1); border: 1px solid var(--primary-color); color: var(--primary-color); padding: 4px 10px; border-radius: 6px; cursor: pointer; margin-right: 5px; width: auto; box-shadow: none; font-size: 0.8rem; min-height: 0;">✏️ Editar</button>
           <button class="btn-del-plantel" data-id="${p.id}" style="background: rgba(220,38,38,0.1); border: 1px solid var(--danger); color: var(--danger); padding: 4px 10px; border-radius: 6px; cursor: pointer; width: auto; box-shadow: none; font-size: 0.8rem; min-height: 0;">🗑️ Eliminar</button>
         </td>
       `;
       tbodyPlanteles.appendChild(tr);
    });

    // Attach events
    document.querySelectorAll('.btn-edit-plantel').forEach(b => {
       b.onclick = () => {
         const id = b.getAttribute('data-id');
         const plantel = currentPlanteles.find(x => x.id === id);
         openPlantelModal(plantel);
       };
    });

    document.querySelectorAll('.btn-del-plantel').forEach(b => {
       b.onclick = async () => {
         const id = b.getAttribute('data-id');
         const plantel = currentPlanteles.find(x => x.id === id);
         const ok = await showConfirm("Eliminar Plantel", `¿Estás seguro de eliminar el plantel ${plantel['nombre-plantel']?.nominal}? Esta acción es irreversible.`, "danger");
         if(ok) {
            try {
              b.disabled = true;
              b.innerText = 'Borrando...';
              await deleteDoc(doc(db, "planteles", id));
              await loadPlanteles();
            } catch(e) {
              console.error(e);
              showConfirm("Error", "Ocurrió un problema eliminando el plantel.", "danger");
            }
         }
       };
    });
  }

  if(inpBuscarPlantel) {
    inpBuscarPlantel.addEventListener('input', renderPlantelesList);
  }

  function openPlantelModal(plantel = null) {
     formPlantel.reset();
     document.getElementById('p-uid').value = '';
     document.getElementById('modal-plantel-title').innerText = plantel ? 'Editar Plantel' : 'Nuevo Plantel';
     
     if(plantel) {
       document.getElementById('p-uid').value = plantel.id;
       document.getElementById('p-codigo').value = plantel.codigos?.plantel || '';
       document.getElementById('p-estadistico').value = plantel.codigos?.estadistico || '';
       document.getElementById('p-denominacion').value = plantel.denominacion || '';
       document.getElementById('p-nominal').value = plantel['nombre-plantel']?.nominal || '';
       document.getElementById('p-eponimo').value = plantel['nombre-plantel']?.nuevo_eponimo || plantel['nombre-plantel']?.['nuevo-eponimo'] || '';
       document.getElementById('p-municipio').value = plantel.municipio || '';
       document.getElementById('p-parroquia').value = plantel.parroquia || '';
       document.getElementById('p-dependencia').value = plantel.dependencia || 'NACIONAL';
       document.getElementById('p-cod-dependencia').value = plantel.codigos?.dependencia?.[0] || '';
       document.getElementById('p-nivel').value = plantel.nivel || '';
       document.getElementById('p-turno').value = plantel['turno-plantel'] || '';
     }
     
     modalPlantel.style.display = 'flex';
  }

  if(document.getElementById('btn-nuevo-plantel')) {
    document.getElementById('btn-nuevo-plantel').addEventListener('click', () => openPlantelModal(null));
  }
  
  if(document.getElementById('btn-cerrar-modal-plantel')) {
    document.getElementById('btn-cerrar-modal-plantel').addEventListener('click', () => modalPlantel.style.display = 'none');
  }
  if(document.getElementById('btn-cancelar-plantel')) {
    document.getElementById('btn-cancelar-plantel').addEventListener('click', () => modalPlantel.style.display = 'none');
  }

  if(formPlantel) {
    formPlantel.addEventListener('submit', async (e) => {
       e.preventDefault();
       const id = document.getElementById('p-uid').value;
       const isEdit = !!id;
       const btn = document.getElementById('btn-guardar-plantel');
       
       const codP = document.getElementById('p-codigo').value.toUpperCase();
       
       const newData = {
          "municipio": document.getElementById('p-municipio').value.toUpperCase(),
          "parroquia": document.getElementById('p-parroquia').value.toUpperCase(),
          "denominacion": document.getElementById('p-denominacion').value.toUpperCase(),
          "nombre-plantel": {
            "nominal": document.getElementById('p-nominal').value.toUpperCase(),
            "nuevo-eponimo": document.getElementById('p-eponimo').value.toUpperCase()
          },
          "codigos": {
            "plantel": codP,
            "estadistico": Number(document.getElementById('p-estadistico').value) || 0,
            "dependencia": [ Number(document.getElementById('p-cod-dependencia').value) || 0 ]
          },
          "dependencia": document.getElementById('p-dependencia').value,
          "nivel": document.getElementById('p-nivel').value.toUpperCase(),
          "turno-plantel": document.getElementById('p-turno').value.toUpperCase()
       };

       try {
         btn.disabled = true;
         btn.innerText = 'Guardando...';
         
         if(isEdit) {
            // Check if user changed the DEA Code (which is the document ID).
            if (codP !== id) {
               // We need to create a new doc and copy existing data, then delete old doc.
               // For safety, we should fetch the full old doc first to preserve matricula/secciones.
               const oldDocSnap = await getDoc(doc(db, "planteles", id));
               if (oldDocSnap.exists()) {
                   const oldData = oldDocSnap.data();
                   newData['matricula'] = oldData['matricula'] || {};
                   newData['secciones-planes'] = oldData['secciones-planes'] || {};
                   newData['planes-estudio'] = oldData['planes-estudio'] || {};
                   
                   await setDoc(doc(db, "planteles", codP), newData);
                   await deleteDoc(doc(db, "planteles", id));
               }
            } else {
               await updateDoc(doc(db, "planteles", id), newData);
            }
         } else {
            newData['matricula'] = {};
            newData['secciones-planes'] = {};
            newData['planes-estudio'] = {};
            await setDoc(doc(db, "planteles", codP), newData);
         }
         
         modalPlantel.style.display = 'none';
         await loadPlanteles(); // reload table
         
       } catch(err) {
         console.error(err);
         showConfirm("Error", "Ocurrió un problema guardando el plantel.", "danger");
       } finally {
         btn.disabled = false;
         btn.innerText = 'Guardar Plantel';
       }
    });
  }


  // --- HAMBURGER MENU LOGIC ---
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

  
  // --- MODULO: LISTAS MAESTRAS ---
  window.loadListasMaestras = async function(nombreLista, tipo) {
      if (typeof catalogosGlobal === 'undefined' || !catalogosGlobal || (!catalogosGlobal.listas_desplegables && !catalogosGlobal.situacion_laboral)) {
        try {
          const snap = await getDoc(doc(db, "sistema", "catalogos_maestros"));
          if (snap.exists()) {
            catalogosGlobal = snap.data();
          }
        } catch (e) {
          console.error(e);
          showConfirm("Error", "Ocurrió un problema cargando las listas.", "danger");
          return;
        }
      }
      
      // En vez de construir un menú selector, vamos directo al editor
      if (nombreLista && tipo) {
          window.renderEditorLista(nombreLista, tipo, null);
      }
  };

  window.renderEditorLista = function(nombre, tipo, selectedBtn) {
      const container = document.getElementById('lista-editor-container');
      const titulo = document.getElementById('lista-titulo');
      const body = document.getElementById('lista-editor-body');
      
      container.style.display = 'block';
      titulo.innerText = nombre.replace(/_/g, ' ').toUpperCase();
      body.innerHTML = '';
      
      const btnAdd = document.getElementById('btn-add-lista');
      if(btnAdd) {
          btnAdd.onclick = async () => {
              if(tipo === 'array') {
                  const val = await showPrompt('Nuevo Valor', 'Ingrese el valor para añadir a la lista:');
                  if(val && val.trim()) {
                      if(!catalogosGlobal.listas_desplegables[nombre]) catalogosGlobal.listas_desplegables[nombre] = [];
                      catalogosGlobal.listas_desplegables[nombre].push(val.trim().toUpperCase());
                      window.renderEditorLista(nombre, tipo, selectedBtn);
                      document.getElementById('btn-guardar-listas').style.display = 'block';
                  }
              } else if (tipo === 'object') {
                  const res = await showPromptDual('Añadir Situación Laboral', 'Ingrese la clave corta y su descripción correspondiente:', '', '');
                  if(res && res.key.trim() && res.val.trim()) {
                      let k = res.key.trim().toUpperCase();
                      if(!catalogosGlobal[nombre]) catalogosGlobal[nombre] = {};
                      if(catalogosGlobal[nombre][k]) {
                          showConfirm("Atención", "Esa clave ya existe en la lista.", "danger");
                          return;
                      }
                      catalogosGlobal[nombre][k] = res.val.trim().toUpperCase();
                      window.renderEditorLista(nombre, tipo, selectedBtn);
                      document.getElementById('btn-guardar-listas').style.display = 'block';
                  }
              }
          };
      }
      
      if(tipo === 'array') {
          const lista = catalogosGlobal.listas_desplegables[nombre] || [];
          lista.forEach((item, index) => {
              const card = document.createElement('div');
              card.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease, box-shadow 0.2s ease;';
              card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 5px 15px rgba(0,0,0,0.08)'; };
              card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; };
              
              const contentDiv = document.createElement('div');
              const h4 = document.createElement('h4');
              h4.style.margin = '0 0 10px';
              h4.style.color = 'var(--text-main)';
              h4.style.fontSize = '1.05rem';
              h4.style.fontWeight = 'bold';
              h4.style.lineHeight = '1.4';
              h4.innerText = item;
              contentDiv.appendChild(h4);
              
              const btnDiv = document.createElement('div');
              btnDiv.style.display = 'flex';
              btnDiv.style.gap = '10px';
              btnDiv.style.marginTop = '20px';
              
              const btnEdit = document.createElement('button');
              btnEdit.innerHTML = '✏️ Editar';
              btnEdit.style.cssText = 'flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; color: var(--primary-color); padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;';
              btnEdit.onclick = async () => {
                  const newVal = await showPrompt('Editar Valor', 'Modifique el valor:', item);
                  if(newVal && newVal.trim() && newVal.trim().toUpperCase() !== item) {
                      catalogosGlobal.listas_desplegables[nombre][index] = newVal.trim().toUpperCase();
                      window.renderEditorLista(nombre, tipo, selectedBtn);
                      document.getElementById('btn-guardar-listas').style.display = 'block';
                  }
              };
              
              const btnDel = document.createElement('button');
              btnDel.innerHTML = '🗑️ Eliminar';
              btnDel.style.cssText = 'flex: 1; background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;';
              btnDel.onclick = async () => {
                  if(await showConfirm('Eliminar ítem', '¿Seguro que deseas eliminar este elemento de la lista?')) {
                      catalogosGlobal.listas_desplegables[nombre].splice(index, 1);
                      window.renderEditorLista(nombre, tipo, selectedBtn);
                      document.getElementById('btn-guardar-listas').style.display = 'block';
                  }
              };
              
              btnDiv.appendChild(btnEdit);
              btnDiv.appendChild(btnDel);
              
              card.appendChild(contentDiv);
              card.appendChild(btnDiv);
              body.appendChild(card);
          });
      }
      
      if (tipo === 'object') {
          const obj = catalogosGlobal[nombre] || {};
          for(let key of Object.keys(obj)) {
              const card = document.createElement('div');
              card.style.cssText = 'background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.2s ease, box-shadow 0.2s ease;';
              card.onmouseenter = () => { card.style.transform = 'translateY(-2px)'; card.style.boxShadow = '0 5px 15px rgba(0,0,0,0.08)'; };
              card.onmouseleave = () => { card.style.transform = 'translateY(0)'; card.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'; };
              
              const contentDiv = document.createElement('div');
              
              const headerDiv = document.createElement('div');
              headerDiv.style.display = 'flex';
              headerDiv.style.justifyContent = 'space-between';
              headerDiv.style.alignItems = 'start';
              headerDiv.style.marginBottom = '10px';
              
              const badge = document.createElement('span');
              badge.style.cssText = 'background: rgba(37,99,235,0.1); color: var(--primary-color); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-family: monospace; font-weight: bold;';
              badge.innerText = key;
              headerDiv.appendChild(badge);
              
              const h4 = document.createElement('h4');
              h4.style.margin = '0 0 5px';
              h4.style.color = 'var(--text-main)';
              h4.style.fontSize = '0.95rem';
              h4.style.lineHeight = '1.4';
              h4.innerText = obj[key];
              
              contentDiv.appendChild(headerDiv);
              contentDiv.appendChild(h4);
              
              const btnDiv = document.createElement('div');
              btnDiv.style.display = 'flex';
              btnDiv.style.gap = '10px';
              btnDiv.style.marginTop = '20px';
              
              const btnEdit = document.createElement('button');
              btnEdit.innerHTML = '✏️ Editar';
              btnEdit.style.cssText = 'flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; color: var(--primary-color); padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;';
              btnEdit.onclick = async () => {
                  const res = await showPromptDual('Editar Situación Laboral', 'Modifique la clave y/o descripción:', key, obj[key]);
                  if(!res || !res.key.trim() || !res.val.trim()) return;
                  
                  let k = res.key.trim().toUpperCase();
                  let newVal = res.val.trim().toUpperCase();
                  
                  if(k !== key) {
                      if(catalogosGlobal[nombre][k]) {
                          showConfirm("Atención", "Esa clave ya existe en la lista.", "danger");
                          return;
                      }
                      catalogosGlobal[nombre][k] = newVal;
                      delete catalogosGlobal[nombre][key];
                  } else {
                      catalogosGlobal[nombre][key] = newVal;
                  }
                  
                  window.renderEditorLista(nombre, tipo, selectedBtn);
                  document.getElementById('btn-guardar-listas').style.display = 'block';
              };
              
              const btnDel = document.createElement('button');
              btnDel.innerHTML = '🗑️ Eliminar';
              btnDel.style.cssText = 'flex: 1; background: #fee2e2; border: 1px solid #fecaca; color: #dc2626; padding: 8px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.85rem;';
              btnDel.onclick = async () => {
                  if(await showConfirm('Eliminar Clave', '¿Seguro que quieres eliminar esta situación laboral? Esto podría afectar a los empleados que ya la tengan asignada.')) {
                      delete catalogosGlobal[nombre][key];
                      window.renderEditorLista(nombre, tipo, selectedBtn);
                      document.getElementById('btn-guardar-listas').style.display = 'block';
                  }
              };
              
              btnDiv.appendChild(btnEdit);
              btnDiv.appendChild(btnDel);
              
              card.appendChild(contentDiv);
              card.appendChild(btnDiv);
              body.appendChild(card);
          }
      }
  };

  const btnGuardarListas = document.getElementById('btn-guardar-listas');
  if(btnGuardarListas) {
      btnGuardarListas.addEventListener('click', async () => {
          btnGuardarListas.innerText = 'Guardando...';
          btnGuardarListas.disabled = true;
          try {
              catalogosGlobal.ultima_actualizacion = new Date().toISOString();
              await setDoc(doc(db, "sistema", "catalogos_maestros"), catalogosGlobal);
              btnGuardarListas.innerText = '✅ Guardado Exitoso';
              btnGuardarListas.style.background = '#10b981';
              setTimeout(() => {
                  btnGuardarListas.style.display = 'none';
                  btnGuardarListas.innerText = '💾 Guardar Cambios';
                  btnGuardarListas.disabled = false;
                  btnGuardarListas.style.background = 'var(--success)';
              }, 2000);
          } catch(err) {
              console.error(err);
              showConfirm("Error", "Ocurrió un problema al guardar los cambios.", "danger");
              btnGuardarListas.innerText = '💾 Guardar Cambios';
              btnGuardarListas.disabled = false;
          }
      });
  }


  if (overlay) overlay.addEventListener('click', window.closeSidebar);

}

