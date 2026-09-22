export type DocumentStatus = 'UPLOADED' | 'PROCESSING' | 'EXTRACTED' | 'NEEDS_REVIEW' | 'VERIFIED' | 'FAILED';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';
export type ValidationStatus = 'PASS' | 'WARNING' | 'ERROR';

export interface DocumentItem {
  id: number;
  originalFilename: string;
  storedPath: string;
  fileType: string;
  processedImagePath?: string;
  status: DocumentStatus;
  uploadedAt: string;
}

export interface LandRecord {
  id: number;
  documentId: number;
  ownerName: string;
  surveyNumber: string;
  khataNumber: string;
  area: string;
  village: string;
  district: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt?: string;
}

export interface FieldConfidence {
  fieldName: string;
  value: string;
  confidence: number;
  status: string;
  sourceText?: string;
}

export interface ValidationResult {
  id?: number;
  fieldName: string;
  status: ValidationStatus;
  message: string;
}

export interface VerificationRecord {
  id?: number;
  fieldName: string;
  aiValue: string;
  correctedValue: string;
  confidence: number;
  verifiedBy: string;
  verifiedAt: string;
}

export interface RecordDetail {
  document: DocumentItem;
  landRecord: LandRecord;
  fieldConfidences: Record<string, FieldConfidence>;
  validationResults: ValidationResult[];
  verificationHistory: VerificationRecord[];
}

export interface DashboardSummary {
  totalDocuments: number;
  verifiedRecords: number;
  pendingVerification: number;
  documentsWithWarnings: number;
}
