import { DashboardSummary, DocumentItem, RecordDetail, LandRecord } from '../types';

const API_BASE = '/api';

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await fetch(`${API_BASE}/dashboard/summary`);
  if (!res.ok) throw new Error('Failed to fetch dashboard summary');
  return res.json();
}

export async function fetchAllDocuments(): Promise<DocumentItem[]> {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error('Failed to fetch documents');
  return res.json();
}

export async function uploadDocument(file: File): Promise<DocumentItem> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/documents`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Document upload failed');
  return res.json();
}

export async function processDocument(id: number, language: string = 'en'): Promise<RecordDetail> {
  const res = await fetch(`${API_BASE}/documents/${id}/process?language=${encodeURIComponent(language)}`, {
    method: 'POST',
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Document processing failed');
  }
  return res.json();
}

export async function fetchRecordDetail(docOrRecordId: number): Promise<RecordDetail> {
  const res = await fetch(`${API_BASE}/records/document/${docOrRecordId}`);
  if (!res.ok) {
    const fallback = await fetch(`${API_BASE}/records/${docOrRecordId}`);
    if (!fallback.ok) throw new Error('Failed to fetch record detail');
    return fallback.json();
  }
  return res.json();
}

export async function verifyRecord(
  recordId: number,
  corrections: Record<string, string>,
  verifiedBy: string = 'Revenue Officer (Demo)'
): Promise<RecordDetail> {
  const res = await fetch(`${API_BASE}/records/${recordId}/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      verifiedBy,
      correctedFields: corrections,
      remarks: 'Human verified and corrected via BhoomiX interface',
    }),
  });
  if (!res.ok) throw new Error('Verification submission failed');
  return res.json();
}

export async function fetchPendingVerifications(): Promise<LandRecord[]> {
  const res = await fetch(`${API_BASE}/verification/pending`);
  if (!res.ok) throw new Error('Failed to fetch pending verifications');
  return res.json();
}
