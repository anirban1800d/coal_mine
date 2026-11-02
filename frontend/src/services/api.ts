export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export interface CPCBRequirement {
  Rank: number;
  Requirement_id: string;
  Chapter: string;
  parameter: string;
  Requirements: string;
  Requirement_actions: string;
}

export interface CPCBResponse {
  query: string;
  total_result: number;
  recomendations: CPCBRequirement[];
}

export interface DGMSRequirement {
  Rank: number;
  Score: number;
  'Requirement ID': string;
  'Regulation Number': string | null;
  'Regulation Title': string | null;
  'Chapter': string | null;
  'Clause Number': string | null;
  'Requirement Type': string | null;
  'Project Relevance': string | null;
  [key: string]: string | number | null | undefined;
}

export interface DGMSResponse {
  query: string;
  total: number;
  results: DGMSRequirement[];
}

export interface HistorySummary {
  id: string;
  domain: string;
  query: string;
  timestamp: string;
  result_count: number;
}

export interface HistoryEntry extends HistorySummary {
  results: any[];
}

export interface User {
  id: string;
  name: string;
  surname: string;
  email: string;
  provider: string;
}

export async function loginUser(credentials: any) {
  const response = await fetch(`${API_BASE_URL}/api/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
    credentials: 'include'
  });
  if (!response.ok) {
    const error = await response.json();
    throw { response: { data: error } };
  }
  return response.json();
}

export async function registerUser(userData: any) {
  const response = await fetch(`${API_BASE_URL}/api/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData),
    credentials: 'include'
  });
  if (!response.ok) {
    const error = await response.json();
    throw { response: { data: error } };
  }
  return response.json();
}

export async function getCurrentUser(): Promise<User | null> {
  const response = await fetch(`${API_BASE_URL}/api/me`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) return null;
  return response.json();
}

export async function logoutUser() {
  const response = await fetch(`${API_BASE_URL}/api/logout`, {
    method: 'POST',
    credentials: 'include'
  });
  if (!response.ok) {
    const error = await response.json();
    throw { response: { data: error } };
  }
  return response.json();
}

export function googleLogin() {
  window.location.href = `${API_BASE_URL}/api/login/google`;
}

export async function forgotPassword(data: { Email: string }) {
  const response = await fetch(`${API_BASE_URL}/api/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  if (!response.ok) {
    const error = await response.json();
    throw { response: { data: error } };
  }
  return response.json();
}

export async function verifyOTP(data: { Email: string; OTP: string }) {
  const response = await fetch(`${API_BASE_URL}/api/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  if (!response.ok) {
    const error = await response.json();
    throw { response: { data: error } };
  }
  return response.json();
}

export async function resetPassword(data: { Email: string; NewPassword: string }) {
  const response = await fetch(`${API_BASE_URL}/api/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  if (!response.ok) {
    const error = await response.json();
    throw { response: { data: error } };
  }
  return response.json();
}

export async function searchCPCB(query: string): Promise<CPCBResponse> {
  const response = await fetch(`${API_BASE_URL}/cpcb/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch CPCB results: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function searchDGMS(query: string): Promise<DGMSResponse> {
  const response = await fetch(`${API_BASE_URL}/dgms/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch DGMS results: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getHistory(): Promise<HistorySummary[]> {
  const response = await fetch(`${API_BASE_URL}/api/history`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch history`);
  }
  return response.json();
}

export async function getHistoryItem(id: string): Promise<HistoryEntry> {
  const response = await fetch(`${API_BASE_URL}/api/history/${id}`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch history item`);
  }
  return response.json();
}

export async function deleteHistoryItem(id: string) {
  const response = await fetch(`${API_BASE_URL}/api/history/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error(`Failed to delete history item`);
  }
  return response.json();
}

// ── PPE Detection API ─────────────────────────────────────────────────────────

export interface PPEDetection {
  class_name: string;
  confidence: number;
}

export interface PPEHistorySummary {
  id: string;
  timestamp: string;
  duration: number;        // seconds
  detection_count: number;
}

export interface PPEHistoryEntry extends PPEHistorySummary {
  detections: PPEDetection[];
}

export interface PPESavePayload {
  duration: number;
  detection_count: number;
  detections: PPEDetection[];
}

export async function savePPESession(data: PPESavePayload): Promise<{ message: string; id: string }> {
  const response = await fetch(`${API_BASE_URL}/ppe/save-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    credentials: 'include'
  });
  if (!response.ok) {
    const error = await response.json();
    throw { response: { data: error } };
  }
  return response.json();
}

export async function getPPEHistory(): Promise<PPEHistorySummary[]> {
  const response = await fetch(`${API_BASE_URL}/ppe/history`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch PPE history');
  }
  return response.json();
}

export async function getPPEHistoryItem(id: string): Promise<PPEHistoryEntry> {
  const response = await fetch(`${API_BASE_URL}/ppe/history/${id}`, {
    method: 'GET',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch PPE history item');
  }
  return response.json();
}

export async function deletePPEHistoryItem(id: string) {
  const response = await fetch(`${API_BASE_URL}/ppe/history/${id}`, {
    method: 'DELETE',
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to delete PPE history item');
  }
  return response.json();
}
