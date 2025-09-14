import { getApiUrl } from './config';

export const API_BASE = getApiUrl();

export async function apiFetch(path: string, init: RequestInit = {}) {
  // Don't set Content-Type for FormData (let browser set it with boundary)
  const isFormData = init.body instanceof FormData;
  const headers = isFormData 
    ? { ...(init.headers || {}) }
    : { "Content-Type": "application/json", ...(init.headers || {}) };

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
    ...init,
  });
  
  // Check if the response contains an error
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
  }
  
  return res;
}


