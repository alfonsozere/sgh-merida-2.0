import { db } from './firebase.js';
import { showToast, showAlert } from './uiUtils.js';
import { collection, doc, setDoc, updateDoc, arrayUnion, query, where, getDocs, getFirestore } from 'firebase/firestore';

export function mostrarFormularioPersonal() {
      limpiarFormularioPersonal();
      const contenedor = document.getElementById('seccion-registro-personal');
      const contenedorTabla = document.getElementById('seccion-personal-existente');
      
      if (contenedorTabla) contenedorTabla.style.display = 'block';
      if (contenedor) {
          contenedor.style.display = 'block';
          if(contenedorTabla) {
              contenedorTabla.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
              contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
      }
      
      
        let dea = '';
          if (window.currentPlantelDEA) {
              dea = window.currentPlantelDEA;
          } else if (window.sgh_user_data && window.sgh_user_data.jerarquia) {
              dea = window.sgh_user_data.jerarquia.plantel_codigo;
          }

          if (dea) {
              cargarPersonalExistente(dea);
          } else {
              console.warn("No se pudo determinar el código DEA del plantel actual para cargar personal.");
              const tbody = document.getElementById('tbody-personal-existente');
              if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">No hay sesión de DEA detectada.</td></tr>';
          }

    }

export function cerrarFormularioPersonal() {
      const contenedor = document.getElementById('seccion-registro-personal');
      const contenedorTabla = document.getElementById('seccion-personal-existente');
      if (contenedor) {
          contenedor.style.display = 'none';
      }
      if (contenedorTabla) {
          contenedorTabla.style.display = 'none';
      }
  }

export function limpiarFormularioPersonal() {
    const ids = [
        'wp-cedula', 'wp-nombres', 'wp-nacimiento', 'wp-edad', 'wp-genero', 'wp-nacionalidad',
        'wp-tipo-personal', 'wp-cargo', 'wp-situacion', 'wp-especialidad',
        'wp-fecha-ingreso', 'wp-antiguedad', 'wp-instruccion', 'wp-titulo',
        'wp-talla', 'wp-calzado', 'wp-carnet', 'wp-atiende-matricula'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
}

export function calcularEdadWizard() {
    const nac = document.getElementById('wp-nacimiento').value;
    if (!nac) return;
    const birthDate = new Date(nac);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    const txtEdad = document.getElementById('wp-edad');
    if (txtEdad) txtEdad.value = age > 0 ? age : 0;
}

export function calcularAntiguedadWizard() {
    const ing = document.getElementById('wp-fecha-ingreso').value;
    if (!ing) return;
    const ingDate = new Date(ing);
    const today = new Date();
    let years = today.getFullYear() - ingDate.getFullYear();
    const m = today.getMonth() - ingDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < ingDate.getDate())) {
        years--;
    }
    const txtAntiguedad = document.getElementById('wp-antiguedad');
    if (txtAntiguedad) txtAntiguedad.value = years >= 0 ? years : 0;
}

export async function guardarPersonalInline() {
    const empleadoActual = {
        cedula: document.getElementById('wp-cedula')?.value || '',
        nacionalidad: document.getElementById('wp-nacionalidad')?.value || '',
        'nombre-apellido': document.getElementById('wp-nombres')?.value || '',
        'lugar-nacimiento': document.getElementById('wp-lugar-nacimiento')?.value || '',
        'fecha-nacimiento': document.getElementById('wp-nacimiento')?.value || '',
        edad: parseInt(document.getElementById('wp-edad')?.value) || 0,
        genero: document.getElementById('wp-genero')?.value || '',
        'tel-habitacion': (document.getElementById('wp-prefijo-hab')?.value || '') + (document.getElementById('wp-tel-habitacion')?.value || ''),
        'tel-celular': (document.getElementById('wp-prefijo-cel')?.value || '') + (document.getElementById('wp-tel-celular')?.value || ''),
        'tel-oficina': (document.getElementById('wp-prefijo-ofi')?.value || '') + (document.getElementById('wp-tel-oficina')?.value || ''),
        correo: document.getElementById('wp-correo')?.value || '',
        'estado-civil': document.getElementById('wp-estado-civil')?.value || '',
        direccion: document.getElementById('wp-direccion')?.value || '',
        instruccion: document.getElementById('wp-instruccion')?.value || '',
        profesion: document.getElementById('wp-profesion')?.value || '',
        
        'ubicacion-administrativa': document.getElementById('wp-ubicacion-administrativa')?.value || '',
        dependencia: document.getElementById('wp-dependencia')?.value || '',
        'tipo-personal': document.getElementById('wp-tipo-personal')?.value || '',
        subcategoria: document.getElementById('wp-subcategoria')?.value || '',
        cargo: document.getElementById('wp-cargo')?.value || '',
        'codigo-rac': document.getElementById('wp-codigo-rac')?.value || '',
        titular: document.getElementById('wp-titular')?.value || '',
        'horas-academicas': parseInt(document.getElementById('wp-horas-academicas')?.value) || 0,
        'horas-administrativas': parseInt(document.getElementById('wp-horas-administrativas')?.value) || 0,
        'fecha-ingreso': document.getElementById('wp-fecha-ingreso')?.value || '',
        antiguedad: parseInt(document.getElementById('wp-antiguedad')?.value) || 0,
        'turnos-atiende': document.getElementById('wp-turnos-atiende')?.value || '',
        'atiende-matricula': document.getElementById('wp-atiende-matricula')?.value || '',
        'nivel-modalidad': document.getElementById('wp-nivel-modalidad')?.value || '',
        'especialidad-imparte': document.getElementById('wp-especialidad-imparte')?.value || '',
        
        'situacion-laboral': document.getElementById('wp-situacion-laboral')?.value || '',
        observaciones: document.getElementById('wp-observaciones')?.value || '',
        
        'talla-camisa': document.getElementById('wp-talla-camisa')?.value || '',
        'talla-pantalon': document.getElementById('wp-talla-pantalon')?.value || '',
        'talla-zapato': document.getElementById('wp-talla-zapato')?.value || '',
        'actividad-deportiva': document.getElementById('wp-actividad-deportiva')?.value || '',
        'actividad-cultural': document.getElementById('wp-actividad-cultural')?.value || '',
        'tipo-vivienda': document.getElementById('wp-tipo-vivienda')?.value || '',
        'condicion-vivienda': document.getElementById('wp-condicion-vivienda')?.value || '',
        'tipo-material': document.getElementById('wp-tipo-material')?.value || '',
        'tipo-enfermedad': document.getElementById('wp-tipo-enfermedad')?.value || '',
        medicamento: document.getElementById('wp-medicamento')?.value || '',
        discapacidad: document.getElementById('wp-discapacidad')?.value || '',
        
        ubch: document.getElementById('wp-ubch')?.value || '',
        'circuito-comunal': document.getElementById('wp-circuito-comunal')?.value || '',
        'centro-votacion': document.getElementById('wp-centro-votacion')?.value || ''
    };

    if (!empleadoActual.cedula || !empleadoActual.nombres) {
        showToast("Por favor, complete al menos la Cédula y los Nombres.", "warning");
        return;
    }

    let dea = '';
    const stPlantel = localStorage.getItem('plantelSeleccionado');
    if (stPlantel) {
        try {
            const pt = JSON.parse(stPlantel);
            dea = pt.codigoDEA;
        } catch (e) {}
    }

    if (!dea) {
        const uStr = localStorage.getItem('sgh_user');
        if (uStr) {
            try {
                const usr = JSON.parse(uStr);
                if (usr.planteles && usr.planteles.length > 0) {
                    dea = usr.planteles[0];
                }
            } catch (e) {}
        }
    }

    const payload = {
        ...empleadoActual,
        codigoDEA: dea,
        ultima_actualizacion: new Date().toISOString()
    };

    const btn = document.getElementById('btn-guardar-empleado-inline');
    if (btn) {
        btn.disabled = true;
        btn.textContent = "Guardando...";
    }

    try {
        const docId = dea ? (dea + '_' + payload.cedula) : payload.cedula;
        const ref = doc(db, "cargos_personal", docId);
        await setDoc(ref, payload, { merge: true });
        
        // Zero-Cost: Update plantel with summary array
        if (dea) {
            const plantelRef = doc(db, "planteles", dea);
            const resumen = {
                cedula: payload.cedula || '',
                nombre: payload.nombres || '',
                cargo: payload.cargo || ''
            };
            try {
                await updateDoc(plantelRef, {
                    personal_resumen: arrayUnion(resumen)
                });
            } catch(e) {
                console.error("Error updating plantel arrayUnion", e);
            }
        }
        
        showToast("Empleado guardado exitosamente.", "success");
        limpiarFormularioPersonal();
    } catch (error) {
        console.error("Error guardando empleado:", error);
        showAlert("Error", "Ocurrió un error al guardar: " + error.message, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "Guardar Empleado";
        }
    }
}

window.mostrarFormularioPersonal = mostrarFormularioPersonal;
window.cerrarFormularioPersonal = cerrarFormularioPersonal;
window.limpiarFormularioPersonal = limpiarFormularioPersonal;
window.calcularEdadWizard = calcularEdadWizard;
window.calcularAntiguedadWizard = calcularAntiguedadWizard;
window.guardarPersonalInline = guardarPersonalInline;


async function cargarPersonalExistente(codigoDEA) {
      const tbody = document.getElementById('tbody-personal-existente');
      if (!tbody) return;
      
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">Cargando personal...</td></tr>';
      
      try {
          const db = getFirestore();
          const q = query(collection(db, 'cargos_personal'), where('codigo-plantel', '==', codigoDEA));
          const querySnapshot = await getDocs(q);
          
          tbody.innerHTML = ''; 
          
          if (querySnapshot.empty) {
              tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No hay personal registrado en este plantel.</td></tr>';
              return;
          }


        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            
            const tdCed = document.createElement('td');
            tdCed.style.padding = '12px';
            tdCed.textContent = data['cedula-identidad'] || data.cedula || 'N/A';
            
            const tdNom = document.createElement('td');
            tdNom.style.padding = '12px';
            tdNom.textContent = (data['nombre-apellido'] || data['apellidos-nombres'] || data.nombre || 'N/A').toUpperCase();
            
            const tdTipo = document.createElement('td');
            tdTipo.style.padding = '12px';
            tdTipo.textContent = data['tipo-personal'] || 'N/A';
            
            const tdSit = document.createElement('td');
            tdSit.style.padding = '12px';
            tdSit.textContent = data['situacion-laboral'] || 'N/A';
            
                                                                    const tdAcc = document.createElement('td');
              tdAcc.style.padding = '12px';
              tdAcc.style.textAlign = 'center';
              tdAcc.style.verticalAlign = 'middle';
              
              const btnEditStyle = "width: 32px; height: 32px; padding: 0; border-radius: 6px; border: 1px solid #bfdbfe; background: #eff6ff; color: #2563eb; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; flex-shrink: 0;";
              const btnDelStyle = "width: 32px; height: 32px; padding: 0; border-radius: 6px; border: 1px solid #fecaca; background: #fef2f2; color: #dc2626; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; flex-shrink: 0;";
              
              tdAcc.innerHTML = `
                  <div style="display: flex; flex-direction: row; flex-wrap: nowrap; gap: 8px; justify-content: center; align-items: center; width: 100%;">
                      <button class="btn-editar" style="${btnEditStyle}" onmouseover="this.style.background='#dbeafe';" onmouseout="this.style.background='#eff6ff';" title="Editar registro">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="btn-eliminar" style="${btnDelStyle}" onmouseover="this.style.background='#fee2e2';" onmouseout="this.style.background='#fef2f2';" title="Eliminar registro">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                      </button>
                  </div>
              `;
            
            tr.appendChild(tdCed);
            tr.appendChild(tdNom);
            tr.appendChild(tdTipo);
            tr.appendChild(tdSit);
            tr.appendChild(tdAcc);
            
            tbody.appendChild(tr);
        });
        
    } catch (error) {
        console.error("Error cargando personal:", error);
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">Error cargando registros.</td></tr>';
    }
}


// Agregar listener para el buscador en tiempo real (Zero-Cost)
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('buscador-personal');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase().trim();
            const tbody = document.getElementById('tbody-personal-existente');
            if (!tbody) return;
            
            const rows = tbody.querySelectorAll('tr');
            let matchCount = 0;
            
            rows.forEach(row => {
                // Si la fila es un mensaje de estado ("Cargando...", "No hay personal..."), la ignoramos
                if (row.cells.length === 1) return; 
                
                const cedula = row.cells[0]?.textContent.toLowerCase() || '';
                const nombre = row.cells[1]?.textContent.toLowerCase() || '';
                
                if (cedula.includes(searchTerm) || nombre.includes(searchTerm)) {
                    row.style.display = '';
                    matchCount++;
                } else {
                    row.style.display = 'none';
                }
            });
            
            // Manejar caso donde no hay coincidencias
            let noMatchRow = document.getElementById('row-no-matches');
            if (matchCount === 0 && searchTerm !== '' && rows.length > 0 && rows[0].cells.length > 1) {
                if (!noMatchRow) {
                    noMatchRow = document.createElement('tr');
                    noMatchRow.id = 'row-no-matches';
                    noMatchRow.innerHTML = '<td colspan="5" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">No se encontraron resultados para "' + searchTerm + '"</td>';
                    tbody.appendChild(noMatchRow);
                } else {
                    noMatchRow.innerHTML = '<td colspan="5" style="text-align: center; padding: 20px; color: #64748b; font-style: italic;">No se encontraron resultados para "' + searchTerm + '"</td>';
                    noMatchRow.style.display = '';
                }
            } else if (noMatchRow) {
                noMatchRow.style.display = 'none';
            }
        });
    }
});

window.validarCedulaUI = function() {
    const nac = document.getElementById('wp-nacionalidad').value;
    const cedInp = document.getElementById('wp-cedula');
    let val = parseInt(cedInp.value);
    
    if (isNaN(val)) return;
    
    if (nac === 'V') {
        if (val < 1000000) cedInp.setCustomValidity("Cédula V mínima es 1000000");
        else if (val > 38000000) cedInp.setCustomValidity("Cédula V máxima es 38000000");
        else cedInp.setCustomValidity("");
    } else if (nac === 'E') {
        if (val < 80000000) cedInp.setCustomValidity("Cédula E mínima es 80000000");
        else if (val > 85000000) cedInp.setCustomValidity("Cédula E máxima es 85000000");
        else cedInp.setCustomValidity("");
    }
    cedInp.reportValidity();
};

window.calcularEdadUI = function() {
    const fecha = document.getElementById('wp-nacimiento').value;
    if(!fecha) return;
    const nacimiento = new Date(fecha);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    document.getElementById('wp-edad').value = edad > 0 ? edad : 0;
};

window.calcularAntiguedadUI = function() {
    const fecha = document.getElementById('wp-fecha-ingreso').value;
    if(!fecha) return;
    const ingreso = new Date(fecha);
    const hoy = new Date();
    let ant = hoy.getFullYear() - ingreso.getFullYear();
    const m = hoy.getMonth() - ingreso.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) {
        ant--;
    }
    document.getElementById('wp-antiguedad').value = ant > 0 ? ant : 0;
};

window.toggleMatriculaUI = function() {
    const atiende = document.getElementById('wp-atiende-matricula').value;
    const cnivel = document.getElementById('container-nivel-modalidad');
    const cesp = document.getElementById('container-especialidad');
    if(atiende === 'SI') {
        cnivel.style.display = 'block';
        cesp.style.display = 'block';
    } else {
        cnivel.style.display = 'none';
        cesp.style.display = 'none';
        document.getElementById('wp-nivel-modalidad').value = '';
        document.getElementById('wp-especialidad-imparte').value = '';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    try {
        const catRaw = localStorage.getItem('sgh_catalogos');
        if(catRaw) {
            const catalogos = JSON.parse(catRaw);
            document.querySelectorAll('.c-cat').forEach(select => {
                const catName = select.getAttribute('data-cat');
                if(catalogos[catName]) {
                    select.innerHTML = '<option value="">Seleccione...</option>';
                    catalogos[catName].forEach(opt => {
                        const val = typeof opt === 'string' ? opt : (opt.nombre || opt.valor || opt.id);
                        select.innerHTML += `<option value="${val}">${val}</option>`;
                    });
                } else {
                    select.innerHTML = '<option value="">Falta Catálogo</option>';
                }
            });
        }
    } catch(e) {
        console.error("Error cargando catalogos desde localStorage", e);
    }
});
