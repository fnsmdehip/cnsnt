/**
 * Shared TypeScript types for the cnsnt app.
 */

export type ConsentStatus = 'active' | 'expired' | 'revoked' | 'draft';

export interface ConsentRecord {
  id: string;
  templateId: string;
  templateName: string;
  title: string;
  status: ConsentStatus;
  createdAt: string; // ISO 8601
  expiresAt: string | null; // ISO 8601 or null for no expiry
  revokedAt: string | null;
  parties: PartyInfo[];
  consentText: string;
  signatures: SignatureData[];
  recordingUri: string | null;
  recordingDuration: number | null; // seconds
  pdfUri: string | null;
  documentHash: string | null; // SHA-256 hash for tamper detection
  metadata: Record<string, string>;
}

export interface PartyInfo {
  name: string;
  role: string; // e.g. "Disclosing Party", "Patient", "Participant"
  email?: string;
}

export interface SignatureData {
  partyName: string;
  signatureImage: string; // base64 data URI
  timestamp: string; // ISO 8601
}

export interface ConsentTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  fields: TemplateField[];
  consentText: string; // Markdown with {{field}} placeholders
  requiresDualSignature: boolean;
  defaultExpiryDays: number | null;
  isPremium: boolean;
  icon: string; // emoji for display
}

export type TemplateCategory =
  | 'medical'
  | 'legal'
  | 'business'
  | 'media'
  | 'research'
  | 'property'
  | 'personal'
  | 'custom';

export interface TemplateField {
  key: string;
  label: string;
  placeholder: string;
  type: 'text' | 'date' | 'multiline' | 'email' | 'number';
  required: boolean;
}

export interface UserSettings {
  biometricEnabled: boolean;
  autoLockTimeoutMinutes: number;
  pinHash: string | null;
}

export type Entitlement = 'free' | 'pro';

export interface PurchaseState {
  entitlement: Entitlement;
  recordCount: number;
  canCreateRecord: boolean;
  canRecord: boolean;
  canUseTemplates: boolean;
}

export type RootStackParamList = {
  Lock: undefined;
  Main: undefined;
  Home: undefined;
  Dashboard: undefined;
  ConsentBuilder: { title: string; templateId?: string };
  Recording: { consentId?: string };
  NDA: undefined;
  SexualConsent: undefined;
  Waiver: undefined;
  MutualRelease: undefined;
  Settings: undefined;
  TemplateForm: { templateId: string };
  TemplateEditor: { templateId?: string };
  ConsentDetail: { consentId: string };
};
