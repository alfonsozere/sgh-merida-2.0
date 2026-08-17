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
