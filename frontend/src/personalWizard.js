export const LISTA_EXTENSA_INSTRUCCION = [
    "SIN INSTRUCCION",
    "BASICA",
    "PRIMARIA",
    "BACHILLER",
    "TECNICO MEDIO",
    "TSU",
    "UNIVERSITARIO",
    "POSTGRADO"
];

import { db } from './firebase.js';
import { showToast, showAlert } from './uiUtils.js';
import { collection, doc, setDoc, updateDoc, deleteDoc, query, where, getDocs, getDoc, getFirestore } from 'firebase/firestore';

// --- Catálogos Maestros de Respaldo Institucional (Zero-Cost / Anti-Fallo) ---
const CATALOGOS_FALLBACK = {
    turnos: ["MAÑANA", "TARDE", "DOBLE TURNO", "NOCTURNO", "SABATINO"],
    tallas_camisa: ["SS", "S", "M", "L", "XL", "XXL", "6", "8", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28"],
    tallas_pantalon: ["SS", "S", "M", "L", "XL", "XXL", "10", "12", "14", "16", "18", "20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42"],
    tallas_zapato: ["26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37", "38", "39", "40", "41", "42", "43", "44", "45"],
    listas_desplegables: {
        estado_civil: ["SOLTERO(A)", "CASADO(A)", "DIVORCIADO(A)", "VIUDO(A)", "CONCUBINO(A)", "OTRO"],
        instruccion: LISTA_EXTENSA_INSTRUCCION,
        tipo_vivienda: ["CASA", "APARTAMENTO", "QUINTA", "RANCHO", "HABITACION", "OTRO"],
        condicion_vivienda: ["PROPIA", "ALQUILADA", "DE UN FAMILIAR", "PAGÁNDOSE", "OTRO"],
        dependencia: ["NACIONAL", "ESTADAL", "MUNICIPAL", "SUBVENCIONADA", "PRIVADO", "AUTONOMA"],
        niveles_educativos: ["INICIAL","INICIAL - PRIMARIA","INICIAL-PRIMARIA-MEDIA GENERAL","INICIAL-PRIMARIA-MEDIA TECNICA","PRIMARIA","PRIMARIA - MEDIA GENERAL","PRIMARIA - MEDIA TECNICA","MEDIA GENERAL","MEDIA GENERAL - MEDIA TECNICA","MEDIA TECNICA"],
        modalidades: ["ADULTO","ESPECIAL"]
    },
    situacion_laboral: {"PERMISO POR CUIDO":"SEGÚN CLAUSULAS DE LA CONTRATACION COLECTIVA","APOYO INSTITUCIONAL":"CORRESPONDE AL PERSONAL QUE TRABAJA EN LA ESTRUCTURA DE LOS CDCE, EN OTRO ENTE PUBLICO QUE NO ES EL MPPE, ESO INCLUYE AL PERSONAL QUE TRABAJA EN PLANTELES ESTADALES, PRIVADOS, SUBVENCIONADAS Y MUNICIPALES, AL IGUAL QUE ESTÁN COMO ENLACES Y EQUIPOS DE APOYOS EN OTROS ENTES PÚBLICOS","EN PROCESO DE INCAPACIDAD":"SEGÚN PLANILLA 14-08 RECIBIDA POR ZONA EDUCATIVA Y PLANTEL, EN ESPERA DE EVALUACION MEDICA DE NIVEL CENTRAL","TRASLADO INTERZONAL":"PERSONAL QUE SE TRASLADO A OTRO ESTADO DEL PAIS PERO AUN SIGUE EN NOMINA DEL PLANTEL","ACTIVO":"PERSONAL QUE CUMPLE FUNCIONES EN EL PLANTEL","INCAPACIDAD TEMPORAL":"CORRESPONDE A LOS PERMISOS MEDICOS OTORGADOS POR SEGURO SOCIAL DONDE DAN UNA INCAPACIDAD TEMPORAL QUE VA DESDE LOS SEIS MESES, NO CORRESPONDE A INCAPACIDADES TOTALES O PROCESOS DE INCAPACIDAD","INCAPACIDAD TOTAL POR IPASME":"SEGÚN INFORME O RESOLUCIÓN OTORGADA POR LA JUNTA MÉDICA DEL IPASME QUE OTORGA LA INCAPACIDAD TOTAL","VACACIONES":"PERSONAL DE VACACIONES AUTORIZADAS POR ZONA EDUCATIVA","INCUMPLIMIENTO DE FUNCIONES":"PERSONAL QUE NO CUMPLE A CABALIDAD LAS FUNCIONES ASIGNADAS (CORRESPONDE AL PERSONAL QUE NO ASISTE A SUS FUNCIONES REGULARES DENTRO DEL PLANTEL, INCLUYENDO A LOS QUE NO ASISTEN LOS CINCO DÍAS)","REPOSO MEDICO":"SEGÚN JUSTIFICATIVO RECIBIDO POR EL PLANTEL (NO CORRESPONDE A LOS PROCESOS DE INCAPACIDAD CON 1408)","SINCERACIÓN DE NÓMINA":"PERSONAL CON TRALADO INTERNO PERO AUN NO SE HA SINCERADO","ADECUACIÓN LABORAL":"SEGÚN PLANILLA OTORGADA POR INPSASEL","PRIVADO DE LIBERTAD":"APLICA SOLO PARA EL PERSONAL QUE ESTÁ EN ESPERA DE SENTENCIA O CON UNA SENTENCIA JUDICIAL","ABANDONO DE CARGO":"PERSONAL QUE SEGÚN LEY NO SE PRESENTA A SU PUESTO DE TRABAJO Y NO HA JUSTIFICADO INASISTENCIA, INCLUYE TAMBIEN QUIENES TIENE PROCEDIMIENTO ADMINISTRATIVO ABIERTO POR ZONA EDUCATIVA","INCAPACIDAD TOTAL Y DEFINITIVA POR IVSS":"SEGÚN PLANILLA 14-08 CON PORCENTAJE 67% (CORRESPONDE AL PERSONAL INCAPACITADO CON EL 67% Y QUE AUN APARECE ACTIVO EN NÓMINA)","COMISION DE SERVICIO":"APROBADA MEDIANTE PROVIDENCIA ADMINISTRATIVA FIRMADA POR EL MINISTRO DEL MPPE, ESTA PUEDE SER REMUNERADA O NO","LICENCIA SINDICAL":"APROBADA POR LA DIRECCION GENERAL DE GESTION HUMANA DEL MPPE, NO POR EL PRESIDENTE DEL SINDICATO","DEFUNCIONES":"SEGÚN ACTA","EN PROCESO DE JUBILACIÓN":"SEGÚN PLANILLA RECIBIDA POR ZONA EDUCATIVA, NO INCLUYE AL PERSONAL QUE CUMPLIO AÑOS DE SERVICIO Y NO A SOLICITADO JUBILACION POR ZONA EDUCATIVA","PERMISO PRE Y POST NATAL":"SEGÚN CLAUSULAS DE LA CONTRATACION COLECTIVA","RENUNCIA":"SEGÚN OFICIO RECIBIDO POR ZONA EDUCATIVA","PERMISO POR FALLECIMIENTO":"SEGÚN CLAUSULAS DE LA CONTRATACION COLECTIVA"}
};

const PERSONAL_DATA_MASTER = {"AUTONOMA":{},"MUNICIPAL":{},"SUBVENCIONADA":{},"PRIVADO":{},"ESTADAL":{"obrero":{},"docente":{"D/U":"DOCENTE UNICO"},"administrativo":{}},"NACIONAL":{"obrero":{"8992N":{"cargos":["COCINERO III"],"rango":"COCINERO III"},"8627N":{"cargos":["AYUDANTE AGROPECUARIO III"],"rango":"AYUDANTE AGROPECUARIO III"},"8037N":{"cargos":["OPERADOR DE PRENSA","ENCUADERNADOR"],"rango":"OBRERO CERTIFICADO III (CALIFICADO) GRADO 7"},"8690N":{"cargos":["PORTERO"],"rango":"PORTERO"},"8035N":{"cargos":["CHOFER DE TRANSPORTE","TIMONEL DE EMBARCACIÓN","AYUDANTE DE ALMACEN","PLOMERO","ELECTRICISTA","TAPICERO","COCINERO","OPERADOR DE MÁQUINA LIVIANA"],"rango":"OBRERO CERTIFICADO I (CALIFICADO) GRADO 5"},"8040N":{"cargos":["SUPERVISOR DE MANTENIMIENTO","SUPERVISOR DE SERVICIOS ESPECIALES","SUPERVISOR DE SERVICIOS DE REPRODUCCIÓN","MADRE SENIFA"],"rango":"OBRERO SUPERVISOR II GRADO 10"},"8038N":{"cargos":["ELECTROMECÁNICO","MECANICO AUTOMOTRIZ"],"rango":"OBRERO CERTIFICADO IV (CALIFICADO) GRADO 8"},"8626N":{"cargos":["AYUDANTE AGROPECUARIO II"],"rango":"AYUDANTE AGROPECUARIO II"},"8034N":{"cargos":["LATONERO PINTOR","PINTOR","DESPENSERO","RECEPTOR INFORMADOR"],"rango":"OBRERO GENERAL IV (NO CALIFICADO) GRADO 4"},"8260C":{"cargos":["CHOFER"],"rango":"CHOFER CONTRATADO"},"8986N":{"cargos":["VIGILANTE II"],"rango":"OBRERO VIGILANTE II GRADO 6"},"8625N":{"cargos":["AYUDANTE AGROPECUARIO I"],"rango":"AYUDANTE AGROPECUARIO I"},"8987N":{"cargos":["VIGILANTE III"],"rango":"OBRERO VIGILANTE III GRADO 7"},"8032N":{"cargos":["AYUDANTE DE SERVICIOS DE COCINA","ASEADOR II","ASCENSORISTA","LAVANDERO","PLANCHADOR","MENSAJERO GRADO","PORTERO"],"rango":"OBRERO GENERAL II (NO CALIFICADO) GRADO 2"},"8991N":{"cargos":["COCINERO II"],"rango":"COCINERO II"},"8990N":{"cargos":["COCINERO"],"rango":"COCINERO I"},"8989N":{"cargos":["SUPERVISOR GENERAL DE SEGURIDAD"],"rango":"OBRERO SUPERVISOR GENERAL DE SEGURIDAD GRADO 10"},"8985C":{"cargos":["VIGILANTE"],"rango":"VIGILANTE CONTRATADO"},"8031N":{"cargos":["ASEADOR I"],"rango":"OBRERO GENERAL I (NO CALIFICADO) GRADO 1"},"8039N":{"cargos":["SUPERVISOR DE SERVICIOS INTERNOS","SUPERVISOR AUXILIAR DE MANTENIMIENTO","MADRE SENIFA"],"rango":"OBRERO SUPERVISOR I GRADO 9"},"8988N":{"cargos":["SUPERVISOR DE ÁREA DE SEGURIDAD"],"rango":"OBRERO SUPERVISOR DE AREA DE SEGURIDAD GRADO 9"},"8985N":{"cargos":["VIGILANTE I"],"rango":"OBRERO VIGILANTE I GRADO 5"},"8033N":{"cargos":["JARDINERO","ASEADOR III","AYUDANTE DE SERVICIOS","AYUDANTE DE ARTES","MENSAJERO MOTORIZADO","OPERADOR DE MAQUINA FOTOCOPIADORA","CONSERJE","FUMIGADOR","AYUDANTE DE CARGA"],"rango":"OBRERO GENERAL III (NO CALIFICADO) GRADO 3"},"8036N":{"cargos":["ALBAÑIL","AUXILIAR DE LABORATORIO","CARPINTERO","HERRERO SOLDADOR","FOTOGRABADOR PLANCHISTA","MARINO AUXILIAR","OPERADOR DE MÁQUINA PESADA"],"rango":"OBRERO CERTIFICADO II (CALIFICADO) GRADO 6"}},"administrativo":{"100000":"BACHILLER I","110000":"BACHILLER II","110100":"BACHILLER III","200000":"TSU I","210000":"TSU II","210100":"TSU III","300000":"PROFESIONAL UNIV. I","310000":"PROFESIONAL UNIV. II","310100":"PROFESIONAL UNIV. III","340201":"PROFESIONAL UNIV. MEDICO I","340202":"PROFESIONAL UNIV. MEDICO II","340203":"PROFESIONAL UNIV. MEDICO III","340601":"PROFESIONAL UNIV. ODONTOLOGO I","340603":"PROFESIONAL UNIV. ODONTOLOGO III"},"docente":{"1143NH":"DOC. III / AULA","4160DH":"DOC. (NG) / AULA","6120DI":"TSU PROF. NO DOC.","1124DH":"DOC. IV / AULA","1125DI":"DOC. V / AULA","1122DH":"DOC. II / AULA","1172DH":"DOC. II / AULA","2157DH":"TSU EN EDUCACION","1113DB":"DOC. III / AULA BOLIV.","1123DI":"DOC. III / AULA","1164DH":"DOC. IV / AULA","1115DB":"DOC. V / AULA BOLIV.","1113DI":"DOC. III / AULA","5120DI":"LIC. PROFESIONAL NO DOC.","7140DH":"TM / PERITO PROF. NO DOC.","1132DH":"DOC. II / AULA","1194NH":"DOC. IV / AULA","1155DH":"DOC. V / AULA","2167DB":"TSU EN EDUCACION BOLIV.","1186NH":"DOC. VI / AULA","1176DH":"DOC. VI / AULA","1124DI":"DOC. IV / AULA","3128DB":"MAESTRO NORMAL. EN EDU BO","1135DH":"DOC. V / AULA","6140DH":"TSU PROF. NO DOC.","1145DH":"DOC. V / AULA","1174NH":"DOC. IV / AULA","1126DI":"DOC. VI / AULA","1183DH":"DOC. III / AULA","1152DH":"DOC. II / AULA","1124DB":"DOC. IV / AULA BOLIV.","1193DH":"DOC. III / AULA","4160DI":"DOC. (NG) / AULA","1172NH":"DOC. II / AULA","1174DH":"DOC. IV / AULA","4A50WH":"RESIDENTE / AGRO. (NG)","1121DB":"DOC. I / AULA BOLIV.","1161DB":"DOC. I / AULA BOLIV.","1164DI":"DOC. IV / AULA","1A53DH":"RESIDENTE / AGRO. III","4170NH":"DOC. (NG) / AULA","1195DH":"DOC. V / AULA","4140DH":"DOC. (NG) / AULA","1122DI":"DOC. II / AULA","1165DI":"DOC. V / AULA","1134DH":"DOC. IV / AULA","1116DB":"DOC. VI / AULA BOLIV.","1112DI":"DOC. II / AULA","1A55DH":"RESIDENTE / AGRO. V","1156DH":"DOC. VI / AULA","5180NH":"LIC. PROFESIONAL NO DOC.","6120DB":"TSU PROF. NO DOC. BOLIV.","1191NH":"DOC. I / AULA","4150DH":"DOC. (NG) / AULA","1162DI":"DOC. II / AULA","1146DH":"DOC. VI / AULA","3198NH":"MAESTRO NORMALISTA EN EDU","1115DI":"DOC. V / AULA","2127DH":"TSU EN EDUCACION","1163DI":"DOC. III / AULA","2127DI":"TSU EN EDUCACION","1A54DH":"RESIDENTE / AGRO. IV","1121DH":"DOC. I / AULA","1141DH":"DOC. I / AULA","5120DB":"LIC. PROFES. NO DOC. BOLI","1116DI":"DOC. VI / AULA","4120DI":"DOC. (NG) / AULA","4160DB":"DOC. (NG) / AULA BOLIV.","1151DH":"DOC. I / AULA","1121DI":"DOC. I / AULA","2A57DH":"RESIDENTE / AGRO. TSU","3128DI":"MAESTRO NORMALISTA EN EDU","1153DH":"DOC. III / AULA","1165DH":"DOC. V / AULA","1196NH":"DOC. VI / AULA","4180DH":"DOC. (NG) / AULA","1111DI":"DOC. I / AULA","1126DH":"DOC. VI / AULA","1111DH":"DOC. I / AULA","4110DI":"DOC. (NG) / AULA","1195NH":"DOC. V / AULA","4110DB":"DOC. (NG) / AULA BOLIV.","2147DH":"TSU EN EDUCACION","2137DH":"TSU EN EDUCACION","1183NH":"DOC. III / AULA","1173DH":"DOC. III / AULA","1166DI":"DOC. VI / AULA","2127DB":"TSU EN EDUCACION BOLIV.","3128DH":"MAESTRO NORMALISTA EN EDU","3198DH":"MAESTRO NORMALISTA EN EDU","1185NH":"DOC. V / AULA","1131DH":"DOC. I / AULA","1123DH":"DOC. III / AULA","1192NH":"DOC. II / AULA","1162DB":"DOC. II / AULA BOLIV.","2167DI":"TSU EN EDUCACION","1182NH":"DOC. II / AULA","1166DH":"DOC. VI / AULA","5140DH":"LIC. PROFESIONAL NO DOC.","1181ZH":"DOC. I / AULA","210LNR":"JEFE DE DIVISION","4120DH":"DOC. (NG) / AULA","2117DB":"TSU EN EDUCACION BOLIV.","1114DI":"DOC. IV / AULA","1133DH":"DOC. III / AULA","2117DI":"TSU EN EDUCACION","1126DB":"DOC. VI / AULA BOLIV.","1176NH":"DOC. VI / AULA","6180NH":"TSU PROF. NO DOC.","1164DB":"DOC. IV / AULA BOLIV.","1142DH":"DOC. II / AULA","6150DH":"TSU PROF. NO DOC.","4190DH":"DOC. (NG) / AULA","1194DH":"DOC. IV / AULA","2187NH":"TSU EN EDUCACION","1114DB":"DOC. IV / AULA BOLIV.","4170DH":"DOC. (NG) / AULA","4120DB":"DOC. (NG) / AULA BOLIV.","1122DB":"DOC. II / AULA BOLIV.","1143DH":"DOC. III / AULA","4130DH":"DOC. (NG) / AULA","1154DH":"DOC. IV / AULA","1161DI":"DOC. I / AULA","1125DB":"DOC. V / AULA BOLIV.","1181NH":"DOC. I / AULA","1184NH":"DOC. IV / AULA","1175NH":"DOC. V / AULA","1173NH":"DOC. III / AULA","1112DB":"DOC. II / AULA BOLIV.","1171NH":"DOC. I / AULA","1165DB":"DOC. V / AULA BOLIV.","1144DH":"DOC. IV / AULA","1163DB":"DOC. III / AULA BOLIV.","1111DB":"DOC. I / AULA BOLIV.","1123DB":"DOC. III / AULA BOLIV.","1184DH":"DOC. IV / AULA","6130DH":"TSU PROF. NO DOC.","4190NH":"DOC. (NG) / AULA","1161DH":"DOC. I / AULA","1196DH":"DOC. VI / AULA","1136DH":"DOC. VI / AULA","4180NH":"DOC. (NG) / AULA","1166DB":"DOC. VI / AULA BOLIV.","1141NH":"DOC. I / AULA","5130DH":"LIC. PROFESIONAL NO DOC.","1182DH":"DOC. II / AULA","1125DH":"DOC. V / AULA"}}};

let _CATALOGOS_CACHE = null;

// Variable de estado global para controlar modo edición
window._docIdEnEdicion = null;

/**
 * Obtiene los catálogos maestros desde localStorage o Firestore si aún no están cacheados
 */
export async function obtenerCatalogosMaestros() {
    if (_CATALOGOS_CACHE) return _CATALOGOS_CACHE;

    try {
        const raw = localStorage.getItem('sgh_catalogos');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                _CATALOGOS_CACHE = parsed;
                return _CATALOGOS_CACHE;
            }
        }
    } catch(e) {
        console.warn("Aviso leyendo sgh_catalogos de localStorage:", e);
    }

    try {
        const snap = await getDoc(doc(db, 'sistema', 'catalogos_maestros'));
        if (snap.exists()) {
            const data = snap.data();
            localStorage.setItem('sgh_catalogos', JSON.stringify(data));
            _CATALOGOS_CACHE = data;
            return _CATALOGOS_CACHE;
        }
    } catch(e) {
        console.warn("Aviso consultando catalogos_maestros en Firestore:", e);
    }

    _CATALOGOS_CACHE = CATALOGOS_FALLBACK;
    return _CATALOGOS_CACHE;
}

/**
 * Puebla todos los selectores con clase .c-cat y configura la descripción reactiva
 */
export async function poblarCatalogosGenerales(catalogos = null) {
    if (!catalogos) {
        catalogos = await obtenerCatalogosMaestros();
    }

    const ld = catalogos.listas_desplegables || CATALOGOS_FALLBACK.listas_desplegables;
    const sitMap = (catalogos.situacion_laboral && typeof catalogos.situacion_laboral === 'object')
        ? catalogos.situacion_laboral
        : CATALOGOS_FALLBACK.situacion_laboral;

    const mapeo = {
        'estado-civil': ld.estado_civil || CATALOGOS_FALLBACK.listas_desplegables.estado_civil,
        'instruccion': LISTA_EXTENSA_INSTRUCCION,
        'turnos-atiende': catalogos.turnos || CATALOGOS_FALLBACK.turnos,
        'situacion-laboral': Object.keys(sitMap),
        'talla-camisa': CATALOGOS_FALLBACK.tallas_camisa,
        'talla-pantalon': CATALOGOS_FALLBACK.tallas_pantalon,
        'talla-zapato': CATALOGOS_FALLBACK.tallas_zapato,
        'tipo-vivienda': ld.tipo_vivienda || CATALOGOS_FALLBACK.listas_desplegables.tipo_vivienda,
        'condicion-vivienda': ld.condicion_vivienda || CATALOGOS_FALLBACK.listas_desplegables.condicion_vivienda
    };

    document.querySelectorAll('.c-cat').forEach(select => {
        const catKey = select.getAttribute('data-cat');
        const opciones = mapeo[catKey];
        if (opciones && Array.isArray(opciones)) {
            const valorActual = select.value;
            select.innerHTML = '<option value="">Seleccione...</option>';
            opciones.forEach(opt => {
                const val = typeof opt === 'string' ? opt : (opt.nombre || opt.valor || opt.id);
                const optEl = document.createElement('option');
                optEl.value = val;
                optEl.textContent = val;
                if (val === valorActual) optEl.selected = true;
                select.appendChild(optEl);
            });
        }
    });

    // Reactividad para Situación Laboral -> Descripción
    const selSit = document.getElementById('wp-situacion-laboral');
    const inpDesc = document.getElementById('wp-descripcion-situacion');
    if (selSit && inpDesc) {
        selSit.onchange = () => {
            const val = selSit.value;
            inpDesc.value = (val && sitMap[val]) ? sitMap[val] : '';
        };
        if (selSit.value) {
            selSit.dispatchEvent(new Event('change'));
        }
    }

    // Poblar Selector de Nivel / Modalidad
    const selNivelMod = document.getElementById('wp-nivel-modalidad');
    if (selNivelMod) {
        const valNivelActual = selNivelMod.value;
        selNivelMod.innerHTML = '<option value="">Seleccione Nivel / Modalidad...</option>';

        const niveles = ld.niveles_educativos || CATALOGOS_FALLBACK.listas_desplegables.niveles_educativos;
        if (niveles && niveles.length > 0) {
            const grpNivel = document.createElement('optgroup');
            grpNivel.label = 'Niveles Educativos';
            niveles.forEach(n => {
                const opt = document.createElement('option');
                opt.value = n;
                opt.textContent = n;
                if (n === valNivelActual) opt.selected = true;
                grpNivel.appendChild(opt);
            });
            selNivelMod.appendChild(grpNivel);
        }

        const modalidades = ld.modalidades || CATALOGOS_FALLBACK.listas_desplegables.modalidades;
        if (modalidades && modalidades.length > 0) {
            const grpMod = document.createElement('optgroup');
            grpMod.label = 'Modalidades';
            modalidades.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m;
                opt.textContent = m;
                if (m === valNivelActual) opt.selected = true;
                grpMod.appendChild(opt);
            });
            selNivelMod.appendChild(grpMod);
        }
    }
}

/**
 * Inicializa la cascada laboral estricta en el orden solicitado:
 * 1. Tipo de personal (DOCENTE - ADMINISTRATIVO - OBRERO)
 * 2. Dependencia (NACIONAL - ESTADAL)
 */
export async function initCascadaPersonal() {
    const selTipo = document.getElementById('wp-tipo-personal');
    const selDep = document.getElementById('wp-dependencia');
    const containerRango = document.getElementById('container-rango-obrero');
    const selRango = document.getElementById('wp-subcategoria');
    const selCargo = document.getElementById('wp-cargo');
    const selRac = document.getElementById('wp-codigo-rac');

    if (!selTipo || !selDep || !selCargo || !selRac) return;

    const depActual = selDep.value;
    selDep.innerHTML = '<option value="">Seleccione Dependencia...</option>' +
                       '<option value="NACIONAL">NACIONAL</option>' +
                       '<option value="ESTADAL">ESTADAL</option>';
    if (depActual) selDep.value = depActual;

    const catalogos = await obtenerCatalogosMaestros();
    const personalData = catalogos.clasificacion_cargos || catalogos.personal || PERSONAL_DATA_MASTER;

    function actualizarCascada() {
        const tipo = (selTipo.value || '').toUpperCase();
        const dep = (selDep.value || '').toUpperCase();

        if (!tipo) {
            selDep.disabled = true;
            selDep.value = '';
            if (containerRango) containerRango.style.display = 'none';
            if (selRango) { selRango.innerHTML = '<option value="">Seleccione Rango...</option>'; selRango.value = ''; }
            selCargo.disabled = true;
            selCargo.innerHTML = '<option value="">Seleccione Cargo...</option>';
            selRac.disabled = true;
            selRac.innerHTML = '<option value="">Auto / Seleccione...</option>';
            return;
        }

        selDep.disabled = false;

        if (!dep) {
            if (containerRango) containerRango.style.display = 'none';
            if (selRango) { selRango.innerHTML = '<option value="">Seleccione Rango...</option>'; selRango.value = ''; }
            selCargo.disabled = true;
            selCargo.innerHTML = '<option value="">— Primero elija Dependencia —</option>';
            selRac.disabled = true;
            selRac.innerHTML = '<option value="">Auto / Seleccione...</option>';
            return;
        }

        // Caso 1: NACIONAL + OBRERO
        if (dep === 'NACIONAL' && tipo === 'OBRERO') {
            if (containerRango) containerRango.style.display = 'block';
            const obreroMap = (personalData.NACIONAL && personalData.NACIONAL.obrero) || (PERSONAL_DATA_MASTER.NACIONAL && PERSONAL_DATA_MASTER.NACIONAL.obrero) || {};

            if (selRango) {
                const rangoValActual = selRango.value;
                selRango.innerHTML = '<option value="">Seleccione Rango...</option>';
                Object.keys(obreroMap).forEach(rac => {
                    const item = obreroMap[rac];
                    const opt = document.createElement('option');
                    opt.value = rac;
                    opt.textContent = item.rango || rac;
                    if (rac === rangoValActual) opt.selected = true;
                    selRango.appendChild(opt);
                });
            }

            selCargo.disabled = true;
            selCargo.innerHTML = '<option value="">— Primero seleccione Rango —</option>';
            selRac.disabled = true;
            selRac.innerHTML = '<option value="">Auto</option>';

            poblarOficiosObrero();
            return;
        }

        if (containerRango) containerRango.style.display = 'none';
        if (selRango) { selRango.innerHTML = '<option value="">Seleccione Rango...</option>'; selRango.value = ''; }

        // Caso 2: NACIONAL + DOCENTE / ADMINISTRATIVO
        if (dep === 'NACIONAL') {
            const subclave = tipo === 'DOCENTE' ? 'docente' : 'administrativo';
            const map = (personalData.NACIONAL && personalData.NACIONAL[subclave]) || (PERSONAL_DATA_MASTER.NACIONAL && PERSONAL_DATA_MASTER.NACIONAL[subclave]) || {};

            const cargosMap = {};
            for (const rac in map) {
                const cNombre = map[rac];
                if (!cargosMap[cNombre]) cargosMap[cNombre] = [];
                cargosMap[cNombre].push(rac);
            }

            selCargo.disabled = false;
            const cargoActual = selCargo.value;
            selCargo.innerHTML = '<option value="">Seleccione Cargo...</option>';
            Object.keys(cargosMap).sort().forEach(cNombre => {
                const opt = document.createElement('option');
                opt.value = cNombre;
                opt.textContent = cNombre;
                if (cNombre === cargoActual) opt.selected = true;
                selCargo.appendChild(opt);
            });

            selRac.disabled = true;
            selRac.innerHTML = '<option value="">— Primero seleccione Cargo —</option>';

            poblarRacDocAdmin(cargosMap);
            return;
        }

        // Caso 3: ESTADAL
        if (dep === 'ESTADAL') {
            const subclave = tipo.toLowerCase();
            const estMap = (personalData.ESTADAL && personalData.ESTADAL[subclave]) || (PERSONAL_DATA_MASTER.ESTADAL && PERSONAL_DATA_MASTER.ESTADAL[subclave]) || {};

            const keys = Object.keys(estMap);
            if (keys.length > 0) {
                selCargo.disabled = false;
                const cargoActual = selCargo.value;
                selCargo.innerHTML = '<option value="">Seleccione Cargo...</option>';
                keys.forEach(rac => {
                    const cNombre = estMap[rac];
                    const opt = document.createElement('option');
                    opt.value = cNombre;
                    opt.textContent = cNombre;
                    opt.dataset.rac = rac;
                    if (cNombre === cargoActual) opt.selected = true;
                    selCargo.appendChild(opt);
                });

                poblarRacEstadal(estMap);
            } else {
                selCargo.disabled = false;
                selCargo.innerHTML = '<option value="">Seleccione Cargo...</option>';
                let opcionesEstadal = [];
                if (tipo === 'DOCENTE') {
                    opcionesEstadal = [
                        { cargo: 'DOCENTE DE AULA', rac: '1161DH' },
                        { cargo: 'DOCENTE INTEGRAL', rac: '1182DH' },
                        { cargo: 'DOCENTE UNICO', rac: 'D/U' }
                    ];
                } else if (tipo === 'ADMINISTRATIVO') {
                    opcionesEstadal = [
                        { cargo: 'ASISTENTE ADMINISTRATIVO', rac: 'EST-ADM' },
                        { cargo: 'SECRETARIA (O)', rac: '3110N' },
                        { cargo: 'ANALISTA ADMINISTRATIVO', rac: 'EST-ANA' }
                    ];
                } else {
                    opcionesEstadal = [
                        { cargo: 'ASEADOR (A)', rac: '8031N' },
                        { cargo: 'OBRERO DE MANTENIMIENTO', rac: 'EST-OBR' },
                        { cargo: 'VIGILANTE', rac: '8985N' }
                    ];
                }

                opcionesEstadal.forEach(item => {
                    const opt = document.createElement('option');
                    opt.value = item.cargo;
                    opt.textContent = item.cargo;
                    opt.dataset.rac = item.rac;
                    selCargo.appendChild(opt);
                });

                selRac.disabled = false;
                selRac.innerHTML = '<option value="">Auto / Seleccione...</option>';
                selCargo.onchange = () => {
                    const opt = selCargo.options[selCargo.selectedIndex];
                    const racVal = opt?.dataset?.rac || '';
                    selRac.innerHTML = racVal ? `<option value="${racVal}" selected>${racVal}</option>` : '<option value="">Auto</option>';
                };
            }
        }
    }

    function poblarOficiosObrero() {
        if (!selRango) return;
        const obreroMap = (personalData.NACIONAL && personalData.NACIONAL.obrero) || (PERSONAL_DATA_MASTER.NACIONAL && PERSONAL_DATA_MASTER.NACIONAL.obrero) || {};
        
        selRango.onchange = () => {
            const racCode = selRango.value;
            if (!racCode || !obreroMap[racCode]) {
                selCargo.disabled = true;
                selCargo.innerHTML = '<option value="">— Primero seleccione Rango —</option>';
                selRac.disabled = true;
                selRac.innerHTML = '<option value="">Auto</option>';
                return;
            }

            const item = obreroMap[racCode];
            const oficios = item.cargos || [item.rango];

            selCargo.disabled = false;
            selCargo.innerHTML = '<option value="">Seleccione Oficio / Cargo...</option>';
            oficios.forEach(oficio => {
                const opt = document.createElement('option');
                opt.value = oficio;
                opt.textContent = oficio;
                selCargo.appendChild(opt);
            });
            if (oficios.length === 1) {
                selCargo.selectedIndex = 1;
            }

            selRac.disabled = false;
            selRac.innerHTML = `<option value="${racCode}" selected>${racCode}</option>`;
        };

        if (selRango.value) {
            selRango.dispatchEvent(new Event('change'));
        }
    }

    function poblarRacDocAdmin(cargosMap) {
        selCargo.onchange = () => {
            const cNombre = selCargo.value;
            const racs = cargosMap[cNombre] || [];

            if (racs.length === 0) {
                selRac.disabled = true;
                selRac.innerHTML = '<option value="">Auto</option>';
                return;
            }

            selRac.disabled = false;
            selRac.innerHTML = racs.length > 1 ? '<option value="">Seleccione Código RAC...</option>' : '';
            racs.forEach(rac => {
                const opt = document.createElement('option');
                opt.value = rac;
                opt.textContent = rac;
                selRac.appendChild(opt);
            });

            if (racs.length === 1) {
                selRac.selectedIndex = 0;
            }
        };

        if (selCargo.value) {
            selCargo.dispatchEvent(new Event('change'));
        }
    }

    function poblarRacEstadal(estMap) {
        selCargo.onchange = () => {
            const opt = selCargo.options[selCargo.selectedIndex];
            const racVal = opt?.dataset?.rac || '';
            selRac.disabled = false;
            selRac.innerHTML = racVal ? `<option value="${racVal}" selected>${racVal}</option>` : '<option value="">Auto</option>';
        };

        if (selCargo.value) {
            selCargo.dispatchEvent(new Event('change'));
        }
    }

    selTipo.onchange = () => actualizarCascada();
    selDep.onchange = () => actualizarCascada();
    actualizarCascada();
}

export function mostrarFormularioPersonal(autoScroll = true) {
    poblarCatalogosGenerales();
    initCascadaPersonal();
    limpiarFormularioPersonal();

    const contenedor = document.getElementById('seccion-registro-personal');
    const contenedorTabla = document.getElementById('seccion-personal-existente');
    
    if (contenedorTabla) contenedorTabla.style.display = 'block';
    if (contenedor) {
        contenedor.style.display = 'block';
        if (autoScroll) {
            if (contenedorTabla) {
                contenedorTabla.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else {
                contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
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
        const tbody = document.getElementById('tbody-personal-existente');
        if (tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No hay sesión de DEA detectada.</td></tr>';
    }
}

export function cerrarFormularioPersonal() {
    const contenedor = document.getElementById('seccion-registro-personal');
    const contenedorTabla = document.getElementById('seccion-personal-existente');
    if (contenedor) contenedor.style.display = 'none';
    if (contenedorTabla) contenedorTabla.style.display = 'none';
}

export function limpiarFormularioPersonal() {
    window._docIdEnEdicion = null;

    const bannerEdit = document.getElementById('banner-modo-edicion');
    if (bannerEdit) bannerEdit.style.display = 'none';

    const btnSubmit = document.getElementById('btn-guardar-empleado-inline');
    if (btnSubmit) btnSubmit.textContent = "Guardar Empleado";

    const cedInp = document.getElementById('wp-cedula');
    if (cedInp) cedInp.readOnly = false;

    // Limpiar campo de búsqueda y restaurar filtrado de tabla
    const searchInput = document.getElementById('buscador-personal');
    if (searchInput && searchInput.value) {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
    }

    const ids = [
        'wp-cedula', 'wp-nombres', 'wp-nacimiento', 'wp-edad', 'wp-genero', 'wp-nacionalidad',
        'wp-ubicacion-administrativa', 'wp-tipo-personal', 'wp-dependencia', 'wp-subcategoria',
        'wp-cargo', 'wp-codigo-rac', 'wp-situacion-laboral', 'wp-descripcion-situacion', 'wp-especialidad-imparte',
        'wp-fecha-ingreso', 'wp-antiguedad', 'wp-instruccion', 'wp-titulo', 'wp-turnos-atiende',
        'wp-talla-camisa', 'wp-talla-pantalon', 'wp-talla-zapato', 'wp-atiende-matricula',
        'wp-nivel-modalidad', 'wp-tipo-vivienda', 'wp-condicion-vivienda', 'wp-tipo-material',
        'wp-tipo-enfermedad', 'wp-medicamento', 'wp-discapacidad', 'wp-ubch', 'wp-circuito-comunal',
        'wp-centro-votacion', 'wp-observaciones', 'wp-tel-habitacion', 'wp-tel-celular', 'wp-tel-oficina',
        'wp-prefijo-hab', 'wp-prefijo-cel', 'wp-prefijo-ofi', 'wp-correo', 'wp-direccion', 'wp-profesion'
    ];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (el.tagName === 'SELECT') el.selectedIndex = 0;
            else el.value = '';
        }
    });

    const containerRango = document.getElementById('container-rango-obrero');
    if (containerRango) containerRango.style.display = 'none';

    const containerNivel = document.getElementById('container-nivel-modalidad');
    if (containerNivel) containerNivel.style.display = 'none';

    const containerEsp = document.getElementById('container-especialidad');
    if (containerEsp) containerEsp.style.display = 'none';

    const containerCuad = document.getElementById('container-btn-cuadratura');
    if (containerCuad) containerCuad.style.display = 'none';

    const depSel = document.getElementById('wp-dependencia');
    if (depSel) depSel.disabled = true;

    const cargoSel = document.getElementById('wp-cargo');
    if (cargoSel) {
        cargoSel.innerHTML = '<option value="">Seleccione Cargo...</option>';
        cargoSel.disabled = true;
    }

    const racSel = document.getElementById('wp-codigo-rac');
    if (racSel) {
        racSel.innerHTML = '<option value="">Auto / Seleccione...</option>';
        racSel.disabled = true;
    }
}

export function calcularEdadWizard() {
    const nac = document.getElementById('wp-nacimiento')?.value;
    if (!nac) return;
    const birthDate = new Date(nac);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    const txtEdad = document.getElementById('wp-edad');
    if (txtEdad) txtEdad.value = age > 0 ? age : 0;
}

export function calcularAntiguedadWizard() {
    const ing = document.getElementById('wp-fecha-ingreso')?.value;
    if (!ing) return;
    const ingDate = new Date(ing);
    const today = new Date();
    let years = today.getFullYear() - ingDate.getFullYear();
    const m = today.getMonth() - ingDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < ingDate.getDate())) years--;
    const txtAntiguedad = document.getElementById('wp-antiguedad');
    if (txtAntiguedad) txtAntiguedad.value = years >= 0 ? years : 0;
}

/**
 * Carga todos los datos correspondientes de un empleado en las casillas del formulario para edición
 */

function setSelectSmart(selectId, val) {
    const el = document.getElementById(selectId);
    if (!el || val === undefined || val === null || val === '') return;
    const vStr = String(val).trim();
    const vUpper = vStr.toUpperCase();

    // 1. Coincidencia directa por valor o texto
    for (let i = 0; i < el.options.length; i++) {
        const optVal = el.options[i].value.trim().toUpperCase();
        const optTxt = el.options[i].textContent.trim().toUpperCase();
        if (optVal === vUpper || optTxt === vUpper) {
            el.selectedIndex = i;
            return;
        }
    }

    // 2. Mapeos de equivalencias institucionales
    if (selectId === 'wp-genero') {
        if (vUpper.startsWith('FEM')) { el.value = 'FEM'; return; }
        if (vUpper.startsWith('MAS')) { el.value = 'MAS'; return; }
    }

    if (selectId === 'wp-instruccion') {
        // Mapeos de compatibilidad institucional con la lista extensa
        let mappedVal = '';
        if (vUpper === 'SUPERIOR' || vUpper.includes('UNIVERSITAR') || vUpper.includes('LICENCIA') || vUpper.includes('INGENIE') || vUpper.includes('PROFESOR') || vUpper.includes('ABOGAD')) {
            mappedVal = 'UNIVERSITARIO';
        } else if (vUpper.includes('POSTGRADO') || vUpper.includes('POSGRADO') || vUpper.includes('MAGISTER') || vUpper.includes('DOCTOR') || vUpper.includes('ESPECIALIS')) {
            mappedVal = 'POSTGRADO';
        } else if (vUpper.includes('TSU') || vUpper.includes('TECNOLOGO')) {
            mappedVal = 'TSU';
        } else if (vUpper.includes('TECNICO') || vUpper.includes('TÉCNICO')) {
            mappedVal = 'TECNICO MEDIO';
        } else if (vUpper.includes('BACHILLER') || vUpper.includes('SECUNDARIA') || vUpper === 'MEDIA') {
            mappedVal = 'BACHILLER';
        } else if (vUpper.includes('PRIMARIA')) {
            mappedVal = 'PRIMARIA';
        } else if (vUpper.includes('BASICA') || vUpper.includes('BÁSICA')) {
            mappedVal = 'BASICA';
        } else if (vUpper.includes('SIN INSTRUCCION') || vUpper.includes('NINGUNA') || vUpper.includes('ANALFABETA')) {
            mappedVal = 'SIN INSTRUCCION';
        }

        if (mappedVal) {
            for (let i = 0; i < el.options.length; i++) {
                if (el.options[i].value === mappedVal) {
                    el.selectedIndex = i;
                    return;
                }
            }
        }
    }

    // 3. Respaldo total: agregar la opción si no existía para que jamás aparezca en blanco
    const opt = document.createElement('option');
    opt.value = vStr;
    opt.textContent = vStr;
    opt.selected = true;
    el.appendChild(opt);
}

export function cargarEmpleadoEnFormulario(data, docId) {
    window._docIdEnEdicion = docId;

    const contenedor = document.getElementById('seccion-registro-personal');
    if (contenedor) contenedor.style.display = 'block';

    const bannerEdit = document.getElementById('banner-modo-edicion');
    const txtBanner = document.getElementById('texto-modo-edicion');
    const nom = (data['nombre-apellido'] || data['apellidos-nombres'] || data.nombres || data.nombre || '').toUpperCase();
    const ced = data['cedula-identidad'] || data.cedula || '';

    if (bannerEdit) {
        if (txtBanner) txtBanner.textContent = `Modo Edición: Modificando a ${nom} (C.I. ${ced})`;
        bannerEdit.style.display = 'flex';
    }

    const btnSubmit = document.getElementById('btn-guardar-empleado-inline');
    if (btnSubmit) {
        btnSubmit.textContent = "ACTUALIZAR EMPLEADO";
    }

    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val !== undefined && val !== null ? val : '';
    };

    // 1. Datos Personales
    setVal('wp-nacionalidad', data.nacionalidad || 'V');
    setVal('wp-cedula', ced);
    const cedInp = document.getElementById('wp-cedula');
    if (cedInp) cedInp.readOnly = true;

    setVal('wp-nombres', nom);
    setVal('wp-lugar-nacimiento', data['lugar-nacimiento'] || '');
    setVal('wp-nacimiento', data['fecha-nacimiento'] || data.nacimiento || '');
    setVal('wp-edad', data.edad || '');
    if (window.calcularEdadUI && !data.edad && data['fecha-nacimiento']) {
        window.calcularEdadUI();
    }
    setSelectSmart('wp-genero', data.genero || '');

    // Desglose de Teléfonos
    const setTel = (prefId, numId, fullVal) => {
        const pEl = document.getElementById(prefId);
        const nEl = document.getElementById(numId);
        if (!fullVal || fullVal.length < 4) {
            if (pEl) pEl.value = '';
            if (nEl) nEl.value = fullVal || '';
            return;
        }
        const pref = fullVal.slice(0, 4);
        const num = fullVal.slice(4);
        if (pEl) {
            pEl.value = pref;
            if (!pEl.value) pEl.selectedIndex = 0;
        }
        if (nEl) nEl.value = num;
    };

    setTel('wp-prefijo-hab', 'wp-tel-habitacion', data['tel-habitacion'] || '');
    setTel('wp-prefijo-cel', 'wp-tel-celular', data['tel-celular'] || '');
    setTel('wp-prefijo-ofi', 'wp-tel-oficina', data['tel-oficina'] || '');

    setVal('wp-correo', data.correo || '');
    setSelectSmart('wp-estado-civil', data['estado-civil'] || '');
    setVal('wp-direccion', data.direccion || '');
    setSelectSmart('wp-instruccion', data.instruccion || data['nivel-instruccion'] || data['nivel_instruccion'] || data['NIVEL DE INSTRUCCIÓN'] || data['NIVEL DE INSTRUCCION'] || '');
    setVal('wp-profesion', data.profesion || '');

    // 2. Datos Laborales
    setVal('wp-ubicacion-administrativa', data['ubicacion-administrativa'] || '');
    
    const tipo = (data['tipo-personal'] || '').toUpperCase();
    const dep = (data.dependencia || '').toUpperCase();
    const selTipo = document.getElementById('wp-tipo-personal');
    const selDep = document.getElementById('wp-dependencia');

    if (selTipo) {
        selTipo.value = tipo;
        selTipo.dispatchEvent(new Event('change'));
    }

    if (selDep) {
        selDep.value = dep;
        selDep.dispatchEvent(new Event('change'));
    }

    // Configuración retardada para sincronizar las cascadas dinámicas
    setTimeout(() => {
        if (tipo === 'OBRERO' && dep === 'NACIONAL') {
            const selRango = document.getElementById('wp-subcategoria');
            const racVal = data['codigo-rac'] || data['codigo-cargo'] || '';
            if (selRango) {
                if (racVal) selRango.value = racVal;
                if (!selRango.value && data.subcategoria) {
                    for (let i = 0; i < selRango.options.length; i++) {
                        if (selRango.options[i].textContent.trim().toUpperCase() === data.subcategoria.trim().toUpperCase()) {
                            selRango.selectedIndex = i;
                            break;
                        }
                    }
                }
                selRango.dispatchEvent(new Event('change'));
            }
            setTimeout(() => {
                setVal('wp-cargo', data.cargo || '');
                setVal('wp-codigo-rac', racVal);
            }, 30);
        } else {
            const selCargo = document.getElementById('wp-cargo');
            if (selCargo) {
                selCargo.value = data.cargo || '';
                selCargo.dispatchEvent(new Event('change'));
            }
            setTimeout(() => {
                setVal('wp-codigo-rac', data['codigo-rac'] || data['codigo-cargo'] || '');
            }, 30);
        }

        setVal('wp-titular', data.titular || '');
        setVal('wp-horas-academicas', data['horas-academicas'] || '');
        setVal('wp-horas-administrativas', data['horas-administrativas'] || '');
        setVal('wp-fecha-ingreso', data['fecha-ingreso'] || '');
        setVal('wp-antiguedad', data.antiguedad || '');
        if (window.calcularAntiguedadUI && !data.antiguedad && data['fecha-ingreso']) {
            window.calcularAntiguedadUI();
        }
        setVal('wp-turnos-atiende', data['turnos-atiende'] || '');

        const atiendeMat = data['atiende-matricula'] || (data['nivel-modalidad'] ? 'SI' : 'NO');
        setVal('wp-atiende-matricula', atiendeMat);
        if (window.toggleMatriculaUI) window.toggleMatriculaUI();

        setVal('wp-nivel-modalidad', data['nivel-modalidad'] || '');
        setVal('wp-especialidad-imparte', data['especialidad-imparte'] || '');

        // 3. Situación del Trabajador
        const selSit = document.getElementById('wp-situacion-laboral');
        if (selSit) {
            selSit.value = data['situacion-laboral'] || '';
            selSit.dispatchEvent(new Event('change'));
        }
        setVal('wp-descripcion-situacion', data['descripcion-situacion'] || '');
        setVal('wp-observaciones', data.observaciones || '');

        // 4. Bienestar Social
        setVal('wp-talla-camisa', data['talla-camisa'] || '');
        setVal('wp-talla-pantalon', data['talla-pantalon'] || '');
        setVal('wp-talla-zapato', data['talla-zapato'] || '');
        setVal('wp-actividad-deportiva', data['actividad-deportiva'] || '');
        setVal('wp-actividad-cultural', data['actividad-cultural'] || '');
        setVal('wp-tipo-vivienda', data['tipo-vivienda'] || '');
        setVal('wp-condicion-vivienda', data['condicion-vivienda'] || '');
        setVal('wp-tipo-material', data['tipo-material'] || '');
        setVal('wp-discapacidad', data.discapacidad || 'NO');
        setVal('wp-tipo-enfermedad', data['tipo-enfermedad'] || '');
        setVal('wp-medicamento', data.medicamento || '');

        // 5. Punto y Círculo
        setVal('wp-ubch', data.ubch || '');
        setVal('wp-circuito-comunal', data['circuito-comunal'] || '');
        setVal('wp-centro-votacion', data['centro-votacion'] || '');
    }, 60);

    if (contenedor) {
        contenedor.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast(`Datos de ${nom} cargados para edición.`, "info");
}

/**
 * Modal personalizado para confirmar la desincorporación del funcionario y registrar auditoría
 */
export function mostrarModalEliminarPersonal(data, docId, codigoDEA) {
    const cedula = data['cedula-identidad'] || data.cedula || '';
    const nombre = (data['nombre-apellido'] || data['apellidos-nombres'] || data.nombre || data.nombres || '').toUpperCase();
    const cargo = data.cargo || 'N/A';

    const modalExistente = document.getElementById('modal-eliminar-personal');
    if (modalExistente) modalExistente.remove();

    const overlay = document.createElement('div');
    overlay.id = 'modal-eliminar-personal';
    overlay.style.cssText = 'position: fixed; inset: 0; background: rgba(15, 23, 42, 0.7); z-index: 99999 !important; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); padding: 20px;';

    overlay.innerHTML = `
        <div style="background: white; border-radius: 16px; max-width: 520px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); overflow: hidden; animation: fadeIn 0.25s ease;">
            <div style="background: #fef2f2; border-bottom: 1px solid #fee2e2; padding: 20px 24px; display: flex; align-items: center; gap: 14px;">
                <div style="width: 44px; height: 44px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; flex-shrink: 0;">
                    🗑️
                </div>
                <div>
                    <h3 style="margin: 0; color: #991b1b; font-size: 1.15rem; font-weight: 700;">Desincorporar Funcionario</h3>
                    <p style="margin: 4px 0 0; color: #b91c1c; font-size: 0.85rem;">Esta acción eliminará al funcionario de la plantilla activa.</p>
                </div>
            </div>

            <div style="padding: 24px;">
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
                    <div style="font-size: 0.95rem; font-weight: 700; color: #1e293b;">${nombre}</div>
                    <div style="font-size: 0.85rem; color: #64748b; margin-top: 2px;">C.I.: <strong>${cedula}</strong> &nbsp;|&nbsp; Cargo: <strong>${cargo}</strong></div>
                </div>

                <div style="margin-bottom: 16px;">
                    <label style="display: block; font-weight: 600; color: #334155; font-size: 0.88rem; margin-bottom: 6px;">
                        Motivo de Desincorporación <span style="color: #dc2626;">*</span>
                    </label>
                    <select id="sel-motivo-desincorporacion" class="form-input" style="cursor: pointer;">
                        <option value="">— Seleccione el motivo —</option>
                        <option value="RENUNCIA">RENUNCIA</option>
                        <option value="TRASLADO INTERZONAL">TRASLADO INTERZONAL</option>
                        <option value="JUBILACION">JUBILACIÓN</option>
                        <option value="ABANDONO DE CARGO">ABANDONO DE CARGO</option>
                        <option value="DEFUNCION">DEFUNCIÓN</option>
                        <option value="ERROR DE REGISTRO / DUPLICADO">ERROR DE REGISTRO / DUPLICADO</option>
                        <option value="COMISION DE SERVICIO">COMISIÓN DE SERVICIO</option>
                        <option value="INCAPACIDAD TOTAL">INCAPACIDAD TOTAL</option>
                        <option value="OTRO">OTRO</option>
                    </select>
                </div>

                <div style="margin-bottom: 24px;">
                    <label style="display: block; font-weight: 600; color: #334155; font-size: 0.88rem; margin-bottom: 6px;">
                        Observaciones / Justificación
                    </label>
                    <textarea id="txt-obs-desincorporacion" class="form-input" rows="2" placeholder="Detalles de la resolución, número de oficio, etc. (Opcional)"></textarea>
                </div>

                <div style="display: flex; justify-content: flex-end; gap: 12px;">
                    <button type="button" id="btn-cancelar-desincorporacion" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer;">
                        Cancelar
                    </button>
                    <button type="button" id="btn-confirmar-desincorporacion" style="background: #dc2626; color: white; border: none; padding: 10px 22px; border-radius: 8px; font-weight: 600; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; gap: 8px;">
                        Confirmar Eliminación
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const btnCancel = overlay.querySelector('#btn-cancelar-desincorporacion');
    const btnConfirm = overlay.querySelector('#btn-confirmar-desincorporacion');
    const selMotivo = overlay.querySelector('#sel-motivo-desincorporacion');
    const txtObs = overlay.querySelector('#txt-obs-desincorporacion');

    btnCancel.onclick = () => overlay.remove();

    btnConfirm.onclick = async () => {
        const motivo = selMotivo.value;
        if (!motivo) {
            selMotivo.style.borderColor = '#dc2626';
            selMotivo.focus();
            showToast("Por favor, seleccione el motivo de desincorporación.", "warning");
            return;
        }

        btnConfirm.disabled = true;
        btnConfirm.textContent = "Procesando...";

        try {
            // 1. Guardar en auditoría histórica (personal_eliminado)
            const auditoriaId = `${codigoDEA}_${cedula}_${Date.now()}`;
            const auditoriaData = {
                cedula: cedula,
                nombre: nombre,
                cargo: cargo,
                codigoRAC: data['codigo-rac'] || data['codigo-cargo'] || '',
                tipo_personal: data['tipo-personal'] || '',
                codigoDEA: codigoDEA,
                motivo_eliminacion: motivo,
                observaciones_motivo: txtObs.value.trim(),
                fecha_eliminacion: new Date().toISOString(),
                usuario_responsable: window.sgh_user_data?.email || 'DIRECTOR_PLANTEL',
                datos_historicos_completos: data
            };

            await setDoc(doc(db, "personal_eliminado", auditoriaId), auditoriaData);

            // 2. Eliminar de cargos_personal
            await deleteDoc(doc(db, "cargos_personal", docId));

            // 3. Actualizar resumen en el documento del plantel
            if (codigoDEA) {
                try {
                    const pRef = doc(db, 'planteles', codigoDEA);
                    const pSnap = await getDoc(pRef);
                    if (pSnap.exists()) {
                        const pData = pSnap.data();
                        const nuevoResumen = (pData.personal_resumen || []).filter(item => item.cedula !== cedula);
                        await updateDoc(pRef, { personal_resumen: nuevoResumen });
                    }
                } catch(e) {
                    console.warn("Aviso actualizando personal_resumen tras desincorporación:", e);
                }
            }

            overlay.remove();
            showToast("Funcionario desincorporado y registrado en auditoría exitosamente.", "success");

            if (window._docIdEnEdicion === docId) {
                limpiarFormularioPersonal();
            }

            cargarPersonalExistente(codigoDEA);

        } catch(err) {
            console.error("Error al desincorporar funcionario:", err);
            btnConfirm.disabled = false;
            btnConfirm.textContent = "Confirmar Eliminación";
            showToast("Error al desincorporar: " + err.message, "error");
        }
    };
}


/**
 * Valida todos los campos requeridos del formulario de personal.
 * Aplica idénticamente tanto al GUARDAR un nuevo empleado como al ACTUALIZAR uno existente.
 * Campos NO requeridos: Teléfono Habitación, Teléfono Oficina, Tipo de Enfermedad, Medicamento, Observaciones y Ubicación Administrativa.
 */
export function validarFormularioPersonal() {
    // Restablecer estilos de error previos
    document.querySelectorAll('#form-personal-inline .form-input').forEach(el => {
        el.style.borderColor = '';
    });

    const campos = [
        // 1. Datos Personales
        { id: 'wp-nacionalidad', nombre: 'Nacionalidad' },
        { id: 'wp-cedula', nombre: 'Cédula de Identidad' },
        { id: 'wp-nombres', nombre: 'Nombres y Apellidos' },
        { id: 'wp-lugar-nacimiento', nombre: 'Lugar de Nacimiento' },
        { id: 'wp-nacimiento', nombre: 'Fecha de Nacimiento' },
        { id: 'wp-genero', nombre: 'Género' },
        { id: 'wp-prefijo-cel', nombre: 'Prefijo Celular' },
        { id: 'wp-tel-celular', nombre: 'Número Celular' },
        { id: 'wp-correo', nombre: 'Correo Electrónico' },
        { id: 'wp-estado-civil', nombre: 'Estado Civil' },
        { id: 'wp-instruccion', nombre: 'Nivel de Instrucción' },
        { id: 'wp-profesion', nombre: 'Profesión' },
        { id: 'wp-direccion', nombre: 'Dirección Completa' },

        // 2. Datos Laborales
        // wp-ubicacion-administrativa es opcional
        { id: 'wp-tipo-personal', nombre: 'Tipo de Personal' },
        { id: 'wp-dependencia', nombre: 'Dependencia' },
        { id: 'wp-cargo', nombre: 'Cargo' },
        { id: 'wp-titular', nombre: 'Condición de Titular' },
// Horas se validan condicionalmente según tipo de personal
        { id: 'wp-fecha-ingreso', nombre: 'Fecha de Ingreso' },
        { id: 'wp-turnos-atiende', nombre: 'Turnos que Atiende' },
        { id: 'wp-atiende-matricula', nombre: '¿Atiende Matrícula?' },

        // 3. Situación Laboral
        { id: 'wp-situacion-laboral', nombre: 'Situación Laboral' },

        // 4. Bienestar Social
        { id: 'wp-talla-camisa', nombre: 'Talla de Camisa' },
        { id: 'wp-talla-pantalon', nombre: 'Talla de Pantalón' },
        { id: 'wp-talla-zapato', nombre: 'Talla de Zapato' },
        { id: 'wp-actividad-deportiva', nombre: 'Actividad Deportiva' },
        { id: 'wp-actividad-cultural', nombre: 'Actividad Cultural' },
        { id: 'wp-tipo-vivienda', nombre: 'Tipo de Vivienda' },
        { id: 'wp-condicion-vivienda', nombre: 'Condición de Vivienda' },
        { id: 'wp-tipo-material', nombre: 'Tipo de Material' },
        { id: 'wp-discapacidad', nombre: 'Posee Discapacidad' },

        // 5. Punto y Círculo
        { id: 'wp-ubch', nombre: 'UBCH' },
        { id: 'wp-circuito-comunal', nombre: 'Circuito Comunal' },
        { id: 'wp-centro-votacion', nombre: 'Centro de Votación' }
    ];

    // Validaciones condicionales dinámicas
    const tipo = (document.getElementById('wp-tipo-personal')?.value || '').toUpperCase();
    const dep = (document.getElementById('wp-dependencia')?.value || '').toUpperCase();

    // Horas condicionales: Académicas para DOCENTE, Administrativas para ADMINISTRATIVO y OBRERO
    if (tipo === 'DOCENTE') {
        campos.push({ id: 'wp-horas-academicas', nombre: 'Horas Académicas' });
    } else if (tipo === 'ADMINISTRATIVO' || tipo === 'OBRERO') {
        campos.push({ id: 'wp-horas-administrativas', nombre: 'Horas Administrativas' });
    }
    if (tipo === 'OBRERO' && dep === 'NACIONAL') {
        campos.push({ id: 'wp-subcategoria', nombre: 'Rango de Obrero' });
    }

    const atiendeMat = document.getElementById('wp-atiende-matricula')?.value;
    if (atiendeMat === 'SI') {
        campos.push({ id: 'wp-nivel-modalidad', nombre: 'Nivel / Modalidad' });
        campos.push({ id: 'wp-especialidad-imparte', nombre: 'Especialidad Imparte' });
    }

    // Revisión secuencial de cada campo
    for (const c of campos) {
        const el = document.getElementById(c.id);
        if (!el) continue;
        const val = (el.value !== undefined && el.value !== null) ? String(el.value).trim() : '';
        
        if (!val) {
            el.style.borderColor = '#dc2626';
            el.focus();
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            showToast(`Por favor, complete el campo requerido: ${c.nombre}`, "warning");
            return false;
        }

        // Validación de celular: mínimo 7 dígitos
        if (c.id === 'wp-tel-celular' && val.length < 7) {
            el.style.borderColor = '#dc2626';
            el.focus();
            showToast('El número de teléfono celular debe tener al menos 7 dígitos.', 'warning');
            return false;
        }

        // Validación de formato de correo
        if (c.id === 'wp-correo' && !val.includes('@')) {
            el.style.borderColor = '#dc2626';
            el.focus();
            showToast('Por favor, ingrese un correo electrónico válido.', 'warning');
            return false;
        }
    }

    return true;
}

export async function guardarPersonalInline() {
    if (!validarFormularioPersonal()) {
        return;
    }

    const cedula = document.getElementById('wp-cedula')?.value || '';
    const nombres = document.getElementById('wp-nombres')?.value || '';

    const telHabNum = document.getElementById('wp-tel-habitacion')?.value || '';
    const telHabPref = document.getElementById('wp-prefijo-hab')?.value || '';
    const telHabCompleto = telHabNum ? (telHabPref + telHabNum) : '';

    const telCelNum = document.getElementById('wp-tel-celular')?.value || '';
    const telCelPref = document.getElementById('wp-prefijo-cel')?.value || '';
    const telCelCompleto = telCelNum ? (telCelPref + telCelNum) : '';

    const telOfiNum = document.getElementById('wp-tel-oficina')?.value || '';
    const telOfiPref = document.getElementById('wp-prefijo-ofi')?.value || '';
    const telOfiCompleto = telOfiNum ? (telOfiPref + telOfiNum) : '';

    const empleadoActual = {
        cedula: cedula,
        nombres: nombres,
        'nombre-apellido': nombres,
        nacionalidad: document.getElementById('wp-nacionalidad')?.value || '',
        'lugar-nacimiento': document.getElementById('wp-lugar-nacimiento')?.value || '',
        'fecha-nacimiento': document.getElementById('wp-nacimiento')?.value || '',
        edad: parseInt(document.getElementById('wp-edad')?.value) || 0,
        genero: document.getElementById('wp-genero')?.value || '',
        'tel-habitacion': telHabCompleto,
        'tel-celular': telCelCompleto,
        'tel-oficina': telOfiCompleto,
        correo: document.getElementById('wp-correo')?.value || '',
        'estado-civil': document.getElementById('wp-estado-civil')?.value || '',
        direccion: document.getElementById('wp-direccion')?.value || '',
        instruccion: document.getElementById('wp-instruccion')?.value || '',
        'nivel-instruccion': document.getElementById('wp-instruccion')?.value || '',
        profesion: document.getElementById('wp-profesion')?.value || '',
        
        'ubicacion-administrativa': document.getElementById('wp-ubicacion-administrativa')?.value || '',
        dependencia: document.getElementById('wp-dependencia')?.value || '',
        'tipo-personal': document.getElementById('wp-tipo-personal')?.value || '',
        subcategoria: (() => {
            const rEl = document.getElementById('wp-subcategoria');
            if (!rEl || !rEl.value) return '';
            return rEl.options[rEl.selectedIndex]?.text || rEl.value;
        })(),
        cargo: document.getElementById('wp-cargo')?.value || '',
        'codigo-cargo': document.getElementById('wp-codigo-rac')?.value || '',
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
        'descripcion-situacion': document.getElementById('wp-descripcion-situacion')?.value || '',
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

    let dea = window.currentPlantelDEA || '';
    if (!dea && window.sgh_user_data && window.sgh_user_data.jerarquia) {
        dea = window.sgh_user_data.jerarquia.plantel_codigo;
    }
    if (!dea) {
        const stPlantel = localStorage.getItem('plantelSeleccionado');
        if (stPlantel) {
            try { dea = JSON.parse(stPlantel).codigoDEA; } catch(e) {}
        }
    }

    const payload = {
        ...empleadoActual,
        'codigo-plantel': dea,
        codigoDEA: dea,
        ultima_actualizacion: new Date().toISOString()
    };

    const isEditing = !!window._docIdEnEdicion;
    // Si se está actualizando, limpiar el campo de búsqueda de inmediato
    if (isEditing) {
        const searchInput = document.getElementById('buscador-personal');
        if (searchInput) {
            searchInput.value = '';
            searchInput.dispatchEvent(new Event('input'));
        }
    }
    const btn = document.getElementById('btn-guardar-empleado-inline');
    if (btn) {
        btn.disabled = true;
        btn.textContent = isEditing ? "Actualizando..." : "Guardando...";
    }

    try {
        let docId = window._docIdEnEdicion;
        if (!docId) {
            docId = dea ? (dea + '_' + payload.cedula) : payload.cedula;
        }

        const ref = doc(db, "cargos_personal", docId);
        await setDoc(ref, payload, { merge: true });
        
        // Actualizar resumen en el documento del plantel
        if (dea) {
            try {
                const plantelRef = doc(db, "planteles", dea);
                const pSnap = await getDoc(plantelRef);
                if (pSnap.exists()) {
                    const pData = pSnap.data();
                    const resumenLimpio = (pData.personal_resumen || []).filter(item => item.cedula !== payload.cedula);
                    resumenLimpio.push({
                        cedula: payload.cedula,
                        nombre: payload.nombres,
                        cargo: payload.cargo
                    });
                    await updateDoc(plantelRef, { personal_resumen: resumenLimpio });
                }
            } catch(e) {
                console.warn("Aviso actualizando personal_resumen en plantel:", e);
            }
        }

        showToast(isEditing ? "¡Empleado actualizado exitosamente!" : "¡Empleado guardado exitosamente!", "success");
        limpiarFormularioPersonal();
        if (dea) cargarPersonalExistente(dea);

        // Desplazamiento inteligente diferenciado:
        // AL ACTUALIZAR -> Va a 'Personal Registrado en el Plantel' (con cursor en el buscador)
        // AL GUARDAR (Nuevo) -> Va a 'Registro de Personal' (con cursor en la Cédula listo para el siguiente)
        const headerOffset = 95; // Margen para el header sticky
        if (isEditing) {
            const seccionTabla = document.getElementById('seccion-personal-existente');
            if (seccionTabla) {
                setTimeout(() => {
                    const elementPosition = seccionTabla.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    const buscador = document.getElementById('buscador-personal');
                    if (buscador) {
                        buscador.focus({ preventScroll: true });
                    }
                }, 100);
            }
        } else {
            const seccionRegistro = document.getElementById('seccion-registro-personal');
            if (seccionRegistro) {
                setTimeout(() => {
                    const elementPosition = seccionRegistro.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    const inpCedula = document.getElementById('wp-cedula');
                    if (inpCedula) {
                        inpCedula.focus({ preventScroll: true });
                    }
                }, 100);
            }
        }

    } catch (error) {
        console.error("Error guardando empleado:", error);
        showAlert("Error", "Ocurrió un error al guardar el empleado: " + error.message, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = isEditing ? "ACTUALIZAR EMPLEADO" : "Guardar Empleado";
        }
    }
}

async function cargarPersonalExistente(codigoDEA) {
    const tbody = document.getElementById('tbody-personal-existente');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">Cargando personal...</td></tr>';
    
    try {
        const dbInstance = getFirestore();
        const q = query(collection(dbInstance, 'cargos_personal'), where('codigo-plantel', '==', codigoDEA));
        const querySnapshot = await getDocs(q);
        
        tbody.innerHTML = ''; 
        
        if (querySnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">No hay personal registrado en este plantel.</td></tr>';
            return;
        }

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #e2e8f0';
            
            const tdCed = document.createElement('td');
            tdCed.style.padding = '12px';
            tdCed.textContent = data['cedula-identidad'] || data.cedula || 'N/A';
            
            const tdNom = document.createElement('td');
            tdNom.style.padding = '12px';
            tdNom.textContent = (data['nombre-apellido'] || data['apellidos-nombres'] || data.nombre || data.nombres || 'N/A').toUpperCase();
            
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
                    <button class="btn-editar" style="${btnEditStyle}" onmouseover="this.style.background='#dbeafe';" onmouseout="this.style.background='#eff6ff';" title="Editar datos del funcionario">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8z"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="btn-eliminar" style="${btnDelStyle}" onmouseover="this.style.background='#fee2e2';" onmouseout="this.style.background='#fef2f2';" title="Desincorporar funcionario">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            `;
            
            // Conectar eventos click
            const btnEditar = tdAcc.querySelector('.btn-editar');
            if (btnEditar) {
                btnEditar.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    cargarEmpleadoEnFormulario(data, docId);
                };
            }

            const btnEliminar = tdAcc.querySelector('.btn-eliminar');
            if (btnEliminar) {
                btnEliminar.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    mostrarModalEliminarPersonal(data, docId, codigoDEA);
                };
            }

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

// Búsqueda en tiempo real en la tabla
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

    poblarCatalogosGenerales();
    initCascadaPersonal();
});

// Helpers de validación y cálculo en UI
window.validarCedulaUI = function() {
    const nac = document.getElementById('wp-nacionalidad')?.value;
    const cedInp = document.getElementById('wp-cedula');
    if (!cedInp) return;
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
    const fecha = document.getElementById('wp-nacimiento')?.value;
    if (!fecha) return;
    const nacimiento = new Date(fecha);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    const el = document.getElementById('wp-edad');
    if (el) el.value = edad > 0 ? edad : 0;
};

window.calcularAntiguedadUI = function() {
    const fecha = document.getElementById('wp-fecha-ingreso')?.value;
    if (!fecha) return;
    const ingreso = new Date(fecha);
    const hoy = new Date();
    let ant = hoy.getFullYear() - ingreso.getFullYear();
    const m = hoy.getMonth() - ingreso.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < ingreso.getDate())) ant--;
    const el = document.getElementById('wp-antiguedad');
    if (el) el.value = ant > 0 ? ant : 0;
};

window.toggleMatriculaUI = function() {
    const atiende = document.getElementById('wp-atiende-matricula')?.value;
    const cnivel = document.getElementById('container-nivel-modalidad');
    const cesp = document.getElementById('container-especialidad');
    const ccuad = document.getElementById('container-btn-cuadratura');

    if (atiende === 'SI') {
        if (cnivel) cnivel.style.display = 'block';
        if (cesp) cesp.style.display = 'block';
        if (ccuad) ccuad.style.display = 'block';
    } else {
        if (cnivel) cnivel.style.display = 'none';
        if (cesp) cesp.style.display = 'none';
        if (ccuad) ccuad.style.display = 'none';
        const inNivel = document.getElementById('wp-nivel-modalidad');
        if (inNivel) inNivel.value = '';
        const inEsp = document.getElementById('wp-especialidad-imparte');
        if (inEsp) inEsp.value = '';
    }
};

// Asignaciones globales a window
window.mostrarFormularioPersonal = mostrarFormularioPersonal;
window.cerrarFormularioPersonal = cerrarFormularioPersonal;
window.limpiarFormularioPersonal = limpiarFormularioPersonal;
window.calcularEdadWizard = calcularEdadWizard;
window.calcularAntiguedadWizard = calcularAntiguedadWizard;
window.validarFormularioPersonal = validarFormularioPersonal;
window.guardarPersonalInline = guardarPersonalInline;
window.poblarCatalogosGenerales = poblarCatalogosGenerales;
window.initCascadaPersonal = initCascadaPersonal;
window.cargarEmpleadoEnFormulario = cargarEmpleadoEnFormulario;
window.mostrarModalEliminarPersonal = mostrarModalEliminarPersonal;

poblarCatalogosGenerales();
initCascadaPersonal();
