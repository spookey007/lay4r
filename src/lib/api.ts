import { getApiUrl } from './config';

export const API_BASE = getApiUrl();

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  
  // Check if the response contains an error
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
  }
  
  return res;
}


