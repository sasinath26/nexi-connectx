# NexiConnectX MCP Server

Python MCP server that lets Claude Code / Cursor manage NexiConnectX enterprise integration workflows through natural language.

## Prerequisites

- Python 3.10+
- NexiConnectX backend running on `http://localhost:8080`

```powershell
cd backend
mvn spring-boot:run
```

## Install

```powershell
cd mcp-server
pip install -r requirements.txt
```

## Connect to Claude Code

From the NexiConnectX project root:

```powershell
claude mcp add --scope project nexi-connectx -e NEXI_API_URL=http://localhost:8080 -- python mcp-server/server.py
```

Or use the committed `.mcp.json` in the project root (project scope).

Verify:

```powershell
claude mcp list
```

Inside a Claude Code session, run `/mcp` and confirm `nexi-connectx` is connected.

## Connect to Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "nexi-connectx": {
      "command": "python",
      "args": ["mcp-server/server.py"],
      "env": { "NEXI_API_URL": "http://localhost:8080" }
    }
  }
}
```

## MCP Tools

| Tool | Description |
|------|-------------|
| `check_health` | Verify backend is reachable |
| `list_workflows` | List all workflows |
| `get_workflow` | Get workflow with nodes and edges |
| `list_plugins` | Plugin catalog with required config keys |
| `get_plugin_schema` | Required/optional fields for one plugin |
| `validate_workflow_config` | Validate JSON before create/update |
| `create_workflow` | Create a new workflow |
| `update_workflow` | Update existing workflow |
| `activate_workflow` | Activate and deploy Camel route |
| `run_workflow` | Execute workflow immediately |
| `delete_workflow` | Delete a workflow by id (DRAFT, ACTIVE, etc.) |
| `check_workflow_files` | List upload/prompts/error folders and check if files exist |

## Workflow file folders

When a workflow is created with a **FILE_UPLOAD** step, these folders are created automatically:

```
./workflows/{workflowCode}/
  upload/    — place files here for processing
  prompts/   — store workflow-related prompt files
  error/     — files that failed during processing
```

## Demo Prompts

**View workflows:**
```
List all NexiConnectX workflows and show details of the file-csv-db workflow.
```

**Create workflow:**
```
Create a DRAFT workflow:
- Name: File to Database
- Code: file-csv-db-demo
- Steps: File Upload → CSV Transform → DB Insert
- File Upload inputDir: ./data/input
- DB Insert table: employees, host: localhost, database: dolphinscheduler, user: root, password: root
```

**Edit workflow:**
```
Get workflow id 3, add an Email notification step at the end with to admin@company.com and subject Workflow completed, then update it.
```

**Check workflow files:**
```
Check workflow id 1 files — list upload, prompts, and error folders.
```

```
Does emp.csv exist in workflow id 1 upload folder?
```

## Environment

| Variable | Default |
|----------|---------|
| `NEXI_API_URL` | `http://localhost:8080` |
