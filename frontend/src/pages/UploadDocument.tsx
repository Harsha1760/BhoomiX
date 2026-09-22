import React, { useState, useRef } from 'react';
import { uploadDocument, processDocument } from '../services/api';
import { UploadCloud, FileCheck, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

interface UploadDocumentProps {
  onBack: () => void;
  onSuccess: (docId: number) => void;
}

export const UploadDocument: React.FC<UploadDocumentProps> = ({ onBack, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<string>('en');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [stepMessage, setStepMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    setError(null);
    const validExtensions = ['.pdf', '.png', '.jpg', '.jpeg'];
    const fileName = file.name.toLowerCase();
    const hasValidExt = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExt) {
      setError('Unsupported file format. Please upload a PDF, PNG, or JPG file.');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError('File size exceeds the 15 MB limit.');
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError('Please choose or drop a land record document first.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      // Step 1: Uploading to backend
      setStepMessage('Step 1/4: Uploading document to secure repository...');
      const uploadedDoc = await uploadDocument(selectedFile);

      // Step 2 & 3: Dispatching to AI service for Preprocessing & OCR
      setStepMessage('Step 2/4: Running OpenCV enhancement & deskewing...');
      await new Promise(r => setTimeout(r, 400));

      setStepMessage('Step 3/4: Executing PaddleOCR multilingual text & bounding box detection...');
      await new Promise(r => setTimeout(r, 400));

      // Step 4: Extracting fields and validating rules
      setStepMessage('Step 4/4: Extracting structured fields & applying validation rules...');
      await processDocument(uploadedDoc.id, language);

      onSuccess(uploadedDoc.id);
    } catch (err: any) {
      setError(err.message || 'Processing failed. Check backend and AI service logs.');
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <button className="btn btn-secondary btn-sm" onClick={onBack} style={{ marginBottom: '1.25rem' }}>
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div className="card">
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Upload Land Record Document
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          Upload scanned deeds, patta certificates, or ROR extracts for automated OCR, attribute extraction, and validation.
        </p>

        {error && (
          <div className="alert-banner" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Dropzone */}
        <div
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
          />
          <UploadCloud size={48} color="#3b82f6" style={{ margin: '0 auto 0.75rem' }} />
          {selectedFile ? (
            <div>
              <p style={{ fontWeight: 600, color: '#0f172a' }}>{selectedFile.name}</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB — Ready for processing
              </p>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 600, color: '#0f172a' }}>Click to browse or drag and drop document</p>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
                Supports PDF, PNG, JPG, or JPEG (Max 15 MB)
              </p>
            </div>
          )}
        </div>

        {/* Options */}
        <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              Primary Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="field-input"
              disabled={isProcessing}
            >
              <option value="en">English (Official & Administrative Records)</option>
              <option value="te">Telugu (తెలుగు — Regional Land Records)</option>
            </select>
          </div>
        </div>

        {/* Processing Progress Indicator */}
        {isProcessing && (
          <div style={{ marginTop: '1.5rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '1rem', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Loader2 size={24} color="#1d4ed8" className="animate-spin" />
            <div>
              <p style={{ fontWeight: 600, color: '#1e40af', fontSize: '0.9rem' }}>Processing In Progress</p>
              <p style={{ fontSize: '0.825rem', color: '#3b82f6', marginTop: 2 }}>{stepMessage}</p>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          <button className="btn btn-secondary" onClick={onBack} disabled={isProcessing}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!selectedFile || isProcessing}
          >
            {isProcessing ? 'Processing Pipeline...' : 'Start Extraction & Validation'}
          </button>
        </div>
      </div>
    </div>
  );
};
