import { getApiUrl } from './config';

export const API_BASE = getApiUrl();

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  return res;
}


