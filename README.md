# Async Queue Service

Sistema de **procesamiento asíncrono de tareas mediante colas** (patrón _Producer–Consumer_). La API recibe trabajos pesados, los **encola** y los procesa en **segundo plano** con workers; el cliente recibe un `jobId` al instante y consulta el estado cuando lo necesite — sin bloquear la request.

<p align="left">
  <img src="https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/BullMQ-Redis_7-DC382D?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Prisma-7-2D3748?logo=prisma&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white" />
</p>

---

## 🧩 El problema que resuelve

Operaciones lentas —enviar emails, generar reportes, importar datos— **no deberían bloquear** la respuesta HTTP ni caerse si el servicio de turno falla. Este backend las **delega a una cola** y las procesa de forma asíncrona, con **reintentos automáticos**, **prioridades**, **programación diferida** y **observabilidad** de principio a fin.

## ✨ Características

- **Producer–Consumer con BullMQ** sobre Redis.
- **Idempotencia**: el `jobId` de la cola es el mismo UUID de la BD.
- **Prioridades** (HIGH / MEDIUM / LOW).
- **Reintentos con backoff exponencial**, configurables por entorno.
- **Delayed jobs**: agenda un job con `scheduledAt` y no corre hasta la hora.
- **Cancelación** de jobs `PENDING` (`DELETE /jobs/:id`).
- **Reintento manual** de jobs `FAILED` (`POST /jobs/:id/retry`).
- **Patrón handler-por-tipo** (`TEST`, `EMAIL`, `REPORT`): agregar un tipo nuevo no toca el worker.
- **Bull Board** protegido con Basic Auth + endpoint de **estadísticas** de la cola.
- **Listado con filtros** (estado, tipo, prioridad, rango de fechas) y **paginación cursor-based**.
- **Cron de mantenimiento** que limpia jobs viejos.
- **Calidad**: config validada con Joi (fail-fast), exception filter global (errores uniformes), logging estructurado con `pino` (correlación por `requestId`), graceful shutdown.
- **Tests**: unitarios (>70% cobertura) + e2e con **Testcontainers** (Postgres + Redis reales efímeros).

## 🏗️ Arquitectura

```
                       ┌──────────────────────────────┐
   POST /jobs          │          API (NestJS)        │
Cliente ───────────────▶  1. persiste el job (Postgres, status=PENDING)
        ◀── { jobId } ──   2. encola en Redis (BullMQ)  jobId = UUID de la BD
                       └───────────────┬──────────────┘
                                       │ (waiting / delayed / prioritized)
                                       ▼
                              ┌──────────────────┐
                              │  Redis (BullMQ)  │
                              └────────┬─────────┘
                                       │ entrega el job
                                       ▼
                       ┌──────────────────────────────┐
                       │        Worker (Processor)     │
                       │  PROCESSING → handler → DONE   │
                       │   ┌── TEST ──┐                 │
                       │   ├── EMAIL ─┤  actualiza      │
                       │   └── REPORT ┘  estado en ─────┼──▶ Postgres
                       └──────────────────────────────┘
                          (reintentos con backoff si falla)
```

> API y Worker corren en el mismo proceso, pero están **estructurados como módulos independientes** para poder desplegarse por separado si se necesitara escalar.

## 🔄 Ciclo de vida de un Job

```
PENDING ──▶ PROCESSING ──▶ COMPLETED
   │             │
   │             └──(error)──▶ (reintentos con backoff) ──▶ FAILED ──(retry manual)──▶ PENDING
   │
   └──(cancelación)──▶ CANCELLED
```

**Tipos:** `TEST` · `EMAIL` (nodemailer/Ethereal) · `REPORT` (CSV en base64)
**Prioridades:** `HIGH` · `MEDIUM` · `LOW`

## 🛠️ Stack

NestJS · TypeScript · BullMQ · Redis 7 · PostgreSQL 16 · Prisma 7 · Docker · Jest · Testcontainers · pino

## ▶️ Cómo correrlo (local)

**Requisitos:** Node 22+, Docker.

```bash
# 1. Infra (Postgres + Redis)
docker compose up -d

# 2. Variables de entorno
cp .env.example .env        # completa los valores

# 3. Dependencias
npm install

# 4. Migraciones
npx prisma migrate deploy

# 5. (Opcional) datos de demo
npm run seed

# 6. Levantar en modo dev
npm run start:dev
```

| Recurso                         | URL                               |
| ------------------------------- | --------------------------------- |
| API                             | http://localhost:3000             |
| Swagger (docs interactivos)     | http://localhost:3000/docs        |
| Bull Board (dashboard de colas) | http://localhost:3000/queue/board |

> Bull Board pide **Basic Auth** (`BULL_BOARD_USER` / `BULL_BOARD_PASS`).

## 📡 Endpoints

| Método   | Ruta              | Descripción                                                                                     |
| -------- | ----------------- | ----------------------------------------------------------------------------------------------- |
| `POST`   | `/jobs`           | Crea y encola un job → `201 { id, status }`                                                     |
| `GET`    | `/jobs`           | Lista con filtros (`status`, `type`, `priority`, `from`, `to`) + paginación (`limit`, `cursor`) |
| `GET`    | `/jobs/:id`       | Estado de un job (`404` si no existe)                                                           |
| `DELETE` | `/jobs/:id`       | Cancela un job `PENDING` (`409` si ya corrió)                                                   |
| `POST`   | `/jobs/:id/retry` | Reintenta un job `FAILED` (`409` si no está fallido)                                            |
| `GET`    | `/queue/stats`    | Conteos de la cola (active, waiting, completed, failed, delayed)                                |

**Ejemplo — crear un job:**

```bash
curl -X POST http://localhost:3000/jobs \
  -H "Content-Type: application/json" \
  -d '{ "type": "TEST", "payload": { "foo": "bar" }, "priority": "HIGH" }'
# → { "id": "…uuid…", "status": "PENDING" }
```

## 🖼️ Capturas

<!-- Reemplaza por screenshots reales guardados en una carpeta docs/ -->

| Swagger            | Bull Board            |
| ------------------ | --------------------- |
| `docs/swagger.png` | `docs/bull-board.png` |

## ✅ Tests

```bash
npm run test          # unitarios
npm run test:cov      # unitarios + cobertura (umbral 70%)
npm run test:e2e      # e2e: POST → worker → COMPLETED (Testcontainers)
```

- **Unitarios**: `JobsService`, `JobsProcessor`, handlers y controllers con mocks.
- **e2e**: levanta Postgres + Redis reales efímeros y valida el **ciclo de vida completo** de un job.

## 🔑 Variables de entorno

Ver [`.env.example`](./.env.example). Se **validan al arrancar** con Joi (la app no levanta si falta o es inválida alguna):

| Variable                                     | Descripción                     |
| -------------------------------------------- | ------------------------------- |
| `NODE_ENV`, `PORT`                           | Entorno y puerto de la API      |
| `POSTGRES_*`, `DATABASE_URL`                 | Conexión a PostgreSQL           |
| `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` | Conexión a Redis                |
| `QUEUE_MAX_ATTEMPTS`, `QUEUE_BACKOFF_DELAY`  | Reintentos y backoff de la cola |
| `BULL_BOARD_USER`, `BULL_BOARD_PASS`         | Credenciales del dashboard      |

## 🧠 Decisiones de diseño

- **UUID de la BD como `jobId` de BullMQ** → idempotencia sin campos extra.
- **`maxAttempts` persistido por job** → BD y cola comparten la misma fuente de verdad.
- **Handler-por-tipo** en vez de `switch` → extensibilidad sin tocar el worker.
- **Estado en Postgres, cola en Redis** → el ciclo de vida sobrevive aunque se limpie Redis.
- **Config validada + fail-fast** → los errores de entorno se detectan al arrancar, no en runtime.

## 📁 Estructura

```
src/
├─ config/            # validación de entorno (Joi)
├─ common/filters/    # exception filter global
├─ prisma/            # PrismaModule + PrismaService (driver adapter)
├─ modules/
│  ├─ jobs/           # controller, service, processor, DTOs, handlers/
│  └─ queue/          # stats de la cola
└─ main.ts            # bootstrap, Swagger, Bull Board, pino
prisma/               # schema, migraciones, seed
test/                 # e2e (Testcontainers)
```

## 📌 Estado del proyecto

Proyecto de portafolio. Implementado de forma incremental por tickets (`ASYNCQ-01` … `ASYNCQ-17`) con ramas por feature y commits convencionales. La **Fase 4 (deploy: Dockerfile prod, CI, hosting)** se dejó fuera de alcance de forma intencional — el foco fue el diseño del sistema, la robustez de la cola y la calidad (tests + observabilidad).

## 👤 Autor

**Giancarlo Reina** — [giancarloreina125@gmail.com](mailto:giancarloreina125@gmail.com)
