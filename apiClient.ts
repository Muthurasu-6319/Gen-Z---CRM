// src/apiClient.ts
// Thin API client that replaces all Supabase calls.
// Attaches JWT from localStorage to every request.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function getToken(): string | null {
  return localStorage.getItem('crm_token');
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: authHeaders(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data as T;
}

export const api = {
  get:    <T = any>(path: string)                  => request<T>('GET',    path),
  post:   <T = any>(path: string, body: unknown)   => request<T>('POST',   path, body),
  put:    <T = any>(path: string, body: unknown)   => request<T>('PUT',    path, body),
  delete: <T = any>(path: string)                  => request<T>('DELETE', path),
};

export async function uploadFile(path: string, formData: FormData): Promise<unknown> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || 'Upload failed');
  return data;
}

export function getFileUrl(filename: string): string {
  return `${API_URL}/uploads/${filename}`;
}

export function storeToken(token: string): void {
  localStorage.setItem('crm_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('crm_token');
}

export function getStoredToken(): string | null {
  return getToken();
}

export const API_BASE = API_URL;
