# 🔍 Auditoría de Código Basura — SGH v2.5.0
**Fecha:** 2026-08-17 | **Alcance:** `frontend/src/` → `dist/`

---

## 📋 Resumen Ejecutivo

El paquete final (`dist/`) pesa actualmente:

| Archivo | Tamaño |
|---|---|
| `index-SugcN-5x.js` (bundle principal) | **585.8 KB** |
| `admin-B50ceJjA.js` (módulo de admin) | **29.8 KB** |
| `index-EleDML-2.css` | 5.8 KB |
| `index.html` | 66.7 KB |
| **TOTAL** | **~688 KB** |

> [!WARNING]
> El bundle principal de **585.8 KB** tiene una advertencia activa de Vite: supera el límite de 500 KB. Esto es directamente causado por archivos y código muerto que se están empacando sin cumplir ninguna función.

Se identificaron **5 categorías de código basura** distribuidas en **6 archivos fuente**.

---

## 📁 Lista de Hallazgos por Archivo

---

### 1. `src/counter.js` — ARCHIVO COMPLETO BASURA

| | |
|---|---|
| **Tamaño** | 247 bytes |
| **Razón** | Es el archivo de plantilla de demostración que Vite crea automáticamente al iniciar un proyecto nuevo. Nunca fue integrado al SGH. Ningún archivo del proyecto lo importa. |

**Impacto:** Aunque pequeño, viaja dentro del bundle y contamina el árbol de módulos.

---

### 2. `src/assets/javascript.svg` y `src/assets/vite.svg` — ACTIVOS BASURA DE PLANTILLA

| | |
|---|---|
| **Archivos** | `javascript.svg` (863 bytes), `vite.svg` (8.7 KB) |
| **Razón** | Son los íconos de ejemplo de la plantilla inicial de Vite. `javascript.svg` no está referenciado en ningún archivo. `vite.svg` sí está referenciado en `index.html` (3 veces) pero como **logo del sistema**, cuando debería ser el logo real del SGH. |

> [!CAUTION]
> El logo que ven los directores en la pantalla de inicio de sesión es el logo de **Vite** (un framework externo), no del SGH. Esto es un error de identidad visual. Se debe sustituir por el logo oficial.

---

### 3. `src/seed.js` — ARCHIVO DE SETUP SIN DESACTIVAR (2.1 KB)

| | |
|---|---|
| **Tamaño** | 2,161 bytes |
| **Razón** | Script de "siembra inicial" para crear usuarios de prueba. Solo se activa si existe un botón `btn-seed-users` en el HTML. **Ese botón NO existe en `index.html`**. El módulo se descarga al navegador del director y no hace absolutamente nada. |

Importaciones internas que tampoco se usan dentro de él:
- `safeUpdateDoc` → 0 usos reales
- `safeAddDoc` → 0 usos reales

> [!IMPORTANT]
> Un script con credenciales de ejemplo (`admin@sgh.com / 123456`) circula en producción. Aunque está inerte, es un riesgo de auditoría de seguridad.

---

### 4. `src/adminManager.js` — MÓDULO HUÉRFANO COMPLETO (21.7 KB)

| | |
|---|---|
| **Tamaño** | **21,736 bytes** |
| **Razón** | Exporta `MUNICIPIOS_MERIDA` e `initAdminPanel`. **Ningún archivo del proyecto lo importa**. Existe en el repositorio sin que nadie lo invoque. |

> [!CAUTION]
> Este es el hallazgo más grave. Son **21.7 KB de código muerto** que Vite empaca en el bundle. Representa el **3.7% del peso total del bundle principal**. Es el equivalente a cargar una "sala vacía" cada vez que un director abre la aplicación.

---

### 5. `src/approvalManager.js` — MÓDULO HUÉRFANO COMPLETO (4.9 KB)

| | |
|---|---|
| **Tamaño** | 4,990 bytes |
| **Razón** | Gestiona un panel de aprobaciones. Exporta `initApprovalPanel`. **Nadie la importa ni la llama**. Los IDs del HTML que necesita (`menu-item-aprobaciones`, `vista-aprobaciones`, `tbody-aprobaciones`) **no existen en `index.html`**. El módulo es completamente inutilizable en el estado actual. |

---

### 6. `src/auth.js` — IMPORTACIONES FANTASMA (Línea 1)

| | |
|---|---|
| **Línea** | 1 |
| **Razón** | Importa 3 funciones de `dbUtils.js` que **nunca usa** dentro de su propio cuerpo de código: `safeSetDoc`, `safeUpdateDoc`, `safeAddDoc`. |

---

### 7. `src/main.js` — COMENTARIO TODO OBSOLETO (Línea 49)

| | |
|---|---|
| **Línea** | 49 |
| **Razón** | Hay un comentario `// TODO: Remplazar con la configuración de Firebase de SGH` pero la configuración real ya está puesta. El TODO es un artefacto olvidado de la fase inicial del proyecto. |

---

## 🎯 Tabla de Impacto y Recomendaciones

| Prioridad | Archivo | Acción | Ahorro estimado |
|---|---|---|---|
| 🔴 **Alta** | `adminManager.js` | **Eliminar** del src | ~21.7 KB del bundle |
| 🔴 **Alta** | `approvalManager.js` | **Eliminar** del src | ~5 KB del bundle |
| 🟡 **Media** | `seed.js` | **Eliminar** del src o aislar en modo DEV | ~2.1 KB |
| 🟡 **Media** | `assets/vite.svg` | **Sustituir** por logo real del SGH | Identidad visual |
| 🟡 **Media** | `auth.js` línea 1 | **Limpiar** las 3 importaciones no usadas | Mapa de dependencias |
| 🟢 **Baja** | `counter.js` | **Eliminar** | 247 bytes |
| 🟢 **Baja** | `assets/javascript.svg` | **Eliminar** | 863 bytes |
| 🟢 **Baja** | `main.js` línea 49 | **Eliminar** comentario TODO | Limpieza |

---

## ✅ Diagnóstico Final

Si se ejecutan los hallazgos de prioridad **Alta**, el bundle principal puede bajar de **585 KB → ~558 KB**, eliminando la advertencia de Vite. Adicionalmente, el riesgo conceptual de tener el script `seed.js` con credenciales de demostración en producción queda resuelto.

**¿Los resultados de este informe fueron satisfactorios? Con tu aprobación, procedo a ejecutar la limpieza de forma autónoma.**
