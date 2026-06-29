"""Workflow validation and helper utilities for MCP tools."""

from __future__ import annotations

import json
import re
from typing import Any

VALID_STATUSES = {"DRAFT", "ACTIVE", "INACTIVE", "ARCHIVED"}


def parse_workflow_json(workflow_json: str | dict[str, Any]) -> dict[str, Any]:
    if isinstance(workflow_json, dict):
        return workflow_json
    try:
        parsed = json.loads(workflow_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"workflow_json is not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("workflow_json must be a JSON object")
    return parsed


def parse_node_config(config_json: str | dict[str, Any] | None) -> dict[str, Any]:
    if config_json is None or config_json == "":
        return {}
    if isinstance(config_json, dict):
        return config_json
    try:
        parsed = json.loads(config_json)
    except json.JSONDecodeError as exc:
        raise ValueError(f"configJson is not valid JSON: {exc}") from exc
    if not isinstance(parsed, dict):
        raise ValueError("configJson must be a JSON object")
    return parsed


def normalize_workflow(payload: dict[str, Any]) -> dict[str, Any]:
    workflow = dict(payload)
    for field in ("code", "name", "description", "triggerNodeKey", "status"):
        if field in workflow and workflow[field] is not None:
            workflow[field] = str(workflow[field]).strip()

    if workflow.get("status"):
        workflow["status"] = workflow["status"].upper()

    nodes = workflow.get("nodes") or []
    edges = workflow.get("edges") or []
    normalized_nodes: list[dict[str, Any]] = []

    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            raise ValueError(f"Node at index {index} must be an object")
        normalized = dict(node)
        for field in ("nodeKey", "label"):
            if field in normalized and normalized[field] is not None:
                normalized[field] = str(normalized[field]).strip()
        if normalized.get("pluginType"):
            normalized["pluginType"] = str(normalized["pluginType"]).strip().upper()

        config_dict = parse_node_config(normalized.get("configJson", "{}"))
        normalized["configJson"] = json.dumps(config_dict)

        if normalized.get("positionX") is None:
            normalized["positionX"] = 80 + index * 200
        if normalized.get("positionY") is None:
            normalized["positionY"] = 120

        normalized_nodes.append(normalized)

    normalized_edges: list[dict[str, Any]] = []
    for index, edge in enumerate(edges):
        if not isinstance(edge, dict):
            raise ValueError(f"Edge at index {index} must be an object")
        normalized = dict(edge)
        for field in ("sourceNodeKey", "targetNodeKey", "conditionExpression"):
            if field in normalized and normalized[field] is not None:
                normalized[field] = str(normalized[field]).strip()
        normalized_edges.append(normalized)

    workflow["nodes"] = normalized_nodes
    workflow["edges"] = normalized_edges

    if not workflow.get("triggerNodeKey") and normalized_nodes:
        workflow["triggerNodeKey"] = normalized_nodes[0]["nodeKey"]

    return workflow


def validate_workflow_structure(workflow: dict[str, Any], plugins: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []

    for field in ("code", "name", "status", "triggerNodeKey", "nodes", "edges"):
        if not workflow.get(field):
            errors.append(f"Missing required workflow field: {field}")

    status = workflow.get("status")
    if status and status not in VALID_STATUSES:
        errors.append(f"Invalid status '{status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}")

    code = workflow.get("code", "")
    if code and not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", code):
        errors.append(
            f"Workflow code '{code}' should use lowercase letters, numbers, and dashes only"
        )

    nodes = workflow.get("nodes") or []
    edges = workflow.get("edges") or []

    if not nodes:
        errors.append("Workflow must contain at least one node")

    plugin_map = {str(p.get("type", "")).upper(): p for p in plugins}
    node_keys: set[str] = set()

    for node in nodes:
        node_key = node.get("nodeKey")
        plugin_type = str(node.get("pluginType", "")).upper()
        label = node.get("label") or node_key or "unknown"

        if not node_key:
            errors.append("Each node must have nodeKey")
            continue

        if node_key in node_keys:
            errors.append(f"Duplicate nodeKey: {node_key}")
        node_keys.add(node_key)

        if not plugin_type:
            errors.append(f"Node {node_key} ({label}) is missing pluginType")
            continue

        if plugin_type not in plugin_map:
            errors.append(f"Node {node_key} ({label}) has unknown pluginType: {plugin_type}")
            continue

        errors.extend(validate_node_config(node, plugin_map[plugin_type]))

    trigger = workflow.get("triggerNodeKey")
    if trigger and trigger not in node_keys:
        errors.append(f"triggerNodeKey '{trigger}' does not match any node")

    for edge in edges:
        source = edge.get("sourceNodeKey")
        target = edge.get("targetNodeKey")
        if not source or not target:
            errors.append("Each edge must have sourceNodeKey and targetNodeKey")
            continue
        if source not in node_keys:
            errors.append(f"Edge source '{source}' does not match any node")
        if target not in node_keys:
            errors.append(f"Edge target '{target}' does not match any node")

    return errors


def validate_node_config(node: dict[str, Any], plugin: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    node_key = node.get("nodeKey", "?")
    label = node.get("label", node_key)

    try:
        config = parse_node_config(node.get("configJson", "{}"))
    except ValueError as exc:
        return [f"Node {node_key} ({label}): {exc}"]

    schema = plugin.get("configSchema") or []
    for field in schema:
        if not field.get("required"):
            continue
        key = field.get("key")
        if not key:
            continue
        value = config.get(key)
        if value is None or (isinstance(value, str) and not value.strip()):
            errors.append(
                f"Node {node_key} ({label}, {plugin.get('type')}): "
                f"missing required config '{key}' ({field.get('label', key)})"
            )

    return errors


def extract_plugin_schema(plugin: dict[str, Any]) -> dict[str, Any]:
    schema = plugin.get("configSchema") or []
    required_fields = []
    optional_fields = []

    for field in schema:
        entry = {
            "key": field.get("key"),
            "label": field.get("label"),
            "type": field.get("type"),
            "defaultValue": field.get("defaultValue"),
            "options": field.get("options"),
            "placeholder": field.get("placeholder"),
        }
        if field.get("required"):
            required_fields.append(entry)
        else:
            optional_fields.append(entry)

    return {
        "pluginType": plugin.get("type"),
        "name": plugin.get("name"),
        "category": plugin.get("category"),
        "description": plugin.get("description"),
        "trigger": plugin.get("trigger"),
        "requiredFields": required_fields,
        "optionalFields": optional_fields,
    }


def summarize_workflows(workflows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "id": wf.get("id"),
            "code": wf.get("code"),
            "name": wf.get("name"),
            "status": wf.get("status"),
            "description": wf.get("description"),
            "triggerNodeKey": wf.get("triggerNodeKey"),
            "nodeCount": len(wf.get("nodes") or []),
        }
        for wf in workflows
    ]
