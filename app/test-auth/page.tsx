'use client';

/**
 * Test page for verifying AuthContext functionality
 * This page demonstrates the useAuth hook behavior
 */

import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

export default function TestAuthPage() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg">Loading authentication state...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-6">Auth Context Test Page</h1>
        
        <div className="space-y-4">
          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-semibold mb-2">Authentication Status:</h2>
            <p className="text-lg">
              {isAuthenticated ? (
                <span className="text-green-600">✓ Authenticated</span>
              ) : (
                <span className="text-red-600">✗ Not Authenticated</span>
              )}
            </p>
          </div>

          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-semibold mb-2">User Data:</h2>
            {user ? (
              <div className="space-y-2">
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Name:</strong> {user.name}</p>
                <p><strong>Email:</strong> {user.email}</p>
                {user.bio && <p><strong>Bio:</strong> {user.bio}</p>}
              </div>
            ) : (
              <p className="text-gray-600">No user data (user is null)</p>
            )}
          </div>

          <div className="p-4 bg-gray-100 rounded">
            <h2 className="font-semibold mb-2">Loading State:</h2>
            <p>{isLoading ? 'Loading...' : 'Not loading'}</p>
          </div>

          <div className="flex gap-4 mt-6">
            {isAuthenticated ? (
              <Button onClick={logout} variant="primary">
                Logout
              </Button>
            ) : (
              <>
                <Button onClick={() => window.location.href = '/login'} variant="primary">
                  Go to Login
                </Button>
                <Button onClick={() => window.location.href = '/signup'} variant="secondary">
                  Go to Signup
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded border border-blue-200">
          <h3 className="font-semibold mb-2">Test Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            <li>When not logged in, useAuth() should return null user</li>
            <li>Login via /login, then return here to see user data</li>
            <li>Clear cookie in DevTools, refresh to see redirect to login</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
