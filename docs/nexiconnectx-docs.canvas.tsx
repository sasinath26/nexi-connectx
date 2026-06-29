import {
  useHostTheme,
  useCanvasState,
  Stack,
  Row,
  Grid,
  Card,
  CardHeader,
  CardBody,
  H1,
  H2,
  H3,
  Text,
  Code,
  Pill,
  Callout,
  Divider,
  Table,
  Stat,
  Spacer,
} from "cursor/canvas";

// ── Data ──────────────────────────────────────────────────────────────────────

const SECTIONS = ["Overview", "Architecture", "Apache Camel", "MCP Server", "MCP Tools", "Start Servers"] as const;
type Section = (typeof SECTIONS)[number];

const plugins = [
  { type: "FILE_UPLOAD",   name: "File Upload",        cat: "Source",    trigger: true,  required: "taskName, inputDir" },
  { type: "SFTP_READ",     name: "SFTP Read",          cat: "Source",    trigger: true,  required: "host, username, password" },
  { type: "REST_API",      name: "REST API Call",      cat: "Source",    trigger: true,  required: "url" },
  { type: "KAFKA_CONSUMER",name: "Kafka Consumer",     cat: "Source",    trigger: true,  required: "topic" },
  { type: "MANUAL_TRIGGER",name: "Manual Trigger",     cat: "Source",    trigger: true,  required: "—" },
  { type: "CSV_TRANSFORM", name: "CSV Transformation", cat: "Transform", trigger: false, required: "—" },
  { type: "XML_TRANSFORM", name: "XML Transformation", cat: "Transform", trigger: false, required: "—" },
  { type: "JSON_TRANSFORM",name: "JSON Mapping",       cat: "Transform", trigger: false, required: "—" },
  { type: "JSON_VALIDATE", name: "JSON Validation",    cat: "Validate",  trigger: false, required: "—" },
  { type: "DATA_ENRICH",   name: "Data Enrichment",    cat: "Transform", trigger: false, required: "—" },
  { type: "DB_INSERT",     name: "Database Insert",    cat: "Sink",      trigger: false, required: "host, databaseName, username, password, tableName" },
  { type: "SQL_EXEC",      name: "SQL Execute",        cat: "Sink",      trigger: false, required: "—" },
  { type: "KAFKA_PUBLISH", name: "Kafka Publish",      cat: "Sink",      trigger: false, required: "topic" },
  { type: "EMAIL_NOTIFICATION", name: "Email Notification", cat: "Notification", trigger: false, required: "to, subject" },
  { type: "SLACK_NOTIFICATION", name: "Slack Notification", cat: "Notification", trigger: false, required: "message" },
  { type: "PARALLEL_SPLIT",name: "Parallel Split",     cat: "Control",   trigger: false, required: "—" },
  { type: "PARALLEL_JOIN", name: "Parallel Join",      cat: "Control",   trigger: false, required: "—" },
  { type: "CONDITIONAL_BRANCH", name: "Conditional Branch", cat: "Control", trigger: false, required: "—" },
  { type: "FILE_READ",     name: "File Read",          cat: "Source",    trigger: false, required: "path" },
  { type: "SHELL_EXEC",    name: "Shell / Script",     cat: "Task",      trigger: false, required: "—" },
];

const mcpTools = [
  { tool: "check_health",            desc: "Verify backend is reachable and healthy", prompt: 'Is the NexiConnectX backend running?' },
  { tool: "list_workflows",          desc: "List all workflow definitions", prompt: 'List all NexiConnectX workflows.' },
  { tool: "get_workflow",            desc: "Get full workflow with nodes, edges and config", prompt: 'Show me the details of workflow id 34.' },
  { tool: "list_plugins",            desc: "Full plugin catalog with required config keys", prompt: 'What plugins are available in NexiConnectX?' },
  { tool: "get_plugin_schema",       desc: "Required + optional fields for one plugin type", prompt: 'Show me the schema for the DB_INSERT plugin.' },
  { tool: "validate_workflow_config",desc: "Validate workflow JSON before create or update", prompt: 'Validate this workflow JSON before I create it.' },
  { tool: "create_workflow",         desc: "Create a new workflow (DRAFT or ACTIVE)", prompt: 'Create a DRAFT workflow: Name: File to Database, Code: file-csv-db, Steps: File Upload → CSV Transform → DB Insert.' },
  { tool: "update_workflow",         desc: "Update an existing workflow by id", prompt: 'Get workflow id 3, add an Email step at the end with to admin@company.com, then update it.' },
  { tool: "activate_workflow",       desc: "Activate workflow and deploy its Camel route", prompt: 'Activate workflow id 34.' },
  { tool: "run_workflow",            desc: "Execute workflow immediately (no ACTIVE needed)", prompt: 'Run workflow id 34.' },
  { tool: "delete_workflow",         desc: "Delete a workflow by id (any status)", prompt: 'Delete workflow id 34.' },
  { tool: "check_workflow_files",    desc: "List upload/prompts/error folders; check if a file exists", prompt: 'Does emp.csv exist in the upload folder of workflow id 34?' },
];

const sampleWorkflows = [
  { code: "file-csv-db",                flow: "File Upload → CSV Transform → DB Insert" },
  { code: "rest-validate-kafka-email",  flow: "Manual → JSON Validate → Kafka Publish → Email" },
  { code: "kafka-enrich-notify",        flow: "Kafka Consumer → Data Enrich → Parallel Split → Slack" },
  { code: "logs-parallel-sql-summary",  flow: "Shell Exec → File Read (×2, parallel) → SQL Exec + Join Summary" },
];

const catColor: Record<string, string> = {
  Source: "#3b82f6",
  Transform: "#8b5cf6",
  Validate: "#f59e0b",
  Sink: "#10b981",
  Notification: "#ec4899",
  Control: "#6366f1",
  Task: "#64748b",
};

// ── Arch diagram (pure SVG, no external deps) ─────────────────────────────────
function ArchDiagram() {
  const theme = useHostTheme();
  const boxes: { x: number; y: number; w: number; h: number; label: string; sub: string; color: string }[] = [
    { x: 20,  y: 60,  w: 140, h: 52, label: "Inbound Sources",   sub: "File · SFTP · REST · Kafka",       color: "#3b82f6" },
    { x: 200, y: 60,  w: 140, h: 52, label: "Apache Camel",       sub: "Dynamic Routes (DB-driven)",       color: "#8b5cf6" },
    { x: 380, y: 10,  w: 140, h: 52, label: "Transform & Validate",sub: "CSV / XML / JSON / Rules",         color: "#f59e0b" },
    { x: 380, y: 110, w: 140, h: 52, label: "Outbound Sinks",     sub: "PostgreSQL · Kafka · Email · Slack",color: "#10b981" },
    { x: 560, y: 60,  w: 140, h: 52, label: "React Dashboard",    sub: "Monitoring · Workflow Builder",    color: "#6366f1" },
    { x: 200, y: 165, w: 140, h: 52, label: "MCP Server",         sub: "12 tools — Cursor / Claude Code",  color: "#ec4899" },
    { x: 20,  y: 165, w: 140, h: 52, label: "PostgreSQL",         sub: "Workflow defs · Execution logs",   color: "#64748b" },
  ];

  const arrows: [number, number, number, number][] = [
    [160, 86,  200, 86],
    [340, 50,  380, 36],
    [340, 106, 380, 136],
    [520, 36,  560, 86],
    [520, 136, 560, 86],
    [200, 86,  200, 165],
    [160, 191, 200, 191],
  ];

  return (
    <svg
      viewBox="0 0 720 230"
      style={{ width: "100%", maxWidth: 720, height: "auto", display: "block" }}
    >
      {arrows.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={theme.stroke.secondary}
          strokeWidth={1.5}
          markerEnd="url(#arr)"
        />
      ))}
      <defs>
        <marker id="arr" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <polygon points="0 0, 7 3.5, 0 7" fill={theme.stroke.secondary} />
        </marker>
      </defs>
      {boxes.map((b, i) => (
        <g key={i}>
          <rect
            x={b.x} y={b.y} width={b.w} height={b.h} rx={6}
            fill={theme.fill.tertiary}
            stroke={b.color}
            strokeWidth={1.5}
          />
          <text x={b.x + b.w / 2} y={b.y + 18} textAnchor="middle" fontSize={10} fontWeight={600} fill={b.color}>{b.label}</text>
          <text x={b.x + b.w / 2} y={b.y + 34} textAnchor="middle" fontSize={8.5} fill={theme.text.secondary}>{b.sub}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Pipeline step component ────────────────────────────────────────────────────
function PipelineStep({ label, color, arrow }: { label: string; color: string; arrow?: boolean }) {
  const theme = useHostTheme();
  return (
    <Row gap={4} align="center">
      <div style={{
        padding: "4px 12px",
        background: theme.fill.tertiary,
        border: `1px solid ${color}`,
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        color,
      }}>
        {label}
      </div>
      {arrow && <Text tone="tertiary" size="small" as="span" style={{ fontSize: 16 }}>→</Text>}
    </Row>
  );
}

// ── Main canvas ───────────────────────────────────────────────────────────────
export default function NexiConnectXDocs() {
  const theme = useHostTheme();
  const [activeSection, setActiveSection] = useCanvasState<Section>("activeSection", "Overview");

  return (
    <Stack gap={0} style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>

      {/* Header */}
      <Row align="center" gap={12} style={{ marginBottom: 20 }}>
        <div>
          <H1 style={{ marginBottom: 2 }}>NexiConnectX</H1>
          <Text tone="secondary">Enterprise Integration & Workflow Orchestration Platform</Text>
        </div>
        <Spacer />
        <Pill tone="info" active>POC</Pill>
      </Row>

      {/* Nav */}
      <Row gap={8} wrap style={{ marginBottom: 28 }}>
        {SECTIONS.map(s => (
          <Pill key={s} active={activeSection === s} onClick={() => setActiveSection(s)}>{s}</Pill>
        ))}
      </Row>

      {/* ── Overview ─────────────────────────────────────────────────────── */}
      {activeSection === "Overview" && (
        <Stack gap={20}>
          <Text>
            NexiConnectX is an <Text weight="semibold" as="span">enterprise integration and workflow orchestration POC</Text> that
            lets you build, deploy, and monitor data pipelines through a visual UI, a REST API, or plain English via an AI agent — no
            code changes required.
          </Text>

          <Grid columns={3} gap={12}>
            <Stat value="20+" label="Plugin types" />
            <Stat value="3" label="Server components" />
            <Stat value="12" label="MCP tools" />
          </Grid>

          <Divider />
          <H2>What can it do?</H2>

          <Grid columns={2} gap={12}>
            <Card>
              <CardHeader>Visual Workflow Builder</CardHeader>
              <CardBody>
                <Text tone="secondary" size="small">
                  Drag-and-drop DAG designer powered by React Flow at <Code>localhost:5173/workflows</Code>.
                  Connect source → transform → sink nodes with a click. Each node has a dynamic config form.
                </Text>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>Dynamic Camel Routes</CardHeader>
              <CardBody>
                <Text tone="secondary" size="small">
                  Workflows are stored in PostgreSQL. On <Code>activate</Code>, Apache Camel generates
                  and deploys the route at runtime — no restarts, no hardcoded routes.
                </Text>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>AI-Native via MCP</CardHeader>
              <CardBody>
                <Text tone="secondary" size="small">
                  A Python MCP server exposes 12 tools so Cursor / Claude Code can create, validate,
                  run, and manage workflows using natural language.
                </Text>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>Multi-protocol Connectors</CardHeader>
              <CardBody>
                <Text tone="secondary" size="small">
                  Ingest from File, SFTP, REST, or Kafka. Publish to PostgreSQL, Kafka, Email, or Slack.
                  Parallel branches and conditional routing included.
                </Text>
              </CardBody>
            </Card>
          </Grid>

          <H2>Pre-seeded Workflows</H2>
          <Table
            headers={["Code", "Pipeline"]}
            rows={sampleWorkflows.map(w => [<Code key={w.code}>{w.code}</Code>, w.flow])}
            striped
          />
        </Stack>
      )}

      {/* ── Architecture ─────────────────────────────────────────────────── */}
      {activeSection === "Architecture" && (
        <Stack gap={20}>
          <Text tone="secondary">
            Three runtime components communicate over HTTP. The MCP server is a thin proxy; all business
            logic lives in the Spring Boot backend.
          </Text>

          <ArchDiagram />

          <Divider />
          <H2>Component Breakdown</H2>

          <Grid columns={3} gap={12}>
            <Card>
              <CardHeader trailing={<Pill size="sm" tone="info">:8080</Pill>}>Backend</CardHeader>
              <CardBody>
                <Stack gap={6}>
                  <Text size="small" tone="secondary">Spring Boot 3 + Apache Camel</Text>
                  <Text size="small" tone="secondary">Java 17, Maven</Text>
                  <Text size="small" tone="secondary">PostgreSQL (workflow defs + execution logs)</Text>
                  <Text size="small" tone="secondary">Swagger UI at <Code>/swagger-ui.html</Code></Text>
                </Stack>
              </CardBody>
            </Card>
            <Card>
              <CardHeader trailing={<Pill size="sm" tone="success">:5173</Pill>}>Frontend</CardHeader>
              <CardBody>
                <Stack gap={6}>
                  <Text size="small" tone="secondary">React 18 + Vite</Text>
                  <Text size="small" tone="secondary">React Flow (DAG builder)</Text>
                  <Text size="small" tone="secondary">Dashboard, Monitoring, Logs, Execution History</Text>
                  <Text size="small" tone="secondary">Real-time route status</Text>
                </Stack>
              </CardBody>
            </Card>
            <Card>
              <CardHeader trailing={<Pill size="sm" tone="warning">stdio</Pill>}>MCP Server</CardHeader>
              <CardBody>
                <Stack gap={6}>
                  <Text size="small" tone="secondary">Python 3.10+ (FastMCP)</Text>
                  <Text size="small" tone="secondary">Talks to backend via HTTP</Text>
                  <Text size="small" tone="secondary">Cursor project-scoped <Code>.mcp.json</Code></Text>
                  <Text size="small" tone="secondary">NEXI_API_URL=http://localhost:8080</Text>
                </Stack>
              </CardBody>
            </Card>
          </Grid>

          <H2>Data Flow</H2>
          <Stack gap={8}>
            <Row gap={6} align="center" wrap>
              <PipelineStep label="Inbound Source" color="#3b82f6" arrow />
              <PipelineStep label="Apache Camel Route" color="#8b5cf6" arrow />
              <PipelineStep label="Transform / Validate / Enrich" color="#f59e0b" arrow />
              <PipelineStep label="Sink / Notify" color="#10b981" />
            </Row>
            <Text size="small" tone="tertiary">
              Routes are generated from workflow definitions stored in PostgreSQL.
              Each node maps to a plugin executor class in the backend.
            </Text>
          </Stack>

          <H2>Database</H2>
          <Table
            headers={["Setting", "Default"]}
            rows={[
              ["Host", "18.212.49.148"],
              ["Port", "5433"],
              ["Database", "dolphinscheduler"],
              ["Username", "root"],
              ["Schema", "nexi_connectx"],
            ]}
          />
          <Text size="small" tone="tertiary">Override any value via environment variables (e.g. <Code>POSTGRESQL_HOST</Code>).</Text>
        </Stack>
      )}

      {/* ── Apache Camel ─────────────────────────────────────────────────── */}
      {activeSection === "Apache Camel" && (
        <Stack gap={20}>
          <Text>
            Apache Camel is the integration engine at the heart of NexiConnectX. It handles message
            routing, protocol adaptation, transformation, and error handling — all without you writing
            boilerplate glue code.
          </Text>

          <H2>Why Apache Camel?</H2>

          <Grid columns={2} gap={12}>
            <Card>
              <CardHeader>Enterprise Integration Patterns (EIP)</CardHeader>
              <CardBody>
                <Text size="small" tone="secondary">
                  Camel implements 65+ patterns (Content-Based Router, Splitter, Aggregator, Dead Letter Channel …)
                  out of the box. NexiConnectX leverages these without writing them from scratch.
                </Text>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>300+ Connectors</CardHeader>
              <CardBody>
                <Text size="small" tone="secondary">
                  File, SFTP, REST, Kafka, JDBC, Email, Slack and hundreds more — all unified under one
                  routing DSL. Adding a new source or sink is a config change, not a code rewrite.
                </Text>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>Dynamic Route Generation</CardHeader>
              <CardBody>
                <Text size="small" tone="secondary">
                  NexiConnectX reads workflow definitions from PostgreSQL and calls the Camel Java DSL
                  at runtime to build and start routes — no application restart needed.
                </Text>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>Spring Boot Integration</CardHeader>
              <CardBody>
                <Text size="small" tone="secondary">
                  <Code>camel-spring-boot-starter</Code> wires Camel into the Spring context. MDC logging
                  and message history are enabled via <Code>CamelConfig</Code> for full observability.
                </Text>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>Built-in Error Handling</CardHeader>
              <CardBody>
                <Text size="small" tone="secondary">
                  Retry policies, Dead Letter Queues, and failure logging come for free.
                  Failed files land in <Code>./workflows/{"{code}"}/error/</Code> automatically.
                </Text>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>Testability</CardHeader>
              <CardBody>
                <Text size="small" tone="secondary">
                  Camel's in-memory test harness lets you unit-test every route without spinning up
                  Kafka or a real database — critical for a fast CI pipeline.
                </Text>
              </CardBody>
            </Card>
          </Grid>

          <Callout tone="info" title="How it works in NexiConnectX">
            When you hit <Code>POST /api/workflow-definitions/{"{id}"}/activate</Code>, the backend reads
            the workflow nodes from the DB, translates each node's <Code>pluginType</Code> and
            <Code>configJson</Code> into a Camel route builder chain, then calls
            <Code>camelContext.addRoutes()</Code> — live, while the app is running.
          </Callout>
        </Stack>
      )}

      {/* ── MCP Server ───────────────────────────────────────────────────── */}
      {activeSection === "MCP Server" && (
        <Stack gap={20}>
          <Text>
            The MCP (Model Context Protocol) server is a lightweight Python process that exposes NexiConnectX
            to any MCP-compatible AI client — Cursor, Claude Code, etc. — as 12 structured tools.
          </Text>

          <Callout tone="success" title="Already configured for this project">
            The project root contains a <Code>.mcp.json</Code> that auto-registers the server in Cursor.
            No manual setup needed — the server starts automatically when Cursor opens the project.
          </Callout>

          <H2>How it works</H2>
          <Stack gap={8}>
            <Row gap={6} align="center" wrap>
              <PipelineStep label="You (natural language)" color="#8b5cf6" arrow />
              <PipelineStep label="Cursor / Claude Code" color="#3b82f6" arrow />
              <PipelineStep label="MCP Server (Python)" color="#ec4899" arrow />
              <PipelineStep label="Backend REST API :8080" color="#10b981" />
            </Row>
          </Stack>

          <H2>Connection details</H2>
          <Table
            headers={["Property", "Value"]}
            rows={[
              ["Transport", "stdio"],
              ["Command", "python mcp-server/server.py"],
              ["Env var", "NEXI_API_URL=http://localhost:8080"],
              ["Scope", "Project (.mcp.json)"],
              ["Framework", "FastMCP (Python)"],
              ["MCP resources", "nexi://plugins  ·  nexi://workflows/summary"],
            ]}
          />

          <H2>Install dependencies</H2>
          <Card variant="borderless">
            <CardBody style={{ background: theme.fill.secondary, borderRadius: 6 }}>
              <Stack gap={4}>
                <Code>cd mcp-server</Code>
                <Code>pip install -r requirements.txt</Code>
              </Stack>
            </CardBody>
          </Card>

          <H2>Verify in Cursor</H2>
          <Text tone="secondary">
            Open the Cursor command palette → <Code>MCP: List servers</Code>.
            You should see <Code>nexi-connectx</Code> with status <Text weight="semibold" as="span">connected</Text>.
            Alternatively, open a new chat and ask: <Text italic as="span">"Is the NexiConnectX backend running?"</Text> —
            the agent will call <Code>check_health</Code> automatically.
          </Text>
        </Stack>
      )}

      {/* ── MCP Tools ────────────────────────────────────────────────────── */}
      {activeSection === "MCP Tools" && (
        <Stack gap={20}>
          <Text tone="secondary">
            12 tools cover the full workflow lifecycle. The AI agent calls them automatically based on your
            request — you never need to invoke them by name.
          </Text>

          <Grid columns={3} gap={12}>
            <Stat value="12" label="Total tools" />
            <Stat value="5" label="Read tools" tone="info" />
            <Stat value="7" label="Write / action tools" tone="warning" />
          </Grid>

          {mcpTools.map(t => (
            <Card key={t.tool} collapsible defaultOpen={false}>
              <CardHeader trailing={<Pill size="sm" tone="neutral">{t.tool.includes("list") || t.tool.includes("get") || t.tool.includes("check") ? "read" : "write"}</Pill>}>
                {t.tool}
              </CardHeader>
              <CardBody>
                <Stack gap={10}>
                  <Text size="small" tone="secondary">{t.desc}</Text>
                  <div style={{
                    background: theme.fill.secondary,
                    borderLeft: `3px solid ${theme.accent.primary}`,
                    borderRadius: "0 4px 4px 0",
                    padding: "6px 12px",
                  }}>
                    <Text size="small" tone="tertiary" style={{ marginBottom: 2 }}>Sample prompt</Text>
                    <Text size="small" italic>"{t.prompt}"</Text>
                  </div>
                </Stack>
              </CardBody>
            </Card>
          ))}

          <Divider />
          <H2>Available Plugins (for workflow creation)</H2>
          <Text tone="tertiary" size="small">Call <Code>list_plugins</Code> or <Code>get_plugin_schema</Code> to get full schemas before creating a workflow.</Text>
          <Table
            headers={["Plugin Type", "Name", "Category", "Trigger?", "Required Config"]}
            rows={plugins.map(p => [
              <Code key={p.type}>{p.type}</Code>,
              p.name,
              <span key={p.type + "cat"} style={{ color: catColor[p.cat] ?? theme.text.primary, fontSize: 12, fontWeight: 600 }}>{p.cat}</span>,
              p.trigger ? <Pill size="sm" tone="success" key={p.type + "t"}>Yes</Pill> : <Pill size="sm" tone="neutral" key={p.type + "t"}>No</Pill>,
              <Text size="small" tone="secondary" key={p.type + "r"}>{p.required}</Text>,
            ])}
            stickyHeader
            striped
          />
        </Stack>
      )}

      {/* ── Start Servers ────────────────────────────────────────────────── */}
      {activeSection === "Start Servers" && (
        <Stack gap={20}>
          <Callout tone="warning" title="Prerequisites">
            Java 17+, Maven 3.8+, Node.js 18+, Python 3.10+, PostgreSQL reachable (remote or Docker)
          </Callout>

          <H2>Step 1 — Start Kafka (optional)</H2>
          <Text tone="secondary" size="small">Only needed for Kafka-based workflows. Skip if not using Kafka.</Text>
          <Card variant="borderless">
            <CardBody style={{ background: theme.fill.secondary, borderRadius: 6 }}>
              <Code>docker-compose up -d</Code>
            </CardBody>
          </Card>

          <H2>Step 2 — Start the Backend</H2>
          <Card variant="borderless">
            <CardBody style={{ background: theme.fill.secondary, borderRadius: 6 }}>
              <Stack gap={4}>
                <Code>cd backend</Code>
                <Code>mvn spring-boot:run</Code>
              </Stack>
            </CardBody>
          </Card>
          <Grid columns={2} gap={12}>
            <Card>
              <CardHeader trailing={<Pill size="sm" tone="success">:8080</Pill>}>API</CardHeader>
              <CardBody><Text size="small" tone="secondary">http://localhost:8080</Text></CardBody>
            </Card>
            <Card>
              <CardHeader trailing={<Pill size="sm" tone="info">docs</Pill>}>Swagger UI</CardHeader>
              <CardBody><Text size="small" tone="secondary">http://localhost:8080/swagger-ui.html</Text></CardBody>
            </Card>
          </Grid>

          <H2>Step 3 — Start the Frontend</H2>
          <Card variant="borderless">
            <CardBody style={{ background: theme.fill.secondary, borderRadius: 6 }}>
              <Stack gap={4}>
                <Code>cd frontend</Code>
                <Code>npm install</Code>
                <Code>npm run dev</Code>
              </Stack>
            </CardBody>
          </Card>
          <Card>
            <CardHeader trailing={<Pill size="sm" tone="success">:5173</Pill>}>Dashboard</CardHeader>
            <CardBody>
              <Table
                headers={["Page", "URL"]}
                rows={[
                  ["Dashboard",          "http://localhost:5173"],
                  ["Workflow Builder",   "http://localhost:5173/workflows"],
                  ["Workflow Monitoring","http://localhost:5173/monitoring"],
                  ["Execution History",  "http://localhost:5173/history"],
                  ["Logs",               "http://localhost:5173/logs"],
                ]}
                framed={false}
              />
            </CardBody>
          </Card>

          <H2>Step 4 — Start the MCP Server</H2>
          <Card variant="borderless">
            <CardBody style={{ background: theme.fill.secondary, borderRadius: 6 }}>
              <Stack gap={4}>
                <Code>cd mcp-server</Code>
                <Code>pip install -r requirements.txt</Code>
              </Stack>
            </CardBody>
          </Card>
          <Text tone="secondary" size="small">
            Cursor auto-starts the MCP server via <Code>.mcp.json</Code> in the project root.
            No manual launch needed — just open the project in Cursor.
          </Text>

          <Divider />
          <H2>Environment Variables</H2>
          <Table
            headers={["Variable", "Default", "Description"]}
            rows={[
              ["POSTGRESQL_HOST",        "18.212.49.148", "Database host"],
              ["POSTGRESQL_PORT",        "5433",          "Database port"],
              ["POSTGRESQL_USERNAME",    "root",          "Database user"],
              ["POSTGRESQL_PASSWORD",    "root",          "Database password"],
              ["POSTGRESQL_DATABASE",    "dolphinscheduler", "Database name"],
              ["KAFKA_BOOTSTRAP_SERVERS","localhost:9092","Kafka brokers"],
              ["FILE_INPUT_DIR",         "./data/input",  "File watch directory"],
              ["EMAIL_ENABLED",          "false",         "Enable email notifications"],
              ["SLACK_ENABLED",          "false",         "Enable Slack notifications"],
              ["NEXI_API_URL",           "http://localhost:8080", "MCP → backend URL"],
            ]}
            striped
          />

          <H2>Quick health check</H2>
          <Text tone="secondary" size="small">
            Once all three servers are running, ask the agent in Cursor:
          </Text>
          <div style={{
            background: theme.fill.secondary,
            borderLeft: `3px solid ${theme.accent.primary}`,
            borderRadius: "0 4px 4px 0",
            padding: "8px 14px",
          }}>
            <Text italic>"Is the NexiConnectX backend running? List all workflows."</Text>
          </div>
        </Stack>
      )}

      {/* Footer */}
      <Divider style={{ marginTop: 32 }} />
      <Row justify="space-between" style={{ marginTop: 8 }}>
        <Text size="small" tone="tertiary">NexiConnectX — POC · Internal use only</Text>
        <Text size="small" tone="tertiary">Spring Boot · Apache Camel · React · Python MCP</Text>
      </Row>
    </Stack>
  );
}
