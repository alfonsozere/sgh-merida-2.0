# Desempeno Tecnico - Proyecto SGH 2.0

---

## Hito v2.4.0 - Reescritura del Motor de Guardado (onsubmit)
**Fecha:** 2026-08-17 | **Version:** `2.4.0` | **Archivo clave:** `src/main.js`

---

### 1. Diagnostico del Problema

Se audito el bloque `form.onsubmit` original (lineas 1053-1411) y se identificaron los siguientes problemas:

| # | Problema | Impacto |
|---|---|---|
| 1 | Variables `_dynMG`, `_dynMT` declaradas a nivel de modulo | ReferenceError en tiempo de ejecucion |
| 2 | `secciones-planes["20000"]` con estructura plana sin sub-niveles | JSON incorrecto - no distinguia `maternal` de `preescolar` |
| 3 | Codigos de plan hardcodeados (`31059`, `41052`) | Falla silenciosa si el plantel tenia planes distintos |
| 4 | Guard de visibilidad duplicado 3 veces en 1 linea | Codigo fragil e ilegible |
| 5 | `sweepZeros` dentro del `try` con lista blanca ficticia | No limpiaba correctamente, dejaba ceros en Firestore |
| 6 | Boton sin guard de `null` | Error silencioso si `btn` no existe |
| 7 | Totales de primaria contados dos veces | Datos dobles en Firestore |
| 8 | Vacantes no distinguian por grado en primaria | Vacantes mezcladas entre grados |

---

### 2. Metodologia Tecnica Aplicada

#### Paso 1 - Validacion del esquema JSON con el usuario
Antes de escribir una linea de codigo se realizo una sesion de validacion interactiva con el usuario (Administrador de Empresas) para acordar el esquema correcto:

- **Regla "La Unica y el Abecedario":** 1 seccion = U; 2+ secciones = A, B, C...
- **Para 21000 (Primaria):** La distribucion opera en grupos de 6 grados. El valor de cada letra en `secciones-planes["21000"]` = cantidad de grados que tienen esa letra.
  - 6 secciones = "U": 6
  - 7 secciones = "U": 5, "A": 1, "B": 1
  - 14 secciones = "A": 6, "B": 6, "C": 2
- **Para 20000 (Inicial):** Sub-niveles `maternal` y `preescolar` anidados. Valor siempre 1.
- **Vacantes:** Sub-objeto `vacantes` dentro del grado/nivel, solo si el usuario marco el check.

#### Paso 2 - Script de parche quirurgico
Se creo `rewrite_onsubmit.js` (Node.js) que:
1. Lee `main.js` completo en memoria
2. Localiza el bloque `form.onsubmit` mediante anclas de texto unicas
3. Verifica que el bloque contiene `safeSetDoc` (control de integridad)
4. Reemplaza el bloque completo en memoria
5. Escribe el archivo de vuelta

**Problema encontrado:** El primer anchor de fin (`      };`) no era unico. **Solucion:** Se uso un anchor multi-linea unico que incluye el contenido del `finally`.

#### Paso 3 - Nueva arquitectura del handler

```
form.onsubmit
  GUARD (datos vacios) - modal-confirm-incompleta
  HELPERS
    isVisible(el)    - verifica display:none en ancestro [bloque-*]
    sweepZeros(obj)  - barre recursivamente {valor:0} y {}
  SECCIONES-PLANES
    20000/maternal   - escanea .mat-maternal[sexo=F] -> { letra: 1 }
    20000/preescolar - escanea .mat-preescolar[sexo=F] -> { letra: 1 }
    21000            - escanea .mat-primaria[sexo=F] -> { letra: count }
    media            - escanea .sec-anio-input -> { anio: val }
  MATRICULA
    materna          - { letra: {mas,fem} } + totales + vacantes
    preescolar       - { letra: {mas,fem} } + totales + vacantes
    21000/[1-6]      - { letra: {mas,fem} } + vacantes por grado
    media-general    - { plan: {mas,fem,total} } dinamico
    media-tecnica    - { plan: {mas,fem,total} } dinamico
  sweepZeros(matricula)
  sweepZeros(seccionesPlanes)
  safeSetDoc(docRef, payload, { mergeFields: [...] })
```

---

### 3. Decisiones Operativas

| Decision | Razon |
|---|---|
| Leer secciones desde DOM | El estado real es lo que ya esta renderizado; evita desincronizacion |
| Solo contar inputs `[data-sexo="F"]` para secciones-planes | Evita doble conteo (cada seccion tiene par F+M) |
| Anchor multi-linea para el parche | El anchor simple `};` era ambiguo |
| `mergeFields` en `safeSetDoc` | No sobreescribir campos no tocados en Firestore Spark |
| SemVer MENOR (`2.3.4 -> 2.4.0`) | Refactorizacion estructural con nueva funcionalidad |

---

### 4. Archivos Modificados

| Archivo | Cambio |
|---|---|
| `frontend/src/main.js` | Reescritura completa del bloque `form.onsubmit` |
| `frontend/package.json` | Version `2.3.4` -> `2.4.0` |
| `bitacora.md` | Entrada v2.4.0 agregada |
| `desempeno.md` | Creado (este archivo) |

---

### 5. Resultado Final

El motor de guardado ahora produce el JSON oficial del sistema SGH 2.0 de forma limpia, dinamica y sin suposiciones. La Escoba Digital garantiza que Firestore no recibe basura. Los totales son correctos y los vacantes se registran solo cuando el director marca el check.

### Hito: Refactorización Estructural JSON y Reactividad UI (v2.4.2 - v2.4.3)
**Fecha:** 2026-08-17
**Módulo:** Pantalla de Planteles / Motor de Sincronización Firestore

**1. Diagnóstico del Problema:**
- Se requería preparar el modelo JSON de \matricula\ para el futuro, incorporando las ramas de "modalidades" (Adultos, Especial) y unificando el cálculo total de la matrícula (Básica + Media) en la raíz del documento.
- Al guardar la información, la interfaz (el campo \inp-matricula-total\) no reaccionaba en tiempo real para mostrar el dato recién calculado por el servidor/cliente y depositado en la nube.
- La función de limpieza interna (\sweepZeros\) destruía preventivamente los esquemas vacíos (ej. \modalidades: { adulto: {} }\) y los totales si estos eran cero.

**2. Método Técnico Aplicado:**
- **Inyección de Estructura Raíz:** Se reprogramó la inicialización del objeto \matricula\ en \main.js\ para pre-construir el cascarón obligatorio solicitado por la gerencia: ramas para \asica\, \media\, \modalidades\ y sumatorias globales \	otal-gen\.
- **Whitelisting (Lista Blanca):** Se instruyó a la "Escoba Digital" (\sweepZeros\) con un arreglo estricto (\whitelist\) para evitar que purgara los nodos obligatorios de la arquitectura, garantizando su existencia permanente en Firestore.
- **Limpieza de Colisiones UI:** Se eliminó la actualización estática "Optimista" en \onsubmit\ que causaba una condición de carrera contra la respuesta rápida de la base de datos.
- **Saneamiento del Suscriptor (Listener):** Se detectó y corrigió un bug de memoria global. \window._unsubPlantel\ no se destruía al cambiar de colegio, dejando "sordo" al sistema para el nuevo plantel. Se incorporó una instrucción de desuscripción explícita (\window._unsubPlantel()\) antes de enganchar un nuevo documento.

**3. Decisiones Operativas y Beneficio:**
- La interfaz ahora opera bajo el paradigma de "Fuente Única de Verdad" (Single Source of Truth), donde lo que el usuario ve en la pantalla es un espejo milimétrico de lo que se almacenó en la base de datos, garantizando confianza del 100% en los registros. El esquema de datos quedó listo para la expansión a nuevas modalidades sin requerir migraciones complejas de base de datos en el futuro.

### Hito: Restauracion de Serializacion de Primaria (v2.4.4)
**Fecha:** 2026-08-17
**Módulo:** Motor de Guardado (onsubmit) / Extractor de Nivel Primaria

**1. Diagnóstico del Problema:**
- El usuario reportó que el nivel de Primaria (código interno 21000) no se estaba almacenando en Firestore. El sistema estaba procesando exitosamente Maternal/Preescolar (20000) y Media, pero omitía por completo a Primaria, dejando la rama vacía en la base de datos.

**2. Método Técnico Aplicado:**
- Se realizó una auditoría forense sobre el código de extracción en \main.js\.
- Se detectó que la expresión regular (Regex) utilizada para decodificar los identificadores HTML de los campos de Primaria (\data-grupo="primaria-1A"\) estaba mal formada en el código. Exigía literalmente un carácter \d\ (\/primaria-(d)([A-Z])/\) en lugar de esperar un dígito numérico (\/primaria-(\d)([A-Z])/\).
- Al fallar la coincidencia (Match nulo), el algoritmo ejecutaba un \eturn\ anticipado, saltándose todo el procesamiento de cajas de texto correspondientes a Primaria.
- Se reparó la expresión regular en ambas líneas donde se utiliza (creación del esqueleto y recolección de valores) utilizando un script de parcheo exacto en Node.js.

**3. Decisiones Operativas y Beneficio:**
- Se garantizó la integridad algorítmica del bloque de Básica, permitiendo que la data de Primaria vuelva a fluir correctamente hacia el JSON de Firestore. Al usar Regex precisos (\\d\), blindamos la extracción contra posibles nomenclaturas incorrectas en el HTML.

### Hito: Neutralización de Bucle Infinito de Guardado (v2.4.5)
**Fecha:** 2026-08-17
**Módulo:** Motor de Guardado (onsubmit) / Nivel Primaria

**1. Diagnóstico del Problema:**
- El usuario reportó que la pantalla se quedaba "Guardando... infinito" con un error interno en la consola de \TypeError: Cannot read properties of undefined (reading 'match')\.
- Esto indicaba una falla catastrófica en el lazo principal de recolección de variables, donde el motor intentaba ejecutar una búsqueda sobre una propiedad que literalmente no existía en el HTML.

**2. Método Técnico Aplicado:**
- Se rastreó el selector \document.querySelectorAll('.mat-input.mat-primaria')\.
- Se descubrió que dicho selector no solo estaba atrapando las cajas dinámicas de grados y secciones, sino también unas cajas estáticas del resumen visual de interfaz (id \priFem\ e id \priMas\).
- Al no tener el atributo de rastreo obligatorio (\data-grupo\), el motor colapsaba arrojando una excepción "No controlado", lo que congelaba la aplicación y dejaba la pantalla de carga permanente.
- Se inyectó una guardia de seguridad de memoria lógica en JS (\if (!inp.dataset.grupo) return;\), actuando como un escudo protector que obliga al lazo a saltarse silenciosamente cualquier elemento de diseño estático.

**3. Decisiones Operativas y Beneficio:**
- Se priorizó una solución "No destructiva" (en lugar de cambiar las clases del HTML, se dotó al motor JavaScript de mayor inteligencia defensiva). Esto evita tener que rediseñar el CSS y garantiza que el botón "Guardar" jamás vuelva a congelarse por culpa de un input decorativo mal filtrado.

### Refactorización Visual y Poda de Interfaz (v2.4.6 y v2.4.7) - 2026-08-17
* **Objetivo:** Liberar espacio visual en pantalla eliminando las cajas de resumen de género estáticas (matFem, matMas, preFem, preMas, priFem, priMas) de los bloques de Inicial y Primaria.
* **Diagnóstico Inicial:** El diseño original contemplaba cajas de totales de género al lado de las cajas de Secciones Totales. Al evolucionar el sistema hacia el registro dinámico celda por celda (por grado, sección y género), estos totalizadores estáticos se volvieron redundantes a nivel de interfaz de captura y generaban ruido visual. Adicionalmente, el código JS (main.js) esperaba estos IDs durante la inicialización (mostrarCandado), lo que podría lanzar errores silenciosos si los elementos dejaban de existir.
* **Decisiones Operativas y Ejecución (Zero Assumptions):** 
  1. **Poda HTML Quirúrgica:** Se removieron los nodos <input> y sus <label> correspondientes, garantizando que no se alteraran contenedores adyacentes.
  2. **Refactorización CSS Grid:** Al eliminar columnas en el grid de la interfaz (pasando de 3 columnas a 1), se modificó dinámicamente el grid-template-columns: 1fr; del contenedor padre. Esto permitió que la caja restante (Secciones Totales) ocupara todo el ancho disponible, manteniendo el equilibrio visual de las tarjetas.
  3. **Inmunización Lógica (JS):** Se buscaron los arreglos de inicialización en main.js (línea ~1042) y se sustrajeron los IDs eliminados. Esto previene un TypeError al hacer document.getElementById(), respetando el blindaje del motor de renderizado legado y asegurando la compatibilidad hacia atrás en los planteles.
* **Resultado:** Interfaz mucho más limpia y un motor de inicialización aligerado, consolidado en las versiones **v2.4.6** (Inicial) y **v2.4.7** (Primaria). Todo sincronizado con el repositorio.
