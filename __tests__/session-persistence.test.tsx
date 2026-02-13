/**
 * Integration tests for session persistence and token refresh
 */

import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Test component that uses auth
function TestComponent() {
  const { user, isLoading, isAuthenticated } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="authenticated">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
    </div>
  );
}

describe('Session Persistence', () => {
  let mockPush: jest.Mock;
  
  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    (global.fetch as jest.Mock).mockClear();
    
    // Clear cookies
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should validate session on app load with valid token', async () => {
    // Set up a valid token cookie
    const validToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTcwOTQ4MTYwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test';
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `auth_token=${validToken}`,
    });

    // Mock successful profile fetch
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        user: {
          id: 'test-123',
          email: 'test@example.com',
          name: 'Test User',
        },
      }),
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Initially loading
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    // Wait for session validation
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Should be authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
  });

  it('should handle expired token on app load', async () => {
    // Set up an expired token (exp in the past)
    const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTcwOTQ4MTYwMCwiZXhwIjoxfQ.test';
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `auth_token=${expiredToken}`,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for session validation
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Should not be authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');

    // Should not call API for expired token
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle missing token on app load', async () => {
    // No token in cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for session validation
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Should not be authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');

    // Should not call API when no token
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle invalid token response from API', async () => {
    // Set up a token
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTcwOTQ4MTYwMCwiZXhwIjo5OTk5OTk5OTk5fQ.test';
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: `auth_token=${token}`,
    });

    // Mock 401 response (invalid token)
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 401,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Wait for session validation
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    });

    // Should not be authenticated
    expect(screen.getByTestId('authenticated')).toHaveTextContent('Not Authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });
});
