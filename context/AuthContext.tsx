'use client';

/**
 * Authentication Context for managing user auth state across the application
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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

  // Validate token and fetch user data on app load
  useEffect(() => {
    const validateSession = async () => {
      try {
        // Check if auth_token cookie exists
        const cookies = document.cookie.split(';');
        const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='));
        
        if (!authCookie) {
          setIsLoading(false);
          return;
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

  const login = (userData: User) => {
    setUser(userData);
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
      // Clear user state and redirect
      setUser(null);
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
