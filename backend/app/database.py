from contextlib import contextmanager

import psycopg
from psycopg.rows import dict_row

from .config import settings


@contextmanager
def connection():
    db = psycopg.connect(settings.database_url, row_factory=dict_row)
    try:
        yield db
        db.commit()
    finally:
        db.close()


def init_db() -> None:
    with connection() as db:
        db.execute(
            """
            CREATE EXTENSION IF NOT EXISTS postgis;
            CREATE TABLE IF NOT EXISTS documents (
                id BIGSERIAL PRIMARY KEY,
                original_filename TEXT NOT NULL,
                stored_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'UPLOADED',
                uploaded_at TEXT NOT NULL,
                processed_image_path TEXT
            );
            CREATE TABLE IF NOT EXISTS land_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER NOT NULL UNIQUE,
                owner_name TEXT NOT NULL,
                survey_number TEXT NOT NULL,
                khata_number TEXT NOT NULL,
                area TEXT NOT NULL,
                village TEXT NOT NULL,
                district TEXT NOT NULL,
                total_area_acres DOUBLE PRECISION NOT NULL DEFAULT 0,
                geometry JSONB,
                verification_status TEXT NOT NULL DEFAULT 'PENDING',
                rci DOUBLE PRECISION NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(document_id) REFERENCES documents(id)
            );
            CREATE TABLE IF NOT EXISTS field_confidences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                value TEXT NOT NULL,
                confidence DOUBLE PRECISION NOT NULL,
                status TEXT NOT NULL,
                source_text TEXT,
                FOREIGN KEY(record_id) REFERENCES land_records(id)
            );
            CREATE TABLE IF NOT EXISTS validation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                status TEXT NOT NULL,
                message TEXT NOT NULL,
                FOREIGN KEY(record_id) REFERENCES land_records(id)
            );
            CREATE TABLE IF NOT EXISTS verification_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                record_id INTEGER NOT NULL,
                field_name TEXT NOT NULL,
                ai_value TEXT NOT NULL,
                corrected_value TEXT NOT NULL,
                confidence DOUBLE PRECISION NOT NULL,
                verified_by TEXT NOT NULL,
                verified_at TEXT NOT NULL,
                FOREIGN KEY(record_id) REFERENCES land_records(id)
            );
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                document_id INTEGER,
                event_type TEXT NOT NULL,
                message TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            """
        )
