## [v2.3.5] - 2026-08-16
### Fixed
- **UI Render Regression (Planes 20000 & 21000)**: Restored the missing \cont-dinamico-maternal\, \cont-dinamico-preescolar\, and \cont-dinamico-primaria\ DOM containers in \index.html\.
- Re-attached the missing \data-plan\, \data-tipo\, and \sec-master-input\ classes to the static \secMat\, \secPre\, and \secPri\ inputs so that the JavaScript listener correctly triggers the \_renderCajasInicial\ and \_renderCajasPrimaria\ functions when section counts are entered.

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
* **Estado:** Completado / Pendiente\n\n### v2.2.1 - 2026-08-16\n* **Corrección UI (Anti-FOUC):** Se inyectó un pp-loader Premium en index.html para ocultar la pantalla mientras Firebase resuelve la sesión, eliminando el parpadeo amateur (Flash of Unstyled Content) de la vista de espera.\n* **Archivos Modificados:** index.html, src/main.js, package.json.

### v2.2.2 - 2026-08-16
* **Corrección (Hotfix):** Se restauró la función `window.hideLoading()` dentro de `showView()` en `main.js`, la cual fue eliminada accidentalmente durante la implementación del Loader Premium, causando que la pantalla de "Autenticando" se quedara congelada tras un inicio de sesión exitoso.
* **Archivos Modificados:** `src/main.js`, `index.html`, `package.json`.

### v2.2.3 - 2026-08-16
* **Corrección Crítica (Hotfix 2):** Se solucionó un error de sintaxis introducido en el parche anterior (`\n` literal) que bloqueaba la carga completa de `main.js`, causando que la pantalla "INICIALIZANDO ENTORNO SEGURO" se quedara colgada infinitamente.
* **Archivos Modificados:** `src/main.js`, `index.html`, `package.json`.

### v2.2.4 - 2026-08-16
* **UI/UX Enhancement:** Se unificó el estilo visual de todas las pantallas de carga. Ahora el modal intermedio de "Cargando/Autenticando" utiliza exactamente el mismo estilo Premium (modo oscuro, ruleta azul fluida) que el Preloader inicial. Además, el texto del Preloader se ajustó a "ACTUALIZANDO ENTORNO SEGURO...".
* **Archivos Modificados:** `index.html`, `src/main.js`, `package.json`.

### v2.2.5 - 2026-08-16
* **UI/UX Enhancement:** Se eliminó la importación de fuentes externas (Google Fonts: Inter, Outfit) y se migró todo el proyecto para utilizar la fuente nativa del sistema operativo (`system-ui`), homologando la tipografía de toda la aplicación web con la estética impecable del Loader Premium y mejorando el rendimiento de carga.
* **Archivos Modificados:** `src/style.css`, `index.html`, `package.json`.

### v2.2.6 - 2026-08-16
* **Corrección (Hotfix):** Se reparó un error de CSS que bloqueaba el desplazamiento vertical (*scroll*) de la aplicación. La regla `overflow: hidden` del Preloader inicial se había quedado fijada en la hoja de estilos global, impidiendo hacer scroll en el Dashboard al desbordarse el contenido. Se movió a un estilo en línea temporal para que JavaScript pueda liberarlo correctamente.
* **Archivos Modificados:** `index.html`, `package.json`.

### v2.2.7 - 2026-08-16
* **Corrección Crítica (Hotfix):** Se solucionó un error de sintaxis en la primera línea de `style.css` que fue introducido accidentalmente durante la limpieza de fuentes externas. Este error causaba que el navegador ignorara por completo la hoja de estilos, rompiendo todas las variables de color (bordes invisibles, botones blancos sobre fondo blanco) y revirtiendo la tipografía a la fuente por defecto del navegador (descartando `system-ui`).
* **Archivos Modificados:** `style.css`, `package.json`, `index.html`.

### v2.2.8 - 2026-08-16
* **Mejora UI - Fuente Global Definitiva:** Se aplicó `system-ui, sans-serif` como tipografía oficial de todo el proyecto de forma arquitectónicamente correcta. Se declaró la variable `--font-main` en `:root`, se configuró `font-family: inherit` en el selector universal `*`, y se eliminaron todas las declaraciones de fuente redundantes en `h1/h2/h3`, `input`, `button` y `.nav-brand`. Ahora 100% del texto visible hereda la misma fuente nativa premium del sistema operativo.
* **Archivos Modificados:** `src/style.css`, `index.html`, `package.json`.

### v2.2.9 - 2026-08-16
* **Corrección Fuente Global Completa:** Se eliminaron 4 declaraciones de `font-family: monospace` encontradas en estilos en línea dentro de `admin.js` (líneas 519, 786, 1068) y `adminManager.js` (líneas 129, 439). Estas etiquetas JS de tipo "badge/código" tenían fuente propia que ignoraba la herencia global CSS. Ahora 100% del proyecto usa `system-ui`.
* **Archivos Modificados:** `src/admin.js`, `src/adminManager.js`, `index.html`, `package.json`.

### v2.3.0 - 2026-08-16
* **Refactorización UI Director:** Se eliminaron elementos visuales innecesarios en la pantalla de carga de matrícula (vista del director): "Paso 1 de 2" en el header, y el encabezado "Paso 1: Información del Plantel - Verifique y complete la matrícula institucional" junto con el logo (`vite.svg`).
* **Archivos Modificados:** `index.html`, `package.json`.

### v2.3.1 - 2026-08-16
* **Refactorización UI Director (Tarjeta Plantel):** Se reconstruyó el formulario de visualización de datos usando CSS Grid avanzado para alojar y mapear con precisión los 13 campos clave de la base de datos `planteles` (Municipio, Parroquia, Dependencia, Código DEA, Cód Estadístico, Cód Dependencia, Denominación, Nombre Nominal, Nuevo Epónimo, Niveles-Modalidades, Turnos, Ubicación y Matrícula).
* **Archivos Modificados:** `index.html`, `src/main.js`, `package.json`.

### v2.3.2 - 2026-08-16
* **UI Responsive Grid & Fixes:** Se inyectaron clases CSS (`.form-grid-row`) y Media Queries en `style.css` para evitar el desbordamiento de columnas en dispositivos móviles (pantallas < 768px). Se renombró la etiqueta "Cód. DEA" a "CÓDIGO PLANTEL" y se unificó el campo de Ubicación Geográfica como un `input` estándar (antes `textarea`).
* **Archivos Modificados:** `index.html`, `src/style.css`, `package.json`.

### v2.3.3 - 2026-08-16
* **Ajuste UI de Matrícula Total:** Se reposicionó el campo "Matrícula Total" para que quede justo debajo de "Ubicación Geográfica" conforme al requerimiento visual.
* **Archivos Modificados:** `index.html`, `src/style.css`, `package.json`.## [v1.4.0] - 2026-08-16
### Agregado
- **Motor de Vacantes (Plazas Docentes):** Integración de lógica dinámica en el guardado de Firebase para copiar los valores exactos de la matrícula (FEM/MAS) hacia el nodo de vacantes cuando el director marca el checkbox, facilitando reportes de déficit docente.
- **Escoba Digital (Zero-Waste):** Implementación de una función recursiva de barrido en _construirPayloadMatricula que elimina automáticamente cualquier campo con valor   y cualquier objeto vacío {} en toda la estructura de matrícula antes de guardarla en Firestore, optimizando masivamente el consumo de datos.

### v2.3.4 - 2026-08-16
* **Resolución Crítica - Flujo de Guardado y UI:** Se reparó un ReferenceError de variables dinámicas no declaradas (_dynMG, _dynMT) que congelaba el botón "Guardando...".
* **Modal de Confirmación Incompleta:** Se construyó e inyectó físicamente la interfaz Glassmorphism del modal (modal-confirm-incompleta) en index.html que había sido omitida, permitiendo la declaración de matrículas en cero.
* **Limpieza Absoluta (Zero-Waste):** Se corrigió la función sweepZeros en main.js removiendo listas blancas ficticias. Ahora garantiza una limpieza profunda y absoluta de llaves en cero y objetos vacíos antes de enviar a Firestore.
* **Archivos Modificados:** index.html, src/main.js, package.json.


### v2.4.0 - 2026-08-17
* **Refactorizacion Motor de Guardado (onsubmit):** Reescritura completa y limpia del handler orm.onsubmit en main.js (bloque de 361 lineas). Se elimino codigo basura acumulado de versiones anteriores y se implemento el esquema JSON oficial de inyeccion de datos.
  - **Secciones-Planes dinamicas:** 20000 ahora anida maternal y preescolar por separado. 21000 almacena la cantidad de grados que tienen cada letra de seccion (U, A, B, C...).
  - **Matricula por seccion:** Cada registro {mas, fem} se inyecta bajo su letra de seccion correcta dentro del grado/nivel correspondiente.
  - **Vacantes integradas:** Se copiancorrecta y automaticamente los valores {mas, fem} de cada seccion marcada con check hacia el sub-nodo acantes del grado o nivel.
  - **Helper isVisible():** Funcion centralizada que verifica visibilidad DOM en bloques [id^="bloque-"], eliminando logica duplicada.
  - **Helper sweepZeros (Escoba Digital):** Barre recursivamente todo objeto antes de enviarlo a Firestore, eliminando claves con valor 0 y objetos vacios.
  - **Totales automaticos:** Se calculan y almacenan totales por nivel (maternal, preescolar, grado, plan de media) y gran total.
  - **Codigos de plan dinamicos:** Se eliminaron codigos de plan hardcodeados; ahora se leen dinamicamente desde los atributos data-plan del DOM.
* **Archivos Modificados:** src/main.js, package.json.

### v2.4.2 - 2026-08-17
* **Arquitectura de Datos (Matricula):** Refactorizacion del esquema JSON para la entidad matricula.
  - Se introdujo un nodo global raiz para calculos totales independientes de la rama basica o media (\	otal-gen-fem\, \	otal-gen-mas\, \	otal-gen\, \	otal-vac-gen-fem\, \	otal-vac-gen-mas\, \	otal-vac-gen\).
  - Se definio por adelantado el objeto vacio \modalidades: { adulto: {}, especial: {} }\ como base para futuras incorporaciones en el sistema.
  - **Escoba Digital (Whitelisting):** Se reprogramo el metodo de limpieza de ceros (\sweepZeros\) para incluir una lista blanca obligatoria que proteja las ramas principales (\asica\, \media\, \modalidades\) y todos los campos globales, asegurando que su estructura base persista en Firestore aunque sus valores sean momentaneamente cero.
  - **Suscripcion UI:** El campo visual "Matricula Total" (id: \inp-matricula-total\) ahora consume directamente la informacion confirmada de la nube desde \matricula['total-gen']\.
* **Archivos Modificados:** \src/main.js\, \package.json\.

### v2.4.3 - 2026-08-17
* **Correccion (Motor Reactivo):** Se corrigio un bug que impedia que la interfaz se actualizara en tiempo real al hacer clic en "Guardar".
  - **Reinicio de Suscripciones:** Se modifico la funcion \checkPlantelData\ para desconectar explicitamente el \onSnapshot\ anterior (\window._unsubPlantel()\) antes de escuchar un nuevo documento. Esto garantiza que la reactividad siga a la escuela actual si el usuario navega entre diferentes codigos DEA.
  - **Eliminacion de Colision Optimista:** Se elimino la instruccion estatica que intentaba actualizar el input con un calculo local antiguo inmediatamente despues del guardado, lo que generaba un conflicto ("carrera") que ocultaba la inyeccion real del \onSnapshot\.
* **Archivos Modificados:** \src/main.js\, \package.json\.

### v2.4.4 - 2026-08-17
* **Correccion (Extraccion de Datos):** Se solvento un fallo critico que impedia el guardado de la informacion correspondiente al nivel de **Primaria** en el sistema.
  - **Diagnostico:** Una expresion regular (Regex) utilizada para decodificar las cajas de texto de Primaria sufrio una corrupcion de caracteres (\(d)\ en lugar de \(\d)\), provocando que el algoritmo no reconociera el formato numérico del grado y, por lo tanto, ignorara por completo los datos cargados en pantalla para este nivel.
  - **Resolucion:** Se restauro la expresion regular en los dos modulos extractores de \main.js\. Al presionar Guardar, los datos de los grados de 1ro a 6to ahora se procesan y serializan correctamente dentro del JSON bajo la llave \matricula.basica['21000']\.
* **Archivos Modificados:** \src/main.js\, \package.json\.

### v2.4.5 - 2026-08-17
* **Correccion (Motor de Guardado):** Se resolvio una excepcion de Javascript (\TypeError: Cannot read properties of undefined\) que provocaba que el proceso de guardado quedara bloqueado indefinidamente.
  - **Causa:** El selector general (\.mat-input.mat-primaria\) estaba capturando por accidente unas cajas de texto estáticas (usadas para resúmenes de interfaz) que no poseían el atributo dinámico \data-grupo\. Al intentar procesar ese atributo inexistente, el algoritmo colapsaba.
  - **Solución:** Se implementó una guardia de seguridad estructural (\if (!inp.dataset.grupo) return;\) que protege al motor de guardado frente a elementos de la interfaz estáticos, aislando exclusivamente los inputs dinámicos de los planes de estudio.
* **Archivos Modificados:** \src/main.js\, \package.json\.

### v2.4.6 - 2026-08-17
* **Mejora Visual (Limpieza de Interfaz):** Se eliminaron las cajas de texto estáticas de resumen para los géneros Femenino y Masculino correspondientes a Maternal (\matFem\, \matMas\) y Preescolar (\preFem\, \preMas\).
  - **Motivo:** Ocupaban espacio visual innecesario en pantalla, dado que la captura real de género se procesa por sección y grado dentro de los bloques dinámicos.
  - **Alcance:** Se retiró el código HTML, se ajustó el sistema de rejilla (CSS Grid) a una sola columna para centrar el cuadro restante (\Sec\) y se purgó la lógica de inicialización residual en JavaScript para prevenir errores de referencia.
* **Archivos Modificados:** \index.html\, \src/main.js\, \package.json\.
