"""HTTP client for NexiConnectX workflow REST API."""

from __future__ import annotations

import json
import os
from typing import Any

import httpx

DEFAULT_BASE_URL = "http://localhost:8080"
TIMEOUT_SECONDS = 120.0


class NexiClientError(Exception):
    """Raised when NexiConnectX API returns an error."""

    def __init__(self, message: str, status_code: int | None = None, body: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.body = body


class NexiClient:
    def __init__(self, base_url: str | None = None):
        self.base_url = (base_url or os.getenv("NEXI_API_URL") or DEFAULT_BASE_URL).rstrip("/")

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        try:
            with httpx.Client(timeout=TIMEOUT_SECONDS) as client:
                response = client.request(method, self._url(path), **kwargs)
        except httpx.ConnectError as exc:
            raise NexiClientError(
                f"Cannot connect to NexiConnectX at {self.base_url}. "
                "Start the backend with: cd backend && mvn spring-boot:run"
            ) from exc
        except httpx.HTTPError as exc:
            raise NexiClientError(f"HTTP error calling NexiConnectX: {exc}") from exc

        if response.status_code >= 400:
            body = response.text
            raise NexiClientError(
                f"NexiConnectX API error {response.status_code} for {method} {path}: {body}",
                status_code=response.status_code,
                body=body,
            )

        if not response.content:
            return None
        return response.json()

    def health(self) -> dict[str, Any]:
        return self._request("GET", "/api/dashboard/health")

    def list_workflows(self) -> list[dict[str, Any]]:
        result = self._request("GET", "/api/workflow-definitions")
        return result if isinstance(result, list) else []

    def get_workflow(self, workflow_id: int) -> dict[str, Any]:
        return self._request("GET", f"/api/workflow-definitions/{workflow_id}")

    def list_plugins(self) -> list[dict[str, Any]]:
        result = self._request("GET", "/api/workflow-definitions/plugins")
        return result if isinstance(result, list) else []

    def create_workflow(self, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("POST", "/api/workflow-definitions", json=payload)

    def update_workflow(self, workflow_id: int, payload: dict[str, Any]) -> dict[str, Any]:
        return self._request("PUT", f"/api/workflow-definitions/{workflow_id}", json=payload)

    def activate_workflow(self, workflow_id: int) -> dict[str, Any]:
        return self._request("POST", f"/api/workflow-definitions/{workflow_id}/activate")

    def run_workflow(self, workflow_id: int) -> dict[str, Any]:
        return self._request("POST", f"/api/workflow-definitions/{workflow_id}/run")

    def delete_workflow(self, workflow_id: int) -> None:
        self._request("DELETE", f"/api/workflow-definitions/{workflow_id}")

    def check_workflow_files(
        self,
        workflow_id: int,
        file_name: str | None = None,
        folder: str | None = None,
    ) -> dict[str, Any]:
        params: dict[str, str] = {}
        if file_name:
            params["fileName"] = file_name
        if folder:
            params["folder"] = folder
        return self._request("GET", f"/api/workflow-definitions/{workflow_id}/files", params=params)

    def get_plugin_by_type(self, plugin_type: str) -> dict[str, Any] | None:
        normalized = plugin_type.strip().upper()
        for plugin in self.list_plugins():
            if str(plugin.get("type", "")).upper() == normalized:
                return plugin
        return None

    @staticmethod
    def pretty_json(data: Any) -> str:
        return json.dumps(data, indent=2, default=str)
