import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

let searchParams = new URLSearchParams();
jest.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ push: jest.fn() }),
}));

const realFetch = global.fetch;
afterEach(() => {
  global.fetch = realFetch;
});

function mockFetch(status: number, body: unknown) {
  const fn = jest.fn().mockResolvedValue({ ok: status < 400, status, json: async () => body });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

describe('ForgotPasswordForm', () => {
  it('sends the email and shows the same confirmation whatever the answer', async () => {
    const fetchMock = mockFetch(200, { success: true, message: 'If an account exists for that email, we’ve sent a link.' });
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'ada@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));

    expect(await screen.findByRole('status')).toHaveTextContent('If an account exists');
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/forgot-password', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'ada@example.com' });
  });

  it('validates the email before sending', () => {
    const fetchMock = mockFetch(200, {});
    render(<ForgotPasswordForm />);
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send reset link/i }));
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('ResetPasswordForm', () => {
  it('asks for a new link when the token is missing', () => {
    searchParams = new URLSearchParams();
    render(<ResetPasswordForm />);
    expect(screen.getByRole('alert')).toHaveTextContent('incomplete');
  });

  it('checks the passwords match, then sets the new one with the token', async () => {
    searchParams = new URLSearchParams({ token: 'tok' });
    const fetchMock = mockFetch(200, { success: true });
    render(<ResetPasswordForm />);

    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'brand-new-password' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'different-password' } });
    fireEvent.click(screen.getByRole('button', { name: /set new password/i }));
    expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'brand-new-password' } });
    fireEvent.click(screen.getByRole('button', { name: /set new password/i }));
    expect(await screen.findByRole('status')).toHaveTextContent('password has been changed');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ token: 'tok', password: 'brand-new-password' });
  });

  it('shows the server error for an expired link', async () => {
    searchParams = new URLSearchParams({ token: 'tok' });
    mockFetch(400, { success: false, error: 'This reset link is invalid or has expired.', field: 'token' });
    render(<ResetPasswordForm />);
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'brand-new-password' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: 'brand-new-password' } });
    fireEvent.click(screen.getByRole('button', { name: /set new password/i }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('invalid or has expired'));
  });
});
