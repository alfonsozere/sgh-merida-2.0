import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export function initMunicDashboard(db, userData) {
  const container = document.getElementById('munic-users-list');
  const btnLogout = document.getElementById('btn-logout-munic');

  if (btnLogout) {
    btnLogout.onclick = () => {
       import('firebase/auth').then(({ getAuth, signOut }) => {
           signOut(getAuth());
       });
    };
  }

  async function loadDirectors() {
    container.innerHTML = '<p>Cargando directores...</p>';
    try {
      const q = query(
        collection(db, 'usuarios'),
        where('rol', '==', 'plant'),
        where('municipio', '==', userData.municipio)
      );

      const snap = await getDocs(q);
      if (snap.empty) {
        container.innerHTML = '<p style="color:var(--text-muted);">No hay directores registrados en tu municipio aún.</p>';
        return;
      }

      let html = '<div style="display:flex; flex-direction:column; gap:10px;">';
      snap.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;
        const validado = d.validacion_municipal === true;
        
        html += `
          <div style="background:var(--bg-dark); padding:15px; border-radius:8px; display:flex; justify-content:space-between; align-items:center; border: 1px solid rgba(255,255,255,0.1);">
            <div>
              <h4 style="margin:0; color:var(--primary-color);">${d.codigo}</h4>
              <p style="margin:4px 0 0 0; font-size:0.85rem;">C.I: ${d.cedula} | ${d.nombre}</p>
            </div>
            <div>
              ${validado 
                ? `<button class="btn-revocar" data-id="${id}" style="background:#dc3545; color:white; padding:8px 12px; border:none; border-radius:4px; cursor:pointer;">Revocar Validación</button>`
                : `<button class="btn-validar" data-id="${id}" style="background:#10b981; color:white; padding:8px 12px; border:none; border-radius:4px; cursor:pointer;">Validar Identidad</button>`
              }
            </div>
          </div>
        `;
      });
      html += '</div>';
      container.innerHTML = html;

      // Event Listeners
      container.querySelectorAll('.btn-validar').forEach(btn => {
        btn.onclick = () => setValidacion(btn.dataset.id, true);
      });
      container.querySelectorAll('.btn-revocar').forEach(btn => {
        btn.onclick = () => setValidacion(btn.dataset.id, false);
      });

    } catch(err) {
      console.error(err);
      container.innerHTML = '<p style="color:red;">Error cargando datos.</p>';
    }
  }

  async function setValidacion(uid, estado) {
    try {
      await updateDoc(doc(db, 'usuarios', uid), {
        validacion_municipal: estado
      });
      loadDirectors(); // recargar
    } catch(err) {
      console.error(err);
      alert('Error actualizando estado.');
    }
  }

  loadDirectors();
}
