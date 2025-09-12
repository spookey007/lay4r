import { apiFetch } from './api';

export interface User {
  id: string;
  walletAddress: string;
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarBlob: string | null;
  email: string | null;
  emailVerified?: boolean;
  role: number;
  isAdmin: boolean;
}

export async function checkAdminAuth(): Promise<{ user: User | null; isAdmin: boolean }> {
  try {
    const res = await apiFetch("/auth/me");
    const data = await res.json();
    
    if (!data.user) {
      return { user: null, isAdmin: false };
    }

    const isAdmin = data.user.isAdmin || data.user.role === 0;
    return { user: data.user, isAdmin };
  } catch (error) {
    console.error("Failed to check admin auth:", error);
    return { user: null, isAdmin: false };
  }
}

export function redirectToHome() {
  if (typeof window !== 'undefined') {
    window.location.href = '/';
  }
}
