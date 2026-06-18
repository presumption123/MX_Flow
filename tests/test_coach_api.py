"""API tests for /api/coach."""

import os

from fastapi.testclient import TestClient

from server.main import app

client = TestClient(app)


def test_health_without_api_key():
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ok"
    assert data["coach"] is False


def test_coach_503_without_api_key():
    old = os.environ.pop("ANTHROPIC_API_KEY", None)
    try:
        r = client.post(
            "/api/coach",
            json={
                "round": {
                    "schemaVersion": 1,
                    "id": "t1",
                    "partners": [
                        {"id": "partner-1", "name": "A", "sheets": []},
                        {"id": "partner-2", "name": "B", "sheets": []},
                    ],
                    "settings": {"side": "aff"},
                    "activePartnerId": "partner-1",
                },
                "message": "hello",
            },
        )
        assert r.status_code == 503
    finally:
        if old:
            os.environ["ANTHROPIC_API_KEY"] = old


def test_static_index_served():
    r = client.get("/")
    assert r.status_code == 200
    assert "MX Flow" in r.text
