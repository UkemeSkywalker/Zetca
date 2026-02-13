'use client';

/**
 * Authentication Context for managing user auth state across the application
 * Includes session persistence and token refresh functionality
 */

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  bio?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper to decode JWT and check expiration
function decodeToken(token: string): { exp: number } | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

// Helper to get token from cookie
function getTokenFromCookie(): string | null {
  const cookies = document.cookie.split(';');
  const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
  if (!authCookie) return null;
  return authCookie.split('=')[1];
}

// Helper to check if token is expired or will expire soon (within 5 minutes)
function isTokenExpiringSoon(token: string): boolean {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true;
  
  const expirationTime = decoded.exp * 1000; // Convert to milliseconds
  const currentTime = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  
  return expirationTime - currentTime < fiveMinutes;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Validate token and fetch user data on app load
  useEffect(() => {
    const validateSession = async () => {
      try {
        const token = getTokenFromCookie();
        
        if (!token) {
          setIsLoading(false);
          return;
        }

        // Check if token is expired
        const decoded = decodeToken(token);
        if (decoded && decoded.exp) {
          const expirationTime = decoded.exp * 1000;
          const currentTime = Date.now();
          
          if (currentTime >= expirationTime) {
            // Token is expired, clear it
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            setUser(null);
            setIsLoading(false);
            return;
          }
        }

        // Fetch user profile to validate token
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
          }
        } else if (response.status === 401) {
          // Token is invalid or expired, clear it
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          setUser(null);
        }
      } catch (error) {
        console.error('Error validating session:', error);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  // Periodic token expiration check (every minute)
  useEffect(() => {
    if (!user) return;

    const checkTokenExpiration = () => {
      const token = getTokenFromCookie();
      
      if (!token) {
        // Token was removed (e.g., by another tab)
        setUser(null);
        return;
      }

      const decoded = decodeToken(token);
      if (decoded && decoded.exp) {
        const expirationTime = decoded.exp * 1000;
        const currentTime = Date.now();
        
        if (currentTime >= expirationTime) {
          // Token has expired
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          setUser(null);
        }
      }
    };

    // Check every minute
    tokenCheckIntervalRef.current = setInterval(checkTokenExpiration, 60 * 1000);

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
    };
  }, [user]);

  // Handle automatic redirect to login for expired/invalid tokens
  useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = window.location.pathname;
      // Only redirect if on a protected route (dashboard)
      if (currentPath.startsWith('/dashboard')) {
        router.push('/login');
      }
    }
  }, [isLoading, user, router]);

  // Maintain session across browser tabs using storage events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Listen for logout events from other tabs
      if (e.key === 'auth_logout' && e.newValue) {
        setUser(null);
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/dashboard')) {
          router.push('/login');
        }
      }
      
      // Listen for login events from other tabs
      if (e.key === 'auth_login' && e.newValue) {
        // Revalidate session when another tab logs in
        const validateSession = async () => {
          try {
            const response = await fetch('/api/profile', {
              method: 'GET',
              credentials: 'include',
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.user) {
                setUser(data.user);
              }
            }
          } catch (error) {
            console.error('Error revalidating session:', error);
          }
        };
        validateSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [router]);

  const login = (userData: User) => {
    setUser(userData);
    // Notify other tabs about login
    localStorage.setItem('auth_login', Date.now().toString());
    localStorage.removeItem('auth_login'); // Clean up immediately
  };

  const logout = async () => {
    try {
      // Call logout API to clear cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Clear user state
      setUser(null);
      
      // Notify other tabs about logout
      localStorage.setItem('auth_logout', Date.now().toString());
      localStorage.removeItem('auth_logout'); // Clean up immediately
      
      // Redirect to login
      router.push('/login');
    }
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook for accessing authentication context
 * @returns AuthContext value with user, loading state, and auth methods
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
