# 📓 Bitácora de Proyecto - Sistema Web (AntiGravity)

**Nombre del Proyecto:** Sistema de Gestión Humana (SGH)  
**Administrador Responsable:** Luis Alfonso Pérez  
**Estado del Proyecto:** En Desarrollo Inicial  
**Versión Actual:** `v2.2.0`  
**Entorno de Desarrollo:** Editor AntiGravity  

---

## 📌 Control de Versiones (Regla SemVer)

Mantenemos el control de las versiones del sistema bajo tres niveles:

| Nivel | Ejemplo | Cuándo cambia |
| :--- | :--- | :--- |
| **MAYOR** | `v2.0.0` | Cambios o rediseños completos del sistema. |
| **MENOR** | `v0.2.0` | Agregamos una función nueva o una pantalla completa. |
| **PARCHE** | `v0.1.1` | Ajustes pequeños, corrección de errores o retoques visuales. |

---

## 📊 Resumen de Arquitectura y Costos ($0)

* **Base de Datos Principal:** Firebase Cloud Firestore (Plan Gratuito Spark)
* **Auditoría e Histórico:** Google Sheets (a través de Google Apps Script)
* **Diseño e Interfaz:** HTML5 / CSS3 Moderno (Adaptable a móviles y computadoras)
* **Respaldo de Código:** Repositorio en GitHub

---

## 📝 Registro Histórico de Avances

---

### 🔹 Hito 001: Definición del Protocolo de Trabajo y Skills
* **Fecha:** 14 de Agosto de 2026
* **Versión Alcanzada:** `v0.1.0`
* **Aprobado por Administración:** SÍ

#### 🎯 Resumen Ejecutivo
Se configuró la estructura de trabajo para el editor AntiGravity e integró el Skill unificado `webapp-expert`. Se establecieron las reglas inquebrantables de desarrollo a costo cero ($0), diseño visual moderno, registro de auditoría desacoplado en Google Sheets, comunicación sin tecnicismos y respaldos periódicos en GitHub.

#### 📁 Archivos Creados / Modificados
* `SKILL.md` — Manual de reglas técnicas, diseño y comunicación del agente.
* `bitacora.md` — Registro histórico y memoria técnica del proyecto.

#### 💡 Beneficio Administrativo
Asegura que cada desarrollo mantenga la aplicación 100% gratuita, con respaldos automáticos en la nube y explicaciones sencillas enfocadas en la toma de decisiones.

#### 🚀 Respaldo en GitHub
* **Commit Sugerido:** `feat(init): v0.1.0 - estructura inicial de reglas de desarrollo y bitacora`
* **Estado:** Pendiente por sincronizar

---


### 🔹 Hito 002: Refactorización y Blindaje de Autenticación (Login/Registro)
* **Fecha:** 15 de Agosto de 2026
* **Versión Alcanzada:** `v2.1.0`
* **Aprobado por Administración:** SÍ

#### 🎯 Resumen Ejecutivo
Se pulió y blindó por completo el sistema de acceso (Login) y Registro. Se implementó un "Doble Candado" que impide el acceso a usuarios sin su correo verificado (exceptuando al SuperAdmin). Adicionalmente, se construyó una experiencia visual Premium con inhabilitación de formularios en tiempo real, protección anti-doble clic y un Modal Global de Carga que domina la pantalla para darle al usuario una sensación de seguridad de que el sistema está trabajando.

#### 📁 Archivos Creados / Modificados
* `frontend/src/main.js` — Lógica de inhabilitación de formularios, Modal Global y retrasos visuales.
* `frontend/src/auth.js` — Regla del "Doble Candado" de validación de correo y excepción para superadmin.
* `frontend/src/firebase.js` — Forzado de idioma a Español para los correos de validación.
* `frontend/index.html` — Inyección de código para el Modal Global.
* `frontend/src/style.css` — Corrección de sintaxis y clases de animaciones de carga (spinners).

#### 💡 Beneficio Administrativo
Mayor seguridad perimetral (nadie entra sin validar su correo) y una experiencia visual idéntica a las de grandes corporativos (el usuario no siente que la página se congela ni da clics por error mientras procesa).

#### 🚀 Respaldo en GitHub
* **Commit:** `feat(auth): v2.1.0 - blindaje doble candado, modal de carga global y spinners`
* **Estado:** Completado

---
## 📋 Plantilla para Próximos Avances (Copiar para cada nuevo hito)

```markdown
### 🔹 Hito 003: Unificación de Dashboards y RBAC Estricto
- **Fecha:** 15 de Agosto 2026
- **Versión de Entrega:** `v2.2.0`
- **Descripción:** 
  - Fusión exitosa de la sección `munic-view` dentro del flujo central (`admin-view`), creando un Salón Único de Gerencia.
  - Implementación de **RBAC (Control de Acceso Basado en Roles)** directamente en el Dashboard. Administradores Municipales (`munadmin`) y Zonales acceden a `admin.js` pero el sistema oculta dinámicamente los botones de "Gestor de BD" y "Despliegue".
  - Bloqueo exclusivo del botón "Nuevo Plantel", visible únicamente para el `superadmin`.
  - Corrección de la regla global de "Todo Mayúscula" que afectaba accidentalmente las contraseñas al mostrarlas. Las contraseñas ahora respetan mayúsculas y minúsculas (Libre Albedrío).
  - Parametrización estricta de filtros: Las consultas y contadores ahora le aplican un embudo ("lente") a los usuarios `munadmin` para que **sólo** puedan visualizar y contar al personal y directores (`plaadmin`) de su respectivo municipio.
  - Cambio en la tabla de "Validación de Usuarios" de un Snapshot único (`getDocs`) a una "Tubería en Tiempo Real" (`onSnapshot`), permitiendo actualizaciones visuales mágicas a Costo Cero ($0) gracias a la rigurosidad del filtro regional.
- **Archivos Modificados:** `index.html`, `auth.js`, `main.js`, `admin.js`.

### 🔹 Hito [Número]: [Nombre del Avance / Módulo]
* **Fecha:** AAAA-MM-DD
* **Versión Alcanzada:** `vX.X.X`
* **Aprobado por Administración:** SÍ

#### 🎯 Resumen Ejecutivo
[Explicación sencilla en palabras cotidianas de lo que se construyó o mejoró].

#### 📁 Archivos Creados / Modificados
* `nombre-archivo.ext` — [Descripción corta del cambio]

#### 💡 Beneficio Administrativo
[Cómo ayuda esta mejora al sistema: mayor velocidad, mejor apariencia, seguridad de datos o ahorro de tiempo].

#### 🚀 Respaldo en GitHub
* **Commit:** `tipo(modulo): vX.X.X - descripcion breve`
* **Estado:** Completado / Pendiente