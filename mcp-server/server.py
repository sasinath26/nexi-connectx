"""
NexiConnectX MCP Server — workflow CRUD tools for Claude Code / Cursor.
"""

from __future__ import annotations

import json
import os

from mcp.server.fastmcp import FastMCP

from nexi_client import NexiClient, NexiClientError
from workflow_builder import (
    extract_plugin_schema,
    normalize_workflow,
    parse_workflow_json,
    summarize_workflows,
    validate_workflow_structure,
)

mcp = FastMCP("nexi-connectx")
client = NexiClient()


def _ok(data: object) -> str:
    if isinstance(data, str):
        return data
    return json.dumps(data, indent=2, default=str)


def _err(message: str) -> str:
    return json.dumps({"error": message}, indent=2)


@mcp.tool()
def check_health() -> str:
    """Check whether NexiConnectX backend is reachable and healthy."""
    try:
        return _ok({"status": "ok", "health": client.health(), "apiUrl": client.base_url})
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.tool()
def list_workflows() -> str:
    """List all NexiConnectX workflow definitions (id, code, name, status)."""
    try:
        workflows = client.list_workflows()
        return _ok(summarize_workflows(workflows))
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.tool()
def get_workflow(workflow_id: int) -> str:
    """
    Get full workflow details including nodes, edges, and configJson per node.
    Use workflow_id from list_workflows.
    """
    try:
        return _ok(client.get_workflow(workflow_id))
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.tool()
def list_plugins() -> str:
    """
    List all available workflow plugins with config schemas.
    Call this before create_workflow to learn valid pluginType values and required config fields.
    """
    try:
        plugins = client.list_plugins()
        compact = [
            {
                "type": p.get("type"),
                "name": p.get("name"),
                "category": p.get("category"),
                "description": p.get("description"),
                "trigger": p.get("trigger"),
                "requiredConfig": [
                    f.get("key")
                    for f in (p.get("configSchema") or [])
                    if f.get("required")
                ],
            }
            for p in plugins
        ]
        return _ok(compact)
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.tool()
def get_plugin_schema(plugin_type: str) -> str:
    """
    Get required and optional configuration fields for one plugin type.
    Example plugin_type values: FILE_UPLOAD, CSV_TRANSFORM, DB_INSERT, KAFKA_PUBLISH.
    """
    try:
        plugin = client.get_plugin_by_type(plugin_type)
        if plugin is None:
            return _err(f"Unknown plugin type: {plugin_type}")
        return _ok(extract_plugin_schema(plugin))
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.tool()
def validate_workflow_config(workflow_json: str) -> str:
    """
    Validate workflow JSON before create or update.
    Returns validation errors for missing workflow fields or required plugin config.
    """
    try:
        workflow = normalize_workflow(parse_workflow_json(workflow_json))
        plugins = client.list_plugins()
        errors = validate_workflow_structure(workflow, plugins)
        if errors:
            return _ok({"valid": False, "errors": errors})
        return _ok({"valid": True, "message": "Workflow configuration is valid"})
    except (ValueError, NexiClientError) as exc:
        return _err(str(exc))


@mcp.tool()
def create_workflow(workflow_json: str) -> str:
    """
    Create a new NexiConnectX workflow.

    workflow_json must be a JSON object with:
    - code, name, status (DRAFT or ACTIVE), triggerNodeKey
    - nodes: list of {nodeKey, label, pluginType, configJson, positionX, positionY}
    - edges: list of {sourceNodeKey, targetNodeKey}

    Before creating:
    1. Call list_plugins or get_plugin_schema for each plugin type
    2. Ensure required config fields are set in each node's configJson
    3. Optionally call validate_workflow_config first
    """
    try:
        workflow = normalize_workflow(parse_workflow_json(workflow_json))
        plugins = client.list_plugins()
        errors = validate_workflow_structure(workflow, plugins)
        if errors:
            return _ok({"created": False, "validationErrors": errors})

        created = client.create_workflow(workflow)
        return _ok({"created": True, "workflow": created})
    except (ValueError, NexiClientError) as exc:
        return _err(str(exc))


@mcp.tool()
def update_workflow(workflow_id: int, workflow_json: str) -> str:
    """
    Update an existing NexiConnectX workflow by id.
    Send the full workflow JSON (same shape as create_workflow).
    """
    try:
        workflow = normalize_workflow(parse_workflow_json(workflow_json))
        plugins = client.list_plugins()
        errors = validate_workflow_structure(workflow, plugins)
        if errors:
            return _ok({"updated": False, "validationErrors": errors})

        updated = client.update_workflow(workflow_id, workflow)
        return _ok({"updated": True, "workflow": updated})
    except (ValueError, NexiClientError) as exc:
        return _err(str(exc))


@mcp.tool()
def activate_workflow(workflow_id: int) -> str:
    """Activate a workflow and deploy its Camel route."""
    try:
        result = client.activate_workflow(workflow_id)
        return _ok({"activated": True, "workflow": result})
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.tool()
def run_workflow(workflow_id: int) -> str:
    """Run a workflow immediately (no ACTIVE status required)."""
    try:
        result = client.run_workflow(workflow_id)
        return _ok({"ran": True, "result": result})
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.tool()
def delete_workflow(workflow_id: int) -> str:
    """
    Delete a workflow by id. Works for DRAFT, ACTIVE, or INACTIVE workflows.
    Use list_workflows to find the id. DRAFT workflows are safe to delete.
    """
    try:
        workflow = client.get_workflow(workflow_id)
        client.delete_workflow(workflow_id)
        return _ok({
            "deleted": True,
            "workflowId": workflow_id,
            "code": workflow.get("code"),
            "name": workflow.get("name"),
            "status": workflow.get("status"),
        })
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.tool()
def check_workflow_files(
    workflow_id: int,
    file_name: str | None = None,
    folder: str | None = None,
) -> str:
    """
    Check workflow file folders and optionally verify a file exists.

    For workflows with FILE_UPLOAD, folders are created under ./workflows/{workflowCode}/:
    - upload   — incoming files to process
    - prompts  — workflow prompt files
    - error    — files that failed processing

    Args:
        workflow_id: Workflow id from list_workflows.
        file_name: Optional file name to check (e.g. emp.csv).
        folder: Optional folder to search — upload, prompts, or error.
                If omitted with file_name, searches all workflow folders.
    """
    try:
        result = client.check_workflow_files(workflow_id, file_name=file_name, folder=folder)
        return _ok(result)
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.resource("nexi://plugins")
def plugins_resource() -> str:
    """Read-only plugin catalog for NexiConnectX workflow builder."""
    try:
        return _ok(client.list_plugins())
    except NexiClientError as exc:
        return _err(str(exc))


@mcp.resource("nexi://workflows/summary")
def workflows_summary_resource() -> str:
    """Compact summary of all workflow definitions."""
    try:
        return _ok(summarize_workflows(client.list_workflows()))
    except NexiClientError as exc:
        return _err(str(exc))


if __name__ == "__main__":
    if not os.getenv("NEXI_API_URL"):
        os.environ.setdefault("NEXI_API_URL", "http://localhost:8080")
    mcp.run(transport="stdio")
