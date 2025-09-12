export const API_BASE = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000/api";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    ...init,
  });
  return res;
}


