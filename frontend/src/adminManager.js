import { db } from './firebase.js';
import { doc, getDoc, setDoc, onSnapshot, collection, query, where, getDocs, limit, documentId } from "firebase/firestore";

export const MUNICIPIOS_MERIDA = [
  "ALBERTO ADRIANI", "ANDRES BELLO", "ANTONIO PINTO SALINAS",
  "ARICAGUA", "ARZOBISPO CHACON", "CAMPO ELIAS",
  "CARACCIOLO PARRA", "CARDENAL QUINTERO", "GUARAQUE",
  "JULIO CESAR", "JUSTO BRICEÑO", "LIBERTADOR",
  "MIRANDA", "OBISPO RAMOS DE LORA", "PADRE NOGUERA",
  "PUEBLO LLANO", "RANGEL", "RIVAS DAVILA",
  "SANTOS MARQUINA", "SUCRE", "TOVAR",
  "TULIO FEBRES", "ZEA"
];

let unsubscribeDespliegue = null;
let searchTimeout = null;
let globalPlanesEstudioCache = null;

export function initAdminPanel(perfil) {
  if (perfil.rol !== 'superadmin') return;
  listenDespliegue();
  initPlantelesAdmin();
}

function initPlantelesAdmin() {
  const btnSearch = document.getElementById('btn-search-plantel');
  const inputSearch = document.getElementById('inp-search-plantel');
  const selMun = document.getElementById('sel-filter-municipio-plantel');
  const formPlantel = document.getElementById('form-admin-plantel');
  const btnCloseModal = document.getElementById('btn-close-modal-plantel');
  const btnCancelModal = document.getElementById('btn-cancelar-admin-plantel');
  
  if (btnSearch) {
    btnSearch.replaceWith(btnSearch.cloneNode(true));
    document.getElementById('btn-search-plantel').addEventListener('click', searchPlanteles);
  }
  
  // Búsqueda en vivo (Live Search) con Debounce
  if (inputSearch) {
    inputSearch.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if(e.target.value.trim().length >= 3 || e.target.value.trim().length === 0) {
          searchPlanteles();
        }
      }, 500); // Espera 500ms después de que el usuario deja de teclear
    });
  }
  
  if (selMun) {
    selMun.addEventListener('change', () => {
      searchPlanteles();
    });
    // Llenar select de municipios
    if (selMun.options.length <= 1) {
      MUNICIPIOS_MERIDA.forEach(mun => {
        selMun.add(new Option(mun, mun));
      });
    }
  }

  // Eventos del modal
  const closeModal = () => {
    document.getElementById('modal-admin-plantel').style.display = 'none';
  };
  if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);
  if (btnCancelModal) btnCancelModal.addEventListener('click', closeModal);
  
  if (formPlantel) {
    formPlantel.addEventListener('submit', async (e) => {
      e.preventDefault();
      await savePlantelConfig();
    });
  }
}

async function searchPlanteles() {
  const qStr = document.getElementById('inp-search-plantel').value.trim().toUpperCase();
  const municipio = document.getElementById('sel-filter-municipio-plantel').value;
  const tbody = document.getElementById('tbody-admin-planteles');
  const btn = document.getElementById('btn-search-plantel');
  
  btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i>';
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">Filtrando...</td></tr>';
  
  try {
    let plantelesRef = collection(db, 'planteles_auth');
    let resultados = [];

    if (!qStr && !municipio) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color: #fca5a5;">Ingresa al menos 3 caracteres o selecciona un municipio.</td></tr>';
      btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Buscar';
      return;
    }

    let q;
    if (qStr && (qStr.startsWith('OD') || qStr.startsWith('S') || /^[A-Z0-9]+$/.test(qStr))) {
      // Búsqueda por prefijo del Document ID (Código DEA parcial o completo)
      q = query(plantelesRef, where(documentId(), '>=', qStr), where(documentId(), '<=', qStr + '\uf8ff'), limit(30));
    } else if (qStr && municipio) {
      // Filtro compuesto en memoria para evitar errores de índice
      q = query(plantelesRef, where('ref_municipio', '==', municipio), limit(100));
    } else if (municipio) {
      q = query(plantelesRef, where('ref_municipio', '==', municipio), limit(50));
    } else if (qStr) {
      q = query(plantelesRef, where('nombre_plantel', '>=', qStr), where('nombre_plantel', '<=', qStr + '\uf8ff'), limit(30));
    }

    const snapshot = await getDocs(q);
    snapshot.forEach(docSnap => {
      resultados.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Filtro adicional en memoria si el usuario buscó por nombre + municipio
    if (qStr && municipio && !(qStr.startsWith('OD') || qStr.startsWith('S'))) {
      resultados = resultados.filter(p => p.nombre_plantel && p.nombre_plantel.includes(qStr));
    }

    let html = '';
    if (resultados.length === 0) {
      html = '<tr><td colspan="5" style="text-align:center; padding: 20px;">No se encontraron resultados.</td></tr>';
    } else {
      resultados.forEach(p => {
        const codigo_plantel = p.id;
        html += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.05); transition: background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
            <td style="padding: 12px 15px; font-family: monospace; font-size: 1.1rem; color: var(--accent-color);">${codigo_plantel}</td>
            <td style="padding: 12px 15px; font-weight: 500;">${p.nombre_plantel || 'SIN NOMBRE'}</td>
            <td style="padding: 12px 15px;">${p.ref_municipio || 'N/D'}</td>
            <td style="padding: 12px 15px;"><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${p.dependencia || 'ESTADAL'}</span></td>
            <td style="padding: 12px 15px; text-align: center;">
              <button onclick="window.openModalPlantel('${codigo_plantel}')" class="btn primary-btn" style="padding: 6px 12px; font-size: 0.85rem; width: auto;"><i class="fa-solid fa-pen-to-square"></i> Editar</button>
            </td>
          </tr>
        `;
      });
    }
    tbody.innerHTML = html;
    
  } catch(err) {
    console.error("Error buscando:", err);
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 20px; color: #fca5a5;">Error de consulta: ${err.message}.</td></tr>`;
  }
  
  btn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Buscar';
}

window.openModalPlantel = async function(dea) {
  const modal = document.getElementById('modal-admin-plantel');
  if (!modal) return;
  
  document.getElementById('admin-plantel-dea').value = dea;
  document.getElementById('titulo-modal-plantel').innerText = `Configuración: ${dea}`;
  document.getElementById('admin-plantel-planes-grid').innerHTML = '<div style="color:gray;">Cargando configuración desde la colección municipios...</div>';
  
  modal.style.display = 'flex';
  
  try {
    // 1. Buscamos las referencias de municipio y parroquia en el índice plano
    const authSnap = await getDoc(doc(db, 'planteles_auth', dea));
    if (!authSnap.exists()) {
      if(window.showToast) window.showToast("No se encontró el plantel en el índice", 'error');
      return;
    }
    const authData = authSnap.data();
    const municipio = authData.ref_municipio;
    const parroquia = authData.ref_parroquia;
    
    // Guardamos en atributos del formulario para usarlos al guardar
    document.getElementById('form-admin-plantel').dataset.municipio = municipio;
    document.getElementById('form-admin-plantel').dataset.parroquia = parroquia;

    // 2. Extraemos los datos reales del catálogo maestro de municipios
    const munSnap = await getDoc(doc(db, 'municipios', municipio));
    if (munSnap.exists()) {
      const munData = munSnap.data();
      const plantelMaster = munData.parroquias?.[parroquia]?.planteles?.[dea];
      
      if (plantelMaster) {
        document.getElementById('admin-plantel-nombre').value = plantelMaster.nombre_plantel || authData.nombre_plantel || '';
        document.getElementById('admin-plantel-eponimo').value = plantelMaster.nuevo_eponimo || '';
        document.getElementById('admin-plantel-den-abr').value = plantelMaster.den_abr || '';
        document.getElementById('admin-plantel-denominacion').value = plantelMaster.denominacion || '';
        document.getElementById('admin-plantel-dependencia').value = plantelMaster.dependencia || 'ESTADAL';
        document.getElementById('admin-plantel-cod-dep1').value = plantelMaster.codigo_dependencia || '';
        document.getElementById('admin-plantel-cod-dep2').value = plantelMaster.codigo_dependencia_2 || '';
        document.getElementById('admin-plantel-estadistico').value = plantelMaster.codigo_estadistico || '';
        document.getElementById('admin-plantel-nivel').value = plantelMaster.nivel || '';
        document.getElementById('admin-plantel-modalidad').value = plantelMaster.modalidad || '';
        document.getElementById('admin-plantel-ubicacion').value = plantelMaster.ubicacion || '';
        document.getElementById('admin-plantel-turno').value = plantelMaster.turno || '';
        document.getElementById('admin-plantel-metros').value = plantelMaster.metros2 || '';
        document.getElementById('admin-plantel-obs').value = plantelMaster.observaciones || '';
        
        // Extraemos las claves de los planes de estudio del objeto (ej. "20000", "21000")
        const planesGuardados = plantelMaster.planes_estudio ? Object.keys(plantelMaster.planes_estudio) : [];
        await renderPlanesCheckboxes(planesGuardados);
      } else {
        if(window.showToast) window.showToast("El plantel no existe en el catálogo maestro del municipio", 'error');
      }
    }
  } catch(err) {
    console.error(err);
    if(window.showToast) window.showToast("Error al cargar datos del plantel maestro", 'error');
  }
};

async function renderPlanesCheckboxes(planesActivosArray) {
  const grid = document.getElementById('admin-plantel-planes-grid');
  
  if (!globalPlanesEstudioCache) {
    try {
      const snap = await getDocs(collection(db, 'planes_estudio'));
      globalPlanesEstudioCache = [];
      snap.forEach(d => {
        globalPlanesEstudioCache.push({
          id: d.id,
          ...d.data()
        });
      });
      // Ordenar por ID para que se vea consistente
      globalPlanesEstudioCache.sort((a,b) => a.id.localeCompare(b.id));
    } catch (e) {
      console.error("Error cargando catálogo de planes", e);
      globalPlanesEstudioCache = [];
    }
  }
  
  // Clonamos para no afectar el caché original
  const catalogo = [...globalPlanesEstudioCache];
  
  // Agregar también los que tenga activos pero no estén en el catálogo global
  planesActivosArray.forEach(p => {
    if (!catalogo.find(plan => plan.id === p)) {
      catalogo.push({ id: p, especialidad: 'DESCONOCIDO', mencion: null });
    }
  });
  
  let html = '';
  catalogo.forEach(plan => {
    const isChecked = planesActivosArray.includes(plan.id);
    
    // Construir un nombre descriptivo
    let nombrePlan = '';
    if (plan.especialidad && plan.mencion) {
      nombrePlan = `${plan.especialidad} - ${plan.mencion}`;
    } else if (plan.especialidad) {
      nombrePlan = plan.especialidad;
    } else if (plan.mencion) {
      nombrePlan = plan.mencion;
    } else {
      // Fallbacks para los planes básicos sin detalle en BD
      if (plan.id === "20000") nombrePlan = "EDUCACIÓN INICIAL";
      else if (plan.id === "21000") nombrePlan = "EDUCACIÓN PRIMARIA";
      else nombrePlan = `Plan ${plan.id}`;
    }

    html += `
      <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; background: rgba(0,0,0,0.2); padding: 8px 10px; border-radius: 6px; border: 1px solid var(--glass-border);">
        <input type="checkbox" name="chk-planes" value="${plan.id}" ${isChecked ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--accent-color);">
        <span style="font-size: 0.85rem; flex: 1;"><strong>${plan.id}</strong> | ${nombrePlan}</span>
      </label>
    `;
  });
  
  grid.innerHTML = html;
}

async function savePlantelConfig() {
  const dea = document.getElementById('admin-plantel-dea').value;
  const nombre = document.getElementById('admin-plantel-nombre').value.trim();
  const eponimo = document.getElementById('admin-plantel-eponimo').value.trim();
  const den_abr = document.getElementById('admin-plantel-den-abr').value.trim();
  const denominacion = document.getElementById('admin-plantel-denominacion').value.trim();
  const dependencia = document.getElementById('admin-plantel-dependencia').value;
  const cod_dep1 = document.getElementById('admin-plantel-cod-dep1').value.trim();
  const cod_dep2 = document.getElementById('admin-plantel-cod-dep2').value.trim();
  const estadistico = document.getElementById('admin-plantel-estadistico').value.trim();
  const nivel = document.getElementById('admin-plantel-nivel').value.trim();
  const modalidad = document.getElementById('admin-plantel-modalidad').value.trim();
  const ubicacion = document.getElementById('admin-plantel-ubicacion').value.trim();
  const turno = document.getElementById('admin-plantel-turno').value.trim();
  const metros = document.getElementById('admin-plantel-metros').value.trim();
  const obs = document.getElementById('admin-plantel-obs').value.trim();
  
  const form = document.getElementById('form-admin-plantel');
  const municipio = form.dataset.municipio;
  const parroquia = form.dataset.parroquia;
  
  const btn = document.getElementById('btn-cancelar-admin-plantel').nextElementSibling;
  
  const chks = document.querySelectorAll('input[name="chk-planes"]:checked');
  
  // Reconstruimos el objeto planes_estudio respetando la estructura de la BD original
  const planesObj = {};
  chks.forEach(c => {
    planesObj[c.value] = { mencion: null, especialidad: null };
  });
  
  if (!municipio || !parroquia) {
    if(window.showToast) window.showToast('Error: No se encontró la referencia del municipio o parroquia', 'error');
    return;
  }

  btn.innerHTML = 'Guardando en Maestro...';
  btn.disabled = true;
  
  try {
    // 3. Actualizamos la base de datos maestra (Colección municipios) usando notación de puntos (dot notation)
    const basePath = `parroquias.${parroquia}.planteles.${dea}`;
    
    // También actualizamos planteles_auth por si acaso (para mantener sincronía de nombre, dependencia, etc si es necesario)
    // Pero la fuente de verdad es 'municipios'
    const updatePayload = {
      [`${basePath}.nombre_plantel`]: nombre,
      [`${basePath}.nuevo_eponimo`]: eponimo,
      [`${basePath}.den_abr`]: den_abr,
      [`${basePath}.denominacion`]: denominacion,
      [`${basePath}.dependencia`]: dependencia,
      [`${basePath}.codigo_dependencia`]: cod_dep1,
      [`${basePath}.codigo_dependencia_2`]: cod_dep2,
      [`${basePath}.codigo_estadistico`]: estadistico,
      [`${basePath}.nivel`]: nivel,
      [`${basePath}.modalidad`]: modalidad,
      [`${basePath}.ubicacion`]: ubicacion,
      [`${basePath}.turno`]: turno,
      [`${basePath}.metros2`]: metros,
      [`${basePath}.observaciones`]: obs,
      [`${basePath}.planes_estudio`]: planesObj
    };
    
    await setDoc(doc(db, 'municipios', municipio), updatePayload, { merge: true });
    
    // Opcional: También guardamos en auth si se quiere mantener en el índice
    await setDoc(doc(db, 'planteles_auth', dea), {
      dependencia: dependencia,
      nombre_plantel: nombre
    }, { merge: true });
    
    if(window.showToast) window.showToast('Catálogo maestro actualizado con éxito', 'success');
    document.getElementById('modal-admin-plantel').style.display = 'none';
    
  } catch(err) {
    console.error(err);
    if(window.showToast) window.showToast('Error al guardar en BD maestra: ' + err.message, 'error');
  }
  
  btn.innerHTML = 'Guardar Cambios ✔';
  btn.disabled = false;
}

function listenDespliegue() {
  const docRef = doc(db, 'sistema', 'catalogos_maestros');
  
  unsubscribeDespliegue = onSnapshot(docRef, (docSnap) => {
    let municipiosActivos = [];
    let plantelesActivos = [];
    if (docSnap.exists()) {
      const data = docSnap.data();
      const despliegue = data.despliegue || {};
      municipiosActivos = despliegue.municipios_activos || [];
      plantelesActivos = despliegue.planteles_activos || [];
    }
    renderDespliegue(municipiosActivos);
    renderExcepcionesPlanteles(plantelesActivos);
  });
  
  // Listener para agregar excepción
  const btnAddDea = document.getElementById('btn-add-despliegue-dea');
  if (btnAddDea) {
    // Evitar añadir el listener múltiples veces si se llama initAdminPanel varias veces
    btnAddDea.replaceWith(btnAddDea.cloneNode(true));
    document.getElementById('btn-add-despliegue-dea').addEventListener('click', addExcepcionPlantel);
  }
}

async function addExcepcionPlantel() {
  const input = document.getElementById('inp-despliegue-dea');
  const dea = input.value.trim().toUpperCase();
  if (!dea) return;

  try {
    const docRef = doc(db, 'sistema', 'catalogos_maestros');
    const docSnap = await getDoc(docRef);
    let despliegue = {};
    if (docSnap.exists()) {
      despliegue = docSnap.data().despliegue || {};
    }
    let planteles = despliegue.planteles_activos || [];
    
    if (!planteles.includes(dea)) {
      planteles.push(dea);
      despliegue.planteles_activos = planteles;
      await setDoc(docRef, { despliegue: despliegue }, { merge: true });
      if (window.showToast) window.showToast(`Plantel ${dea} añadido a excepciones`, 'success');
      input.value = '';
    } else {
      if (window.showToast) window.showToast(`El plantel ${dea} ya estaba en la lista`, 'warning');
    }
  } catch (err) {
    console.error("Error añadiendo excepción:", err);
    if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
  }
}

window.removeExcepcionPlantel = async function(dea) {
  try {
    const docRef = doc(db, 'sistema', 'catalogos_maestros');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      let despliegue = docSnap.data().despliegue || {};
      let planteles = despliegue.planteles_activos || [];
      planteles = planteles.filter(p => p !== dea);
      despliegue.planteles_activos = planteles;
      await setDoc(docRef, { despliegue: despliegue }, { merge: true });
      if (window.showToast) window.showToast(`Plantel ${dea} eliminado de excepciones`, 'success');
    }
  } catch (err) {
    console.error("Error eliminando excepción:", err);
    if (window.showToast) window.showToast(`Error: ${err.message}`, 'error');
  }
}

function renderExcepcionesPlanteles(planteles) {
  const container = document.getElementById('despliegue-planteles-list');
  if (!container) return;

  if (planteles.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.9rem; font-style: italic;">No hay excepciones registradas.</p>';
    return;
  }

  let html = '';
  planteles.forEach(dea => {
    html += `
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--glass-border); padding: 10px 15px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: 600; font-family: monospace; font-size: 1.1rem;">${dea}</span>
        <button onclick="window.removeExcepcionPlantel('${dea}')" class="btn danger-btn" style="padding: 6px 12px; font-size: 0.8rem;"><i class="fa-solid fa-trash"></i> Quitar</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

function renderDespliegue(activos) {
  const grid = document.getElementById('despliegue-grid');
  if (!grid) return;
  
  let html = '';
  MUNICIPIOS_MERIDA.forEach(mun => {
    const isActive = activos.includes(mun);
    const id = `toggle-${mun.replace(/\s/g, '_')}`;
    
    html += `
      <div class="despliegue-card ${isActive ? 'active' : ''}">
        <div class="despliegue-info">
          <div class="despliegue-icon">📍</div>
          <div class="despliegue-name">${mun}</div>
        </div>
        <label class="toggle-switch">
          <input type="checkbox" id="${id}" data-municipio="${mun}" ${isActive ? 'checked' : ''}>
          <span class="toggle-slider"></span>
        </label>
      </div>
    `;
  });
  
  grid.innerHTML = html;
  
  // Agregar listeners a los toggles
  const checkboxes = grid.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(chk => {
    chk.addEventListener('change', async (e) => {
      const municipio = e.target.getAttribute('data-municipio');
      const isChecked = e.target.checked;
      const card = e.target.closest('.despliegue-card');
      
      // UX Optimizada: Cambio inmediato
      if (isChecked) card.classList.add('active'); 
      else card.classList.remove('active');
      
      try {
        const docRef = doc(db, 'sistema', 'catalogos_maestros');
        const docSnap = await getDoc(docRef);
        
        let despliegue = {};
        if (docSnap.exists()) {
          despliegue = docSnap.data().despliegue || {};
        }
        let actuales = despliegue.municipios_activos || [];
        
        if (isChecked) {
          if (!actuales.includes(municipio)) actuales.push(municipio);
        } else {
          actuales = actuales.filter(m => m !== municipio);
        }
        
        despliegue.municipios_activos = actuales;
        // Usamos setDoc con merge para crear el documento si no existe
        await setDoc(docRef, { despliegue: despliegue }, { merge: true });
        
        if (window.showToast) {
          window.showToast(`Despliegue ${isChecked ? 'activado' : 'desactivado'} en ${municipio}`, 'success');
        }
        
      } catch (err) {
        console.error("Error actualizando despliegue:", err);
        if (window.showToast) window.showToast(`Error al guardar: ${err.message}`, 'error');
        // Revertir cambio en caso de error
        e.target.checked = !isChecked;
        if (!isChecked) card.classList.add('active'); 
        else card.classList.remove('active');
      }
    });
  });
}
