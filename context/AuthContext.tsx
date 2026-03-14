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

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Validate token and fetch user data on app load
  useEffect(() => {
    const validateSession = async () => {
      try {
        // Fetch user profile to validate token (httpOnly cookie is sent automatically)
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setUser(data.user);
          }
        } else {
          // Token is invalid, expired, or missing
          setUser(null);
        }
      } catch (error) {
        console.error('Error validating session:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    validateSession();
  }, []);

  // Periodic token expiration check (every 5 minutes)
  // Since the token is httpOnly, we check by calling the profile API
  useEffect(() => {
    if (!user) return;

    const checkTokenExpiration = async () => {
      try {
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          // Token is no longer valid
          setUser(null);
        }
      } catch (error) {
        console.error('Error checking token:', error);
      }
    };

    // Check every 5 minutes
    tokenCheckIntervalRef.current = setInterval(checkTokenExpiration, 5 * 60 * 1000);

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
      
      // Clear token from localStorage
      localStorage.removeItem('token');
      
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
