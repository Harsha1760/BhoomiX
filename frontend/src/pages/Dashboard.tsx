import React, { useEffect, useState } from 'react';
import { DashboardSummary, DocumentItem } from '../types';
import { fetchDashboardSummary, fetchAllDocuments } from '../services/api';
import { FileText, CheckCircle2, Clock, AlertTriangle, ArrowRight, RefreshCw, Upload } from 'lucide-react';

interface DashboardProps {
  onSelectDocument: (docId: number) => void;
  onNavigateUpload: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectDocument, onNavigateUpload }) => {
  const [summary, setSummary] = useState<DashboardSummary>({
    totalDocuments: 0,
    verifiedRecords: 0,
    pendingVerification: 0,
    documentsWithWarnings: 0,
  });
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sumData, docsData] = await Promise.all([
        fetchDashboardSummary(),
        fetchAllDocuments(),
      ]);
      setSummary(sumData);
      setDocuments(docsData);
    } catch (err: any) {
      setError('Unable to load dashboard data. Ensure Spring Boot backend is active on port 8080.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return <span className="badge badge-success"><CheckCircle2 size={12} /> Verified</span>;
      case 'NEEDS_REVIEW':
        return <span className="badge badge-warning"><AlertTriangle size={12} /> Needs Review</span>;
      case 'EXTRACTED':
        return <span className="badge badge-info">Extracted</span>;
      case 'PROCESSING':
        return <span className="badge badge-info"><RefreshCw size={12} className="animate-spin" /> Processing</span>;
      case 'FAILED':
        return <span className="badge badge-error">Failed</span>;
      default:
        return <span className="badge badge-gray">{status}</span>;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a' }}>Land Record Digitization Dashboard</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            SIH26018 Intelligent Digitization, Extraction, and Verification
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={loadData} disabled={loading}>
            <RefreshCw size={16} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={onNavigateUpload}>
            <Upload size={16} /> Upload New Deed
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-banner">
          {error}
        </div>
      )}

      {/* Real Summary Counters (0 if empty) */}
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Documents Processed</span>
            <FileText size={20} color="#64748b" />
          </div>
          <span className="stat-value">{summary.totalDocuments}</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Verified Records</span>
            <CheckCircle2 size={20} color="#15803d" />
          </div>
          <span className="stat-value" style={{ color: '#15803d' }}>{summary.verifiedRecords}</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Pending Verification</span>
            <Clock size={20} color="#d97706" />
          </div>
          <span className="stat-value" style={{ color: '#d97706' }}>{summary.pendingVerification}</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-label">Documents with Warnings</span>
            <AlertTriangle size={20} color="#b91c1c" />
          </div>
          <span className="stat-value" style={{ color: '#b91c1c' }}>{summary.documentsWithWarnings}</span>
        </div>
      </div>

      {/* Documents Table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 600 }}>Recent Land Record Documents</h2>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total: {documents.length}</span>
        </div>

        {documents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
            <FileText size={48} color="#cbd5e1" style={{ margin: '0 auto 1rem' }} />
            <p style={{ fontWeight: 500 }}>No documents uploaded yet.</p>
            <p style={{ fontSize: '0.85rem', marginTop: 4 }}>Upload a synthetic test deed (PDF or PNG) to begin digitization.</p>
            <button className="btn btn-primary" onClick={onNavigateUpload} style={{ marginTop: '1rem' }}>
              Upload First Document
            </button>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Doc ID</th>
                  <th>Filename</th>
                  <th>Format</th>
                  <th>Uploaded At</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td style={{ fontWeight: 600 }}>#{doc.id}</td>
                    <td>{doc.originalFilename}</td>
                    <td><span className="badge badge-gray">{doc.fileType.toUpperCase().replace('.', '')}</span></td>
                    <td style={{ color: '#64748b' }}>{new Date(doc.uploadedAt).toLocaleString()}</td>
                    <td>{getStatusBadge(doc.status)}</td>
                    <td>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => onSelectDocument(doc.id)}
                      >
                        Review / Verify <ArrowRight size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
