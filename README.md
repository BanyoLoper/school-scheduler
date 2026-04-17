# School Schedule

Sistema web para la gestión de horarios y salones de una escuela tecnológica. Permite a los coordinadores de carrera organizar la asignación de aulas, laboratorios y profesores por semestre.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5 + CSS3 + Vanilla JS (ES Modules) |
| Hosting | Cloudflare Pages |
| API | Cloudflare Workers (plan gratuito) |
| Base de datos | Cloudflare D1 (SQLite) |
| Autenticación | Cloudflare Zero Trust (Access) |

## Funcionalidades

### Para coordinadores (acceso restringido)

**Salones**
- Registrar salones teóricos y laboratorios con capacidad y equipamiento
- Marcar salones como bloqueados (no disponibles para asignación)
- Ver qué software está instalado en cada laboratorio y en cuántos equipos

**Materias y grupos**
- Definir materias por semestre con su número de grupos y alumnos por grupo
- Indicar si una materia requiere laboratorio o aula teórica
- Asignar software requerido por materia (bloqueante para el algoritmo)
- Marcar grupos como "prioritarios" para que el algoritmo los asigne primero

**Horario**
- Visualizar el horario semanal en una grilla Día × Hora
- Mover asignaciones arrastrando bloques (drag & drop)
- Al mover un bloque, el sistema detecta conflictos antes de confirmar (salón ocupado, profesor con doble asignación)
- Ejecutar el algoritmo automático que genera una propuesta de horario completa
- Confirmar o ajustar la propuesta antes de guardarla

**Algoritmo de scheduling**
- Asigna primero los grupos prioritarios
- Filtra laboratorios según el software requerido por cada materia
- Elige el salón con la capacidad más ajustada al grupo (best-fit)
- Muestra advertencia si un laboratorio tiene reportes de falla abiertos

**Negociaciones**
- Solicitar intercambio de salones con coordinadores de otras carreras
- Aceptar o rechazar solicitudes entrantes mediante modal de confirmación

**Inventario de laboratorios**
- Ver y editar el software instalado en cada lab con versión y cantidad de equipos
- Categorías: diseño, desarrollo, ciberseguridad, redes
- Los labs de ciberseguridad se registran sin software (máquinas limpias para pentesting/CTF)

### Para docentes y alumnos (acceso público, sin cuenta)

**Disponibilidad docente** — `/availability.html`
- Los profesores registran los días y franjas horarias en que pueden impartir clase

**Reporte de fallas** — `/reports.html`
- Reportar equipos con problemas indicando el lab, número de PC y descripción
- Los coordinadores ven los reportes en el dashboard y los marcan como resueltos

## Estructura del proyecto

```
school-schedule/
├── index.html               # Redirect a dashboard (Zero Trust maneja el acceso)
├── dashboard.html           # Panel principal con estadísticas y alertas
├── rooms.html               # Gestión de salones
├── subjects.html            # Gestión de materias y grupos
├── schedule.html            # Constructor de horario con drag & drop
├── negotiations.html        # Intercambio de salones entre coordinadores
├── lab-inventory.html       # Inventario de software por laboratorio
├── availability.html        # Disponibilidad docente (público)
├── reports.html             # Reporte de fallas de equipo (público)
├── assets/
│   ├── css/                 # main.css, schedule.css, components.css
│   └── js/
│       ├── core/            # api.js, auth.js, router.js
│       ├── modules/         # Un módulo por dominio de negocio
│       ├── components/      # modal, drag-drop, schedule-grid, conflict-checker
│       └── utils/           # constants, helpers, software-categories
├── workers/
│   ├── api/                 # Cloudflare Worker — handlers REST por dominio
│   └── scheduler/           # Algoritmo de scheduling (priority-first + best-fit)
├── schema.sql               # DDL completo de la base de datos D1
└── wrangler.toml            # Configuración Cloudflare Workers
```

## Despliegue

### Requisitos
- Cuenta Cloudflare con Workers, Pages y D1 habilitados
- Node.js 18+ y Wrangler CLI (`npm install -g wrangler`)

### Base de datos

```bash
npx wrangler d1 create school-schedule-db
# Copiar el database_id generado a wrangler.toml

npx wrangler d1 execute school-schedule-db --file=schema.sql
```

### Worker API

```bash
npx wrangler deploy
```

### Frontend (Cloudflare Pages)

Conectar el repositorio en **Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git**.

- Build command: *(vacío)*
- Build output directory: `/`

### Variables de entorno del Worker

En el dashboard del Worker → Settings → Variables:

| Variable | Valor |
|----------|-------|
| `ALLOWED_ORIGIN` | `https://tu-proyecto.pages.dev` |

### Autenticación

Configurar en **Cloudflare Zero Trust → Access → Applications**:

1. Aplicación protegida sobre `tu-proyecto.pages.dev` con política de email/dominio
2. Reglas de Bypass para rutas públicas: `/availability.html`, `/reports.html`

## Desarrollo local

```bash
# Base de datos local
npx wrangler d1 execute DB --local --file=schema.sql

# Worker (terminal 1)
npx wrangler dev --local

# Frontend (terminal 2)
npx serve . --port 3000
```

Cambiar `API_BASE` en `assets/js/utils/constants.js` a `http://localhost:8787/api` para desarrollo local.
