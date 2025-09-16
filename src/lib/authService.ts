/**
 * Centralized authentication service with caching
 * Prevents multiple /auth/me API calls
 */

interface User {
  id: string;
  username: string | null;
  displayName: string | null;
  walletAddress: string | null;
  avatarUrl: string | null;
  avatarBlob?: string;
  isVerified: boolean;
  status: 'online' | 'idle' | 'dnd' | 'offline';
  lastSeen: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  lastFetch: number | null;
  isInitialized: boolean;
}

class AuthService {
  private state: AuthState = {
    user: null,
    isLoading: false,
    lastFetch: null,
    isInitialized: false
  };

  private listeners: Set<(state: AuthState) => void> = new Set();
  private readonly CACHE_DURATION = 30000; // 30 seconds cache

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Notify all listeners of state changes
   */
  private notify() {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  /**
   * Set user data (used internally)
   */
  setUser(user: User | null) {
    this.state.user = user;
    this.state.lastFetch = Date.now();
    this.state.isInitialized = true;
    this.notify();
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean) {
    this.state.isLoading = isLoading;
    this.notify();
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(): boolean {
    if (!this.state.lastFetch) return false;
    return Date.now() - this.state.lastFetch < this.CACHE_DURATION;
  }

  /**
   * Fetch user data from API (with caching)
   */
  async fetchUser(forceRefresh = false): Promise<User | null> {
    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && this.isCacheValid() && this.state.user) {
      // console.log('📋 Using cached user data');
      return this.state.user;
    }

    // Prevent multiple simultaneous requests
    if (this.state.isLoading) {

      
      return new Promise((resolve) => {
        const unsubscribe = this.subscribe((state) => {
          if (!state.isLoading) {
            unsubscribe();
            resolve(state.user);
          }
        });
      });
    }

    this.setLoading(true);

    try {
      // console.log('🔄 Fetching user data from /auth/me...');
      const { apiFetch } = await import('@/lib/api');
      const response = await apiFetch('/auth/me');
      const data = await response.json();

      if (data.user) {
        // console.log('✅ User data fetched successfully:', data.user);
        
        // Ensure user has all required fields
        const userWithDefaults: User = {
          ...data.user,
          username: data.user.username || null,
          displayName: data.user.displayName || null,
          walletAddress: data.user.walletAddress || null,
          avatarUrl: data.user.avatarUrl || null,
          status: (data.user.status && ['online', 'idle', 'dnd', 'offline'].includes(data.user.status)) 
            ? data.user.status as 'online' | 'idle' | 'dnd' | 'offline'
            : 'online',
          lastSeen: data.user.lastSeen || new Date().toISOString(),
          isVerified: data.user.isVerified || false,
          role: data.user.role || 'user'
        };

        this.setUser(userWithDefaults);
        return userWithDefaults;
      } else {
        console.log('❌ No user data in response');
        this.setUser(null);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to fetch user data:', error);
      this.setUser(null);
      return null;
    } finally {
      this.setLoading(false);
    }
  }

  /**
   * Clear user data (logout)
   */
  clearUser() {
    this.setUser(null);
  }

  /**
   * Initialize auth (call once on app start)
   */
  async initialize(): Promise<User | null> {
    if (this.state.isInitialized) {
      return this.state.user;
    }

    console.log('🚀 Initializing auth service...');
    return await this.fetchUser();
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export hook for React components
export function useAuth() {
  const [state, setState] = useState<AuthState>(authService.getState());

  useEffect(() => {
    const unsubscribe = authService.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isInitialized: state.isInitialized,
    fetchUser: authService.fetchUser.bind(authService),
    clearUser: authService.clearUser.bind(authService)
  };
}

// Import React hooks
import { useState, useEffect } from 'react';
