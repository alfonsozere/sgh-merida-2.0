import { collection, query, where, getDocs, updateDoc, doc, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";

export function initApprovalPanel(perfil) {
  // Solo los administradores superiores pueden ver esto
  if (['zonadmin', 'munadmin', 'superadmin'].includes(perfil.rol)) {
    const btnMenu = document.getElementById('menu-item-aprobaciones');
    if (btnMenu) {
      btnMenu.style.display = 'flex';
      btnMenu.addEventListener('click', (e) => {
        e.preventDefault();
        // Ocultar todas las secciones
        document.querySelectorAll('.view-section').forEach(el => el.style.display = 'none');
        // Quitar la clase activa de los botones
        document.querySelectorAll('.nav-menu a').forEach(el => el.classList.remove('active'));
        
        btnMenu.classList.add('active');
        document.getElementById('vista-aprobaciones').style.display = 'block';
        
        loadPendingApprovals(perfil);
      });
    }
  }
}

async function loadPendingApprovals(perfil) {
  const tbody = document.getElementById('tbody-aprobaciones');
  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Buscando solicitudes...</td></tr>';
  
  try {
    // Para evitar la creación de índices compuestos complejos en Firebase, 
    // consultamos todos los pendientes y filtramos en el cliente (Zero-Cost approach)
    const q = query(collection(db, 'usuarios'), where('estado_aprobacion', '==', 'PENDIENTE'));
    const snap = await getDocs(q);
    
    let users = [];
    snap.forEach(d => {
      const u = d.data();
      // Filtros de seguridad según el rol
      const j = u.jerarquia || {};
      const pj = perfil.jerarquia || {};
      
      if (perfil.rol === 'munadmin' && j.municipio !== pj.municipio) return;
      if (perfil.rol === 'zonadmin' && j.estado !== pj.estado) return;
      
      users.push({ id: d.id, ...u });
    });
    
    if (users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px;">🎉 ¡Todo al día! No hay solicitudes pendientes.</td></tr>';
      return;
    }
    
    let html = '';
    users.forEach(u => {
      const j = u.jerarquia || {};
      html += `
        <tr>
          <td><strong>${u.nombres || u.nombre || u.email} ${u.apellidos || ''}</strong><br><small style="color:var(--text-secondary)">C.I: ${u.cedula || 'N/D'}</small></td>
          <td><span class="badge" style="background: rgba(255,255,255,0.1); border: 1px solid var(--glass-border);">${u.rol.toUpperCase()}</span></td>
          <td>
            ${j.estado || 'MERIDA'} - ${j.municipio || 'N/A'}<br>
            <small style="color:var(--accent-color)">${j.plantel_codigo || ''}</small>
          </td>
          <td>${u.email}<br><small>${u.telefono || ''}</small></td>
          <td style="display:flex; gap:5px;">
            <button class="btn primary-btn btn-sm" onclick="window.aprobarUsuario('${u.id}', '${u.rol}', '${u.ref_plantel || ''}')">Aprobar</button>
            <button class="btn danger-btn btn-sm" onclick="window.rechazarUsuario('${u.id}')">Rechazar</button>
          </td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
  } catch(err) {
    console.error(err);
    tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error cargando solicitudes: ' + err.message + '</td></tr>';
  }
}

// Funciones globales para que los botones HTML puedan llamarlas
window.aprobarUsuario = async (uid, rol, dea) => {
  const confirmed = await window.showCustomConfirm("¿Seguro que deseas APROBAR el acceso a este usuario?");
  if(!confirmed) return;
  try {
    // 1. Aprobar usuario
    await updateDoc(doc(db, 'usuarios', uid), { estado_aprobacion: 'APROBADO' });
    
    // 2. Si es director de plantel, registrar en la tabla de auth que el plantel ya tiene director
    if (rol === 'plaadmin' && dea) {
      await setDoc(doc(db, 'planteles_auth', dea), {
        admin_uid: uid,
        registrado: true
      }, { merge: true });
    }
    
    if(window.showToast) window.showToast('✅ Usuario aprobado con éxito', 'success');
    document.getElementById('menu-item-aprobaciones').click(); // Recargar vista
  } catch (err) {
    console.error(err);
    if(window.showToast) window.showToast('Error al aprobar: ' + err.message, 'error');
  }
};

window.rechazarUsuario = async (uid) => {
  const confirmed = await window.showCustomConfirm("¿Seguro que deseas RECHAZAR permanentemente a este usuario?");
  if(!confirmed) return;
  try {
    await updateDoc(doc(db, 'usuarios', uid), { estado_aprobacion: 'RECHAZADO' });
    if(window.showToast) window.showToast('🚫 Usuario rechazado.', 'success');
    document.getElementById('menu-item-aprobaciones').click(); // Recargar vista
  } catch (err) {
    console.error(err);
    if(window.showToast) window.showToast('Error al rechazar: ' + err.message, 'error');
  }
};
