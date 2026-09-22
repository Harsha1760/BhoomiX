import os

import psycopg
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings


def test_upload_process_and_verify(tmp_path, monkeypatch):
    monkeypatch.setattr("app.config.settings.storage_dir", tmp_path / "uploads")
    database_url = os.getenv("TEST_DATABASE_URL", settings.database_url)
    try:
        with psycopg.connect(database_url) as db:
            db.execute("SELECT 1")
    except psycopg.Error as error:
        pytest.skip(f"PostgreSQL is not available: {error}")
    monkeypatch.setattr("app.config.settings.database_url", database_url)
    with TestClient(app) as client:
        response = client.post("/api/documents", files={"file": ("record.png", b"synthetic land scan", "image/png")})
        assert response.status_code == 200
        document_id = response.json()["id"]
        processed = client.post(f"/api/documents/{document_id}/process?language=te")
        assert processed.status_code == 200
        record_id = processed.json()["landRecord"]["id"]
        assert processed.json()["landRecord"]["verificationStatus"] == "PENDING"
        verified = client.post(f"/api/records/{record_id}/verify", json={"verifiedBy": "Officer", "correctedFields": {"owner_name": "Ravi Kumar"}})
        assert verified.status_code == 200
        assert verified.json()["landRecord"]["verificationStatus"] == "VERIFIED"
