import { db } from './firebase.js';
import { showToast, showAlert } from './uiUtils.js';
import { collection, doc, setDoc } from 'firebase/firestore';

export function mostrarFormularioPersonal() {
    limpiarFormularioPersonal();
    const contenedor = document.getElementById('seccion-registro-personal');
    if (contenedor) {
        contenedor.style.display = 'block';
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

export function cerrarFormularioPersonal() {
    const contenedor = document.getElementById('seccion-registro-personal');
    if (contenedor) {
        contenedor.style.display = 'none';
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
        nombres: document.getElementById('wp-nombres')?.value || '',
        nacimiento: document.getElementById('wp-nacimiento')?.value || '',
        edad: parseInt(document.getElementById('wp-edad')?.value) || 0,
        genero: document.getElementById('wp-genero')?.value || '',
        nacionalidad: document.getElementById('wp-nacionalidad')?.value || '',
        tipoPersonal: document.getElementById('wp-tipo-personal')?.value || '',
        cargo: document.getElementById('wp-cargo')?.value || '',
        situacion: document.getElementById('wp-situacion')?.value || '',
        especialidad: document.getElementById('wp-especialidad')?.value || '',
        fechaIngreso: document.getElementById('wp-fecha-ingreso')?.value || '',
        antiguedad: parseInt(document.getElementById('wp-antiguedad')?.value) || 0,
        instruccion: document.getElementById('wp-instruccion')?.value || '',
        titulo: document.getElementById('wp-titulo')?.value || '',
        talla: document.getElementById('wp-talla')?.value || '',
        calzado: document.getElementById('wp-calzado')?.value || '',
        carnet: document.getElementById('wp-carnet')?.value || '',
        atiendeMatricula: document.getElementById('wp-atiende-matricula')?.value || ''
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
