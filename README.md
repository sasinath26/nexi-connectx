# Nexi ConnectX

Enterprise integration and workflow orchestration Proof of Concept (POC) built with **Apache Camel**, **Spring Boot**, **Kafka**, **PostgreSQL**, and a **React** monitoring dashboard.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              NexiConnectX Platform                              │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                        INBOUND SOURCES  (Triggers)                      │   │
│  │                                                                         │   │
│  │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │   │
│  │   │  File Upload  │  │  SFTP Read   │  │   REST API   │  │   Kafka   │ │   │
│  │   │  (Local/SMB) │  │  (Remote FS) │  │  (HTTP POST) │  │ Consumer  │ │   │
│  │   └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │   │
│  └──────────┼─────────────────┼─────────────────┼────────────────┼───────┘   │
│             └─────────────────┴─────────────────┴────────────────┘           │
│                                         │                                       │
│                                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │                    APACHE CAMEL  (Dynamic Route Engine)                  │  │
│  │                                                                          │  │
│  │   Workflow definitions are stored in PostgreSQL.                        │  │
│  │   On ACTIVATE → Camel builds and starts the route at runtime.           │  │
│  │                                                                          │  │
│  │   ┌──────────────────────────────────────────────────────────────────┐  │  │
│  │   │                      PROCESSING PIPELINE                         │  │  │
│  │   │                                                                  │  │  │
│  │   │  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐ │  │  │
│  │   │  │  TRANSFORM   │──▶│   VALIDATE   │──▶│       ENRICH         │ │  │  │
│  │   │  │              │   │              │   │                      │ │  │  │
│  │   │  │ CSV → JSON   │   │ Field rules  │   │ Add metadata / tags  │ │  │  │
│  │   │  │ XML → JSON   │   │ Schema check │   │ Lookup enrichment    │ │  │  │
│  │   │  │ JSON remap   │   │ Biz rules    │   │                      │ │  │  │
│  │   │  └──────────────┘   └──────────────┘   └──────────────────────┘ │  │  │
│  │   └──────────────────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────┬───────────────────────────────────────────┘  │
│                                 │                                               │
│             ┌───────────────────┼───────────────────┐                          │
│             ▼                   ▼                   ▼                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────────────┐ │
│  │  OUTBOUND SINKS  │  │  NOTIFICATIONS   │  │   CONTROL FLOW               │ │
│  │                  │  │                  │  │                              │ │
│  │  PostgreSQL      │  │  Email (SMTP)    │  │  Parallel Split / Join       │ │
│  │  Kafka Publish   │  │  Slack Webhook   │  │  Conditional Branch          │ │
│  │  SQL Execute     │  │                  │  │  Dead Letter Queue (DLQ)     │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────────────────┘ │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────     │
│                                                                                 │
│  ┌───────────────────────────────┐   ┌─────────────────────────────────────┐  │
│  │     REACT FRONTEND            │   │       MCP SERVER  (AI Gateway)      │  │
│  │     localhost:5173            │   │       Python · FastMCP · stdio      │  │
│  │                               │   │                                     │  │
│  │  • Dashboard & Metrics        │   │  Cursor / Claude Code               │  │
│  │  • Workflow Builder (DAG)     │   │       │                             │  │
│  │  • Execution History          │   │       ▼  natural language           │  │
│  │  • Logs & Monitoring          │   │  12 MCP Tools ──▶ REST API :8080   │  │
│  │  • Plugin Configuration       │   │                                     │  │
│  └───────────────┬───────────────┘   └──────────────────┬──────────────────┘  │
│                  │  REST / HTTP                          │  REST / HTTP        │
│                  └──────────────────┬────────────────────┘                     │
│                                     ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │              SPRING BOOT BACKEND   localhost:8080                        │  │
│  │                                                                          │  │
│  │   REST Controllers  ·  Camel Context  ·  Plugin Registry                │  │
│  │   Workflow Engine   ·  Execution Tracker  ·  Route Control              │  │
│  └──────────────────────────────────┬───────────────────────────────────────┘  │
│                                     │  JPA / JDBC                              │
│                                     ▼                                           │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │              POSTGRESQL  (dolphinscheduler · schema: nexi_connectx)      │  │
│  │                                                                          │  │
│  │   workflow_definitions  ·  workflow_nodes  ·  workflow_edges             │  │
│  │   workflow_executions   ·  execution_logs  ·  plugin_configurations      │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Component Summary

| Component | Tech | URL |
|-----------|------|-----|
| Backend API | Spring Boot 3 + Apache Camel | `http://localhost:8080` |
| Swagger UI | SpringDoc OpenAPI | `http://localhost:8080/swagger-ui.html` |
| Frontend | React 18 + Vite + React Flow | `http://localhost:5173` |
| MCP Server | Python 3.10 + FastMCP | stdio (auto-started by Cursor) |
| Database | PostgreSQL | `18.212.49.148:5433` |
| Message Broker | Apache Kafka | `localhost:9092` (optional) |

### Data Flow

```
User / AI Agent
     │
     ├──▶ React UI (drag-and-drop workflow builder)
     │          │
     └──▶ MCP Server (natural language → 12 tools)
                │
                ▼
        Spring Boot REST API  (:8080)
                │
                ├──▶ Read workflow definition from PostgreSQL
                │
                ├──▶ Apache Camel: build route dynamically at runtime
                │
                ├──▶ Execute: Source → Transform → Validate → Sink
                │
                └──▶ Write execution logs back to PostgreSQL
```

## Dynamic Workflows

Nexi ConnectX supports **fully dynamic workflows** stored in PostgreSQL and executed by a database-driven Camel engine.

- **Visual Workflow Builder (React Flow):** http://localhost:5173/workflows — drag-and-drop DAG designer with dynamic task forms
- **API:** `/api/workflow-definitions`
- **Plugins:** Reusable tasks (File, REST, Kafka, Transform, Validate, DB, SQL, Shell, Email, Slack, Parallel, Conditional)
- **Camel routes** are generated at deploy time from workflow definitions (not hardcoded)
- **Feature matrix:** see [FEATURES.md](./FEATURES.md) for implemented vs planned capabilities

### Sample workflows (auto-seeded)

| Code | Flow |
|------|------|
| `file-csv-db` | File Upload → CSV Transform → DB Insert |
| `rest-validate-kafka-email` | Manual → Validate → Kafka → Email |
| `kafka-enrich-notify` | Kafka → Enrich → Parallel → Slack |
| `logs-parallel-sql-summary` | get-logs → read-file1/read-file2 (parallel) → SQL outputs + join summary |

### Workflow API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/workflow-definitions` | List workflows |
| GET | `/api/workflow-definitions/plugins` | Available plugins |
| POST | `/api/workflow-definitions` | Create workflow |
| PUT | `/api/workflow-definitions/{id}` | Update workflow |
| POST | `/api/workflow-definitions/{id}/activate` | Activate & deploy Camel route |
| POST | `/api/workflow-definitions/{id}/execute` | Run workflow manually |
| GET | `/api/workflow-definitions/executions/{id}/nodes` | Per-node execution history |

## Modules

| Module | Package | Description |
|--------|---------|-------------|
| Connectors | `routes/` | File, SFTP, REST, Kafka consumer |
| Transformers | `transformers/` | CSV/XML/JSON mapping & enrichment |
| Validators | `validators/` | Mandatory, schema, business rules |
| Routing | `routes/` | Content-based & dynamic routing |
| Error Handling | `routes/ErrorHandlingRoute` | Retry, DLQ, failure logging |
| Notifications | `notifications/` | Email & Slack |
| Monitoring | `monitoring/` | Metrics, logs, health checks |
| Dynamic Workflows | `workflow/` | DB-driven definitions, plugin engine, dynamic Camel routes |
| UI | `frontend/` | React dashboard + workflow builder |

## Prerequisites

- Java 17+
- Maven 3.8+
- Node.js 18+
- **PostgreSQL** (required — remote or Docker)
- Docker (optional, for local Kafka and PostgreSQL)

## Database (PostgreSQL)

The application uses **PostgreSQL only** (H2 local profile removed). Default connection:

| Setting | Default |
|---------|---------|
| Host | `18.212.49.148` |
| Port | `5433` |
| Database | `dolphinscheduler` |
| Username | `root` |
| Password | `root` |
| Schema | `nexi_connectx` |

Override via environment variables (see `.env.example`):

```powershell
$env:POSTGRESQL_HOST="18.212.49.148"
$env:POSTGRESQL_PORT="5433"
$env:POSTGRESQL_USERNAME="root"
$env:POSTGRESQL_PASSWORD="root"
$env:POSTGRESQL_DATABASE="dolphinscheduler"
```

**Local PostgreSQL via Docker:**

```bash
docker-compose up -d postgres
$env:POSTGRESQL_HOST="localhost"
```

## Quick Start

### 2. Start Backend

```powershell
cd backend
# Ensure PostgreSQL is reachable, then:
mvn spring-boot:run
```

Do **not** use `-Dspring-boot.run.profiles=local` (H2 profile removed).

API: http://localhost:8080  
Swagger UI: http://localhost:8080/swagger-ui.html

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Dashboard: http://localhost:5173

### 4. Run Sample Workflows

**File ingestion** — copy a sample file into the input directory:

```bash
cp data/input/sample-customers.csv ./data/input/
```

**REST trigger** — POST JSON to Camel REST endpoint:

```bash
curl -X POST http://localhost:8080/integration/trigger \
  -H "Content-Type: application/json" \
  -d '[{"id":"1","name":"Test","email":"test@example.com","type":"GENERAL","source":"REST"}]'
```

**Kafka consumer** — start the route from the UI (Workflow Monitoring) or API:

```bash
curl -X POST http://localhost:8080/api/config/routes/kafka-consumer-route/start
```

## Configuration

Environment variables (or `application.yml`):

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRESQL_HOST` | 18.212.49.148 | Database host |
| `POSTGRESQL_PORT` | 5433 | Database port |
| `POSTGRESQL_USERNAME` | root | Database user |
| `POSTGRESQL_PASSWORD` | root | Database password |
| `POSTGRESQL_DATABASE` | dolphinscheduler | Database name |
| `KAFKA_BOOTSTRAP_SERVERS` | localhost:9092 | Kafka brokers |
| `FILE_INPUT_DIR` | ./data/input | File watch directory |
| `EMAIL_ENABLED` | false | Enable email notifications |
| `SLACK_ENABLED` | false | Enable Slack notifications |
| `SFTP_ENABLED` | false | Enable SFTP ingestion route |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard` | Dashboard summary |
| GET | `/api/dashboard/routes` | Camel route statuses |
| GET | `/api/workflows/history` | Execution history |
| GET | `/api/workflows/logs` | Execution logs |
| GET | `/api/config` | Plugin configurations |
| PUT | `/api/config/{id}` | Update configuration |
| POST | `/api/config/routes/{id}/start` | Start Camel route |
| POST | `/api/config/routes/{id}/stop` | Stop Camel route |
| POST | `/integration/trigger` | Trigger REST workflow |

## Tests

```bash
cd backend
mvn test
```

## Project Structure

```
NexiConnectX/
├── backend/                 # Spring Boot + Apache Camel
│   └── src/main/java/com/nexi/connectx/
│       ├── config/
│       ├── connectors/        # (routes implement connectors)
│       ├── transformers/
│       ├── validators/
│       ├── routes/
│       ├── processors/
│       ├── notifications/
│       ├── monitoring/
│       ├── controller/
│       └── service/
├── frontend/                # React dashboard
├── data/input/              # Sample workflow files
└── docker-compose.yml       # Local Kafka
```

## License

POC — Internal use only.
