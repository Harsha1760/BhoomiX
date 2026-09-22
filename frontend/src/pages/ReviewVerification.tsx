import React, { useEffect, useState } from 'react';
import { RecordDetail } from '../types';
import { fetchRecordDetail, verifyRecord } from '../services/api';
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  ZoomIn,
  Shield,
  History,
  Save,
  Check,
  Edit2
} from 'lucide-react';

interface ReviewVerificationProps {
  documentId: number;
  onBack: () => void;
  onRecordVerified: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  owner_name: 'Landowner Name',
  survey_number: 'Survey Number',
  khata_number: 'Khata Number',
  area: 'Parcel Area / Extent',
  village: 'Village (గ్రామం)',
  district: 'District (జిల్లా)',
};

export const ReviewVerification: React.FC<ReviewVerificationProps> = ({
  documentId,
  onBack,
  onRecordVerified,
}) => {
  const [recordDetail, setRecordDetail] = useState<RecordDetail | null>(null);
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});
  const [activeEditing, setActiveEditing] = useState<Record<string, boolean>>({});
  const [officerName, setOfficerName] = useState<string>('Revenue Officer (Demo)');
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [zoom, setZoom] = useState<boolean>(false);

  useEffect(() => {
    loadDetails();
  }, [documentId]);

  const loadDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecordDetail(documentId);
      setRecordDetail(data);

      // Initialize editedFields with current values from landRecord
      if (data && data.landRecord) {
        setEditedFields({
          owner_name: data.landRecord.ownerName || '',
          survey_number: data.landRecord.surveyNumber || '',
          khata_number: data.landRecord.khataNumber || '',
          area: data.landRecord.area || '',
          village: data.landRecord.village || '',
          district: data.landRecord.district || '',
        });
      }
    } catch (err: any) {
      setError('Failed to load record details. Ensure document has been processed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setEditedFields((prev) => ({ ...prev, [fieldName]: value }));
  };

  const toggleEdit = (fieldName: string) => {
    setActiveEditing((prev) => ({ ...prev, [fieldName]: !prev[fieldName] }));
  };

  const handleSaveVerification = async () => {
    if (!recordDetail || !recordDetail.landRecord) return;

    try {
      setSubmitting(true);
      setError(null);

      // Compute which fields were actually changed
      const changes: Record<string, string> = {};
      const lr = recordDetail.landRecord;
      const initialMap: Record<string, string> = {
        owner_name: lr.ownerName || '',
        survey_number: lr.surveyNumber || '',
        khata_number: lr.khataNumber || '',
        area: lr.area || '',
        village: lr.village || '',
        district: lr.district || '',
      };

      for (const key of Object.keys(editedFields)) {
        if (editedFields[key] !== initialMap[key]) {
          changes[key] = editedFields[key];
        }
      }

      const updated = await verifyRecord(
        recordDetail.landRecord.id,
        changes,
        officerName
      );

      setRecordDetail(updated);
      setSuccessMsg('Record successfully verified and saved to database!');
      onRecordVerified();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: '#64748b' }}>
        <p>Loading record inspection workspace...</p>
      </div>
    );
  }

  if (!recordDetail || !recordDetail.landRecord) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <AlertTriangle size={36} color="#d97706" style={{ margin: '0 auto 1rem' }} />
        <h3>Record Not Ready</h3>
        <p style={{ color: '#64748b', marginTop: 4 }}>
          This document has not been processed yet.
        </p>
        <button className="btn btn-secondary" onClick={onBack} style={{ marginTop: '1.25rem' }}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>
    );
  }

  const { document: doc, landRecord, validationResults, verificationHistory, fieldConfidences } = recordDetail;
  const isVerified = landRecord.verificationStatus === 'VERIFIED';

  // Construct image preview URL
  const previewUrl = doc.processedImagePath
    ? `/files/processed/${doc.processedImagePath.split(/[/\\]/).pop()}`
    : `/files/raw/${doc.storedPath.split(/[/\\]/).pop()}`;

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Document: <strong>{doc.originalFilename}</strong></span>
          {isVerified ? (
            <span className="badge badge-success"><CheckCircle2 size={12} /> Verified</span>
          ) : (
            <span className="badge badge-warning"><AlertTriangle size={12} /> Pending Officer Verification</span>
          )}
        </div>
      </div>

      {error && <div className="alert-banner">{error}</div>}
      {successMsg && (
        <div style={{ background: '#dcfce7', borderLeft: '4px solid #15803d', color: '#14532d', padding: '0.75rem 1rem', borderRadius: 6, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <CheckCircle2 size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dual Pane Layout */}
      <div className="review-layout">
        {/* LEFT PANE: Document Preview */}
        <div className="preview-pane">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Original / Preprocessed Deed</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setZoom(!zoom)}
              title="Toggle Zoom"
            >
              <ZoomIn size={14} /> {zoom ? 'Reset Zoom' : 'Enlarge'}
            </button>
          </div>

          <div className="preview-image-container">
            <img
              src={previewUrl}
              alt="Land Record Preview"
              className="preview-image"
              style={{
                transform: zoom ? 'scale(1.4)' : 'scale(1)',
                transformOrigin: 'top center',
                transition: 'transform 0.2s ease',
              }}
              onError={(e) => {
                // Fallback placeholder if image not rendered
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
            Reference Preview — Stored securely at {doc.originalFilename}
          </div>
        </div>

        {/* RIGHT PANE: Extracted Fields & Validation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Validation Warnings Summary */}
          {validationResults && validationResults.length > 0 && (
            <div className="card" style={{ padding: '1rem', background: '#fffbeb', borderColor: '#fef3c7' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: '#b45309', fontSize: '0.9rem', marginBottom: 6 }}>
                <AlertTriangle size={16} />
                <span>Deterministic Validation Warnings</span>
              </div>
              <ul style={{ paddingLeft: '1.2rem', fontSize: '0.825rem', color: '#92400e' }}>
                {validationResults
                  .filter((v) => v.status !== 'PASS')
                  .map((v, idx) => (
                    <li key={idx} style={{ marginTop: 3 }}>
                      <strong>{v.fieldName}:</strong> {v.message}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Fields Review Card */}
          <div className="card">
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>
              Extracted Land Record Attributes
            </h2>

            <div className="field-cards">
              {Object.keys(FIELD_LABELS).map((fieldKey) => {
                const confData = fieldConfidences[fieldKey];
                const confScore = confData ? confData.confidence : 0.85;
                const isLowConf = confScore < 0.85;
                const isEditing = activeEditing[fieldKey];

                let confClass = 'conf-high';
                if (confScore < 0.70) confClass = 'conf-low';
                else if (confScore < 0.85) confClass = 'conf-mid';

                return (
                  <div
                    key={fieldKey}
                    className={`field-card ${isLowConf ? 'needs-review' : ''} ${isVerified ? 'verified' : ''}`}
                  >
                    <div className="field-header">
                      <span className="field-name">{FIELD_LABELS[fieldKey]}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.75rem', color: isLowConf ? '#b45309' : '#15803d', fontWeight: 600 }}>
                          BhoomiX Conf: {(confScore * 100).toFixed(0)}%
                        </span>
                        {isLowConf && (
                          <span className="badge badge-warning" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}>
                            Flagged
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Confidence Score Bar */}
                    <div className="confidence-bar">
                      <div
                        className={`confidence-fill ${confClass}`}
                        style={{ width: `${Math.min(100, Math.max(10, confScore * 100))}%` }}
                      />
                    </div>

                    {/* Input Editor */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        type="text"
                        className="field-input"
                        value={editedFields[fieldKey] || ''}
                        onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                        placeholder={`Enter ${FIELD_LABELS[fieldKey]}`}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => toggleEdit(fieldKey)}
                        title="Accept/Edit Field"
                      >
                        {isEditing ? <Check size={14} /> : <Edit2 size={14} />}
                      </button>
                    </div>

                    {/* Source OCR text hint */}
                    {confData && confData.sourceText && (
                      <div className="field-source">
                        OCR source text: "{confData.sourceText}"
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Officer Signoff & Verification Action */}
            <div style={{ marginTop: '1.5rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                Reviewing Officer Name
              </label>
              <input
                type="text"
                className="field-input"
                value={officerName}
                onChange={(e) => setOfficerName(e.target.value)}
                style={{ marginBottom: '1rem' }}
              />

              <button
                className="btn btn-success"
                onClick={handleSaveVerification}
                disabled={submitting}
                style={{ width: '100%' }}
              >
                <FileCheck size={18} />
                {submitting ? 'Saving Verification...' : 'Accept & Verify Land Record'}
              </button>
            </div>
          </div>

          {/* Audit History Card */}
          {verificationHistory && verificationHistory.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.75rem' }}>
                <History size={16} color="#64748b" />
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Verification Audit Trail</h3>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Field</th>
                      <th>AI Original</th>
                      <th>Corrected Value</th>
                      <th>Officer</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verificationHistory.map((rec) => (
                      <tr key={rec.id}>
                        <td style={{ fontWeight: 600 }}>{rec.fieldName}</td>
                        <td style={{ color: '#b91c1c', textDecoration: 'line-through' }}>{rec.aiValue || '—'}</td>
                        <td style={{ color: '#15803d', fontWeight: 600 }}>{rec.correctedValue}</td>
                        <td>{rec.verifiedBy}</td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          {new Date(rec.verifiedAt).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
