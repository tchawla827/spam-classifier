"""Tests for GET /api/v1/health."""

import pytest


@pytest.mark.anyio
async def test_health_returns_200(client):
    response = await client.get("/api/v1/health")
    assert response.status_code == 200


@pytest.mark.anyio
async def test_health_response_shape(client):
    response = await client.get("/api/v1/health")
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
