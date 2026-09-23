import json
import re
from datetime import datetime, timezone
from pathlib import Path

import httpx
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .config import settings
from .database import connection, init_db
from .extraction import FIELDS, extract_document
from .schemas import ChatRequest, ChatResponse, VerificationRequest
from .validation import validate_extraction

app = FastAPI(title=settings.app_name, version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def document_dict(row) -> dict:
    return {"id": row["id"], "originalFilename": row["original_filename"], "storedPath": row["stored_path"], "fileType": row["file_type"], "processedImagePath": row["processed_image_path"], "status": row["status"], "uploadedAt": row["uploaded_at"]}


def record_detail(record_id: int) -> dict:
    with connection() as db:
        record = db.execute("SELECT * FROM land_records WHERE id = %s", (record_id,)).fetchone()
        if not record:
            raise HTTPException(404, "Land record not found")
        document = db.execute("SELECT * FROM documents WHERE id = %s", (record["document_id"],)).fetchone()
        confidences = db.execute("SELECT * FROM field_confidences WHERE record_id = %s", (record_id,)).fetchall()
        validations = db.execute("SELECT * FROM validation_results WHERE record_id = %s ORDER BY id", (record_id,)).fetchall()
        history = db.execute("SELECT * FROM verification_history WHERE record_id = %s ORDER BY id DESC", (record_id,)).fetchall()
    return {
        "document": document_dict(document),
        "landRecord": {"id": record["id"], "documentId": record["document_id"], "ownerName": record["owner_name"], "surveyNumber": record["survey_number"], "khataNumber": record["khata_number"], "area": record["area"], "village": record["village"], "district": record["district"], "verificationStatus": record["verification_status"], "createdAt": record["created_at"], "updatedAt": record["updated_at"], "rci": record["rci"]},
        "fieldConfidences": {row["field_name"]: {"fieldName": row["field_name"], "value": row["value"], "confidence": row["confidence"], "status": row["status"], "sourceText": row["source_text"]} for row in confidences},
        "validationResults": [{"id": row["id"], "fieldName": row["field_name"], "status": row["status"], "message": row["message"]} for row in validations],
        "verificationHistory": [{"id": row["id"], "fieldName": row["field_name"], "aiValue": row["ai_value"], "correctedValue": row["corrected_value"], "confidence": row["confidence"], "verifiedBy": row["verified_by"], "verifiedAt": row["verified_at"]} for row in history],
    }


@app.on_event("startup")
def startup():
    init_db()


@app.get("/health")
def health():
    return {"status": "ok", "service": settings.app_name}


@app.post("/api/documents")
async def upload_document(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix not in {".pdf", ".png", ".jpg", ".jpeg"}:
        raise HTTPException(415, "Only PDF, PNG, JPG, and JPEG files are supported.")
    safe_name = re.sub(r"[^A-Za-z0-9._-]", "_", file.filename or "document")
    path = settings.storage_dir / f"{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S%f')}_{safe_name}"
    path.parent.mkdir(parents=True, exist_ok=True)
    size = 0
    with path.open("wb") as output:
        while chunk := await file.read(1024 * 1024):
            size += len(chunk)
            if size > settings.max_upload_size_mb * 1024 * 1024:
                path.unlink(missing_ok=True)
                raise HTTPException(413, f"File exceeds {settings.max_upload_size_mb} MB limit.")
            output.write(chunk)
    with connection() as db:
        cursor = db.execute("INSERT INTO documents (original_filename, stored_path, file_type, uploaded_at) VALUES (%s, %s, %s, %s) RETURNING id", (file.filename, str(path), suffix, now()))
        document_id = cursor.fetchone()["id"]
        db.execute("INSERT INTO audit_logs (document_id, event_type, message, created_at) VALUES (%s, %s, %s, %s)", (document_id, "UPLOAD", "Document uploaded for extraction.", now()))
        row = db.execute("SELECT * FROM documents WHERE id = %s", (document_id,)).fetchone()
    return document_dict(row)


@app.get("/api/documents")
def list_documents():
    with connection() as db:
        rows = db.execute("SELECT * FROM documents ORDER BY id DESC").fetchall()
    return [document_dict(row) for row in rows]


@app.post("/api/documents/{document_id}/process")
async def process_document(document_id: int, language: str = "en"):
    with connection() as db:
        document = db.execute("SELECT * FROM documents WHERE id = %s", (document_id,)).fetchone()
        if not document:
            raise HTTPException(404, "Document not found")
        db.execute("UPDATE documents SET status = 'PROCESSING' WHERE id = %s", (document_id,))
    data = await extract_document(Path(document["stored_path"]), language)
    validations, rci = validate_extraction(data)
    status = "EXTRACTED" if all(item["status"] == "PASS" for item in validations) and rci >= settings.validation_confidence_threshold else "NEEDS_REVIEW"
    timestamp = now()
    with connection() as db:
        db.execute("UPDATE documents SET status = %s WHERE id = %s", (status, document_id))
        db.execute("INSERT INTO land_records (document_id, owner_name, survey_number, khata_number, area, village, district, total_area_acres, geometry, verification_status, rci, created_at, updated_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, 'PENDING', %s, %s, %s) RETURNING id", (document_id, data.get("owner_name", ""), data.get("survey_number", ""), data.get("khata_number", ""), data.get("area", ""), data.get("village", ""), data.get("district", ""), data.get("total_area_acres", 0), json.dumps(data.get("geometry")) if data.get("geometry") else None, rci, timestamp, timestamp))
        record_id = db.execute("SELECT id FROM land_records WHERE document_id = %s", (document_id,)).fetchone()["id"]
        for field in FIELDS:
            item = data.get("confidences", {}).get(field, {})
            confidence = float(item.get("confidence", 0))
            db.execute("INSERT INTO field_confidences (record_id, field_name, value, confidence, status, source_text) VALUES (%s, %s, %s, %s, %s, %s)", (record_id, field, str(data.get(field, "")), confidence, "PASS" if confidence >= settings.validation_confidence_threshold else "WARNING", item.get("source_text")))
        for item in validations:
            db.execute("INSERT INTO validation_results (record_id, field_name, status, message) VALUES (%s, %s, %s, %s)", (record_id, item["field_name"], item["status"], item["message"]))
        db.execute("INSERT INTO audit_logs (document_id, event_type, message, created_at) VALUES (%s, %s, %s, %s)", (document_id, "PROCESS", f"Extraction completed with RCI {rci:.2f}.", timestamp))
    return record_detail(record_id)


@app.get("/api/records/document/{document_id}")
def get_record_by_document(document_id: int):
    with connection() as db:
        row = db.execute("SELECT id FROM land_records WHERE document_id = %s", (document_id,)).fetchone()
    if not row:
        raise HTTPException(404, "Record not found")
    return record_detail(row["id"])


@app.get("/api/records/{record_id}")
def get_record(record_id: int):
    return record_detail(record_id)


@app.post("/api/records/{record_id}/verify")
def verify_record(record_id: int, request: VerificationRequest):
    detail = record_detail(record_id)
    field_map = {"owner_name": "owner_name", "survey_number": "survey_number", "khata_number": "khata_number", "area": "area", "village": "village", "district": "district"}
    with connection() as db:
        for field, corrected in request.correctedFields.items():
            if field not in field_map:
                continue
            current = db.execute(f"SELECT {field_map[field]} FROM land_records WHERE id = %s", (record_id,)).fetchone()[field_map[field]]
            confidence = db.execute("SELECT confidence FROM field_confidences WHERE record_id = %s AND field_name = %s", (record_id, field)).fetchone()
            db.execute(f"UPDATE land_records SET {field_map[field]} = %s, updated_at = %s WHERE id = %s", (corrected, now(), record_id))
            db.execute("INSERT INTO verification_history (record_id, field_name, ai_value, corrected_value, confidence, verified_by, verified_at) VALUES (%s, %s, %s, %s, %s, %s, %s)", (record_id, field, current, corrected, confidence["confidence"] if confidence else 0, request.verifiedBy, now()))
        db.execute("UPDATE land_records SET verification_status = 'VERIFIED', updated_at = %s WHERE id = %s", (now(), record_id))
        db.execute("UPDATE documents SET status = 'VERIFIED' WHERE id = (SELECT document_id FROM land_records WHERE id = %s)", (record_id,))
    return record_detail(record_id)


@app.get("/api/verification/pending")
def pending_verification():
    with connection() as db:
        rows = db.execute("SELECT * FROM land_records WHERE verification_status = 'PENDING' ORDER BY id DESC").fetchall()
    return [{"id": row["id"], "documentId": row["document_id"], "ownerName": row["owner_name"], "surveyNumber": row["survey_number"], "khataNumber": row["khata_number"], "area": row["area"], "village": row["village"], "district": row["district"], "verificationStatus": row["verification_status"], "createdAt": row["created_at"], "updatedAt": row["updated_at"]} for row in rows]


@app.get("/api/records/{record_id}/validation-report")
def validation_report(record_id: int):
    detail = record_detail(record_id)
    failures = [item for item in detail["validationResults"] if item["status"] != "PASS"]
    return {"recordId": record_id, "rci": detail["landRecord"]["rci"], "status": "PASS" if not failures else "NEEDS_REVIEW", "failures": failures, "generatedAt": now()}


@app.get("/api/documents/{document_id}/audit")
def document_audit(document_id: int):
    with connection() as db:
        rows = db.execute("SELECT event_type, message, created_at FROM audit_logs WHERE document_id = %s ORDER BY id", (document_id,)).fetchall()
    return [{"eventType": row["event_type"], "message": row["message"], "createdAt": row["created_at"]} for row in rows]


@app.get("/api/dashboard/summary")
def dashboard_summary():
    with connection() as db:
        total = db.execute("SELECT COUNT(*) AS count FROM documents").fetchone()["count"]
        verified = db.execute("SELECT COUNT(*) AS count FROM land_records WHERE verification_status = 'VERIFIED'").fetchone()["count"]
        pending = db.execute("SELECT COUNT(*) AS count FROM land_records WHERE verification_status = 'PENDING'").fetchone()["count"]
        warnings = db.execute("SELECT COUNT(DISTINCT record_id) AS count FROM validation_results WHERE status != 'PASS'").fetchone()["count"]
    return {"totalDocuments": total, "verifiedRecords": verified, "pendingVerification": pending, "documentsWithWarnings": warnings}


@app.get("/api/gis/plots")
def gis_plots():
    with connection() as db:
        rows = db.execute("SELECT id, survey_number, owner_name, village, district, geometry FROM land_records WHERE geometry IS NOT NULL").fetchall()
    return {"type": "FeatureCollection", "features": [{"type": "Feature", "id": row["id"], "geometry": row["geometry"] if isinstance(row["geometry"], dict) else json.loads(row["geometry"]), "properties": {"surveyNumber": row["survey_number"], "ownerName": row["owner_name"], "village": row["village"], "district": row["district"]}} for row in rows]}


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    if settings.gemma_api_url:
        headers = {"Authorization": f"Bearer {settings.gemma_api_key}"} if settings.gemma_api_key else {}
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(settings.gemma_api_url, json={"model": settings.gemma_model, "messages": [{"role": "user", "content": request.message}]}, headers=headers)
            response.raise_for_status()
            return ChatResponse(answer=response.json()["choices"][0]["message"]["content"], sources=["Gemma 2"], confidence=0.8)
    with connection() as db:
        query = "%" + request.message.lower() + "%"
        row = db.execute("SELECT * FROM land_records WHERE lower(owner_name) LIKE %s OR lower(survey_number) LIKE %s OR lower(village) LIKE %s LIMIT 1", (query, query, query)).fetchone()
    if row:
        return ChatResponse(answer=f"Survey {row['survey_number']} belongs to {row['owner_name']} in {row['village']}, {row['district']}. Reported area: {row['area']}.", sources=[f"Land record #{row['id']}"], confidence=0.9)
    return ChatResponse(answer="I could not find a matching land record. Try a survey number, owner name, or village.", sources=[], confidence=0.35)


@app.get("/files/{kind}/{filename}")
def serve_file(kind: str, filename: str):
    if kind not in {"raw", "processed"}:
        raise HTTPException(404, "File kind not found")
    matches = list(settings.storage_dir.glob(f"*_{filename}"))
    if not matches:
        matches = [settings.storage_dir / filename]
    path = matches[0]
    if not path.is_file() or path.resolve().parent != settings.storage_dir.resolve():
        raise HTTPException(404, "File not found")
    return FileResponse(path)
