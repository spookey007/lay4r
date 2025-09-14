// Simple auth utilities for session-based authentication
export const isAuthenticated = async (): Promise<boolean> => {
  try {
    const { apiFetch } = await import('./api');
    const response = await apiFetch('/auth/me');
    const data = await response.json();
    return !!data.user;
  } catch (error) {
    console.error('Authentication check failed:', error);
    return false;
  }
};

export const getSessionToken = (): string | null => {
  if (typeof window !== 'undefined') {
    // Get session token from cookies
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'l4_session') {
        return decodeURIComponent(value);
      }
    }
  }
  return null;
};

export const getCurrentUser = async () => {
  try {
    const { apiFetch } = await import('./api');
    const response = await apiFetch('/auth/me');
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error('Failed to get current user:', error);
    return null;
  }
};
