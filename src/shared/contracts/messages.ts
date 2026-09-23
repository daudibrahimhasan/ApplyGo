import { DetectedField, PageOpportunity, FillTransaction } from '../schemas/fields';
import { GenerationRequest, GeneratedAnswer } from '../schemas/generation';
import { ExtensionSettings } from '../schemas/settings';

export type MessageType =
  | 'PING'
  | 'SCAN_PAGE_REQUEST'
  | 'SCAN_PAGE_RESPONSE'
  | 'FILL_FIELDS_REQUEST'
  | 'FILL_FIELDS_RESPONSE'
  | 'FILL_SINGLE_FIELD_REQUEST'
  | 'FILL_SINGLE_FIELD_RESPONSE'
  | 'UNDO_TRANSACTION_REQUEST'
  | 'UNDO_TRANSACTION_RESPONSE'
  | 'HIGHLIGHT_FIELD_REQUEST'
  | 'GENERATE_ANSWER_REQUEST'
  | 'GENERATE_ANSWER_RESPONSE'
  | 'TEST_API_KEY_REQUEST'
  | 'TEST_API_KEY_RESPONSE'
  | 'GET_SETTINGS_REQUEST'
  | 'GET_SETTINGS_RESPONSE'
  | 'SAVE_SETTINGS_REQUEST'
  | 'SAVE_SETTINGS_RESPONSE'
  | 'OPEN_SIDE_PANEL_REQUEST';

export interface ExtensionMessage<T = unknown> {
  type: MessageType;
  payload?: T;
  requestId?: string;
}

export interface ScanPageResponsePayload {
  opportunity: PageOpportunity;
  fields: DetectedField[];
  url: string;
}

export interface FillFieldsRequestPayload {
  fields: Array<{ id: string; selector: string; value: string }>;
}

export interface FillFieldsResponsePayload {
  transaction: FillTransaction;
  successCount: number;
  failureCount: number;
}

export interface FillSingleFieldRequestPayload {
  fieldId: string;
  selector: string;
  value: string;
}

export interface UndoResponsePayload {
  success: boolean;
  restoredCount: number;
  message?: string;
}

export interface TestApiKeyRequestPayload {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface TestApiKeyResponsePayload {
  success: boolean;
  message: string;
  models?: string[];
}
