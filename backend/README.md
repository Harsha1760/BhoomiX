# BhoomiX FastAPI backend

## Run locally

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

The backend uses PostgreSQL with PostGIS enabled. Run `docker compose up -d postgis` to provision the local database, then set `DATABASE_URL`, `QWEN_API_URL`, and `GEMMA_API_URL` in `.env`.

OpenAPI is available at `http://localhost:8080/docs`.

Important routes include `POST /api/documents`, `POST /api/documents/{id}/process`, `GET /api/records/document/{id}`, `POST /api/records/{id}/verify`, `GET /api/gis/plots`, `GET /api/records/{id}/validation-report`, `GET /api/documents/{id}/audit`, and `POST /api/chat`.
