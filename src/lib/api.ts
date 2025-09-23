import { getApiUrl } from './config';

export const API_BASE = getApiUrl();

export async function apiFetch(path: string, init: RequestInit = {}) {
  // Don't set Content-Type for FormData (let browser set it with boundary)
  const isFormData = init.body instanceof FormData;
  
  // Get token from localStorage as fallback
  let token = null;
  try {
    token = localStorage.getItem('l4_session');
  } catch (error) {
    console.warn('⚠️ [API] Could not access localStorage:', error);
  }
  
  const headers = isFormData 
    ? { 
        ...(init.headers || {}),
        ...(token && { 'Authorization': `Bearer ${token}` })
      }
    : { 
        "Content-Type": "application/json", 
        ...(init.headers || {}),
        ...(token && { 'Authorization': `Bearer ${token}` })
      };

  // Debug: Log cookies before making request
  console.log('🍪 [API] Cookies before request:', document.cookie);
  console.log('🔑 [API] Token from localStorage:', token ? token.substring(0, 20) + '...' : 'None');
  console.log('🌐 [API] Making request to:', `${API_BASE}${path}`, {
    credentials: "include",
    headers,
    method: init.method || 'GET'
  });

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers,
    ...init,
  });
  
  // Debug: Log response details
  console.log('🌐 [API] Response:', {
    status: res.status,
    statusText: res.statusText,
    ok: res.ok,
    url: res.url,
    headers: Object.fromEntries(res.headers.entries())
  });
  
  // Check if the response contains an error
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error('❌ [API] Request failed:', errorData);
    throw new Error(errorData.message || errorData.error || `HTTP ${res.status}`);
  }
  
  return res;
}


