/**
 * Session persistence: the auth token is an httpOnly cookie the browser sends
 * on its own, so AuthProvider learns who is signed in by asking /api/profile.
 */

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const fetchMock = jest.fn();
global.fetch = fetchMock;

const profile = {
  success: true,
  user: {
    id: 'test-123',
    email: 'test@example.com',
    name: 'Test User',
    linkedin: { isConnected: true, name: 'Test L', pictureUrl: 'https://example.com/p.png' },
  },
};

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const unauthorized = () => ({ ok: false, status: 401, json: async () => ({}) });

function TestComponent() {
  const { user, isLoading, isAuthenticated, logout } = useAuth();

  return (
    <div>
      <p>{isLoading ? 'Loading' : 'Ready'}</p>
      <p>{isAuthenticated ? 'Signed in' : 'Signed out'}</p>
      <p>{user ? user.email : 'No user'}</p>
      {user?.linkedin?.isConnected && <p>LinkedIn connected</p>}
      <button onClick={logout}>Log out</button>
    </div>
  );
}

const renderWithAuth = () =>
  render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>
  );

const setPath = (path: string) => window.history.pushState({}, '', path);

describe('Session Persistence', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    mockPush.mockReset();
    setPath('/');
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('restores the session from the profile API on load', async () => {
    fetchMock.mockResolvedValueOnce(ok(profile));
    renderWithAuth();

    expect(screen.getByText('Loading')).toBeInTheDocument();
    expect(await screen.findByText('Ready')).toBeInTheDocument();

    expect(screen.getByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn connected')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile',
      expect.objectContaining({ method: 'GET', credentials: 'include' })
    );
  });

  it('stays signed out when the profile API rejects the session', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized());
    renderWithAuth();

    expect(await screen.findByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(screen.getByText('No user')).toBeInTheDocument();
  });

  it('stays signed out when the profile API cannot be reached', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    renderWithAuth();

    expect(await screen.findByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Signed out')).toBeInTheDocument();
  });

  it('stays signed out when the profile response has no user', async () => {
    fetchMock.mockResolvedValueOnce(ok({ success: false }));
    renderWithAuth();

    expect(await screen.findByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Signed out')).toBeInTheDocument();
  });

  it('sends a signed-out visitor on a dashboard page to the login page', async () => {
    setPath('/dashboard/scheduler');
    fetchMock.mockResolvedValueOnce(unauthorized());
    renderWithAuth();

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
  });

  it('leaves a signed-out visitor on a public page where they are', async () => {
    setPath('/pricing');
    fetchMock.mockResolvedValueOnce(unauthorized());
    renderWithAuth();

    expect(await screen.findByText('Ready')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('does not redirect a signed-in user on a dashboard page', async () => {
    setPath('/dashboard');
    fetchMock.mockResolvedValueOnce(ok(profile));
    renderWithAuth();

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('signs out when the periodic check finds the session has expired', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce(ok(profile));
    renderWithAuth();
    expect(await screen.findByText('Signed in')).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(unauthorized());
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('keeps the session when the periodic check cannot reach the server', async () => {
    jest.useFakeTimers();
    fetchMock.mockResolvedValueOnce(ok(profile));
    renderWithAuth();
    expect(await screen.findByText('Signed in')).toBeInTheDocument();

    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(screen.getByText('Signed in')).toBeInTheDocument();
  });

  it('signs out when another tab logs out', async () => {
    setPath('/dashboard');
    fetchMock.mockResolvedValueOnce(ok(profile));
    renderWithAuth();
    expect(await screen.findByText('Signed in')).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'auth_logout', newValue: '1' }));
    });

    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/login');
  });

  it('picks up the session when another tab logs in', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized());
    renderWithAuth();
    expect(await screen.findByText('Signed out')).toBeInTheDocument();

    fetchMock.mockResolvedValueOnce(ok(profile));
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'auth_login', newValue: '1' }));
    });

    expect(await screen.findByText('Signed in')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('logs out through the API, tells other tabs and goes to the login page', async () => {
    fetchMock.mockResolvedValueOnce(ok(profile));
    renderWithAuth();
    expect(await screen.findByText('Signed in')).toBeInTheDocument();

    const setItem = jest.spyOn(Storage.prototype, 'setItem');
    fetchMock.mockResolvedValueOnce(ok({ success: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login'));
    expect(screen.getByText('Signed out')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/auth/logout',
      expect.objectContaining({ method: 'POST', credentials: 'include' })
    );
    expect(setItem).toHaveBeenCalledWith('auth_logout', expect.any(String));
  });

  it('still signs out locally when the logout API fails', async () => {
    fetchMock.mockResolvedValueOnce(ok(profile));
    renderWithAuth();
    expect(await screen.findByText('Signed in')).toBeInTheDocument();

    fetchMock.mockRejectedValueOnce(new Error('network down'));
    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(screen.getByText('Signed out')).toBeInTheDocument());
    expect(mockPush).toHaveBeenCalledWith('/login');
  });
});
