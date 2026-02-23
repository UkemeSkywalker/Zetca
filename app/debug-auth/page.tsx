'use client';

/**
 * Debug page to diagnose authentication issues
 */

import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [cookieInfo, setCookieInfo] = useState<string>('');
  const [profileCheck, setProfileCheck] = useState<any>(null);

  useEffect(() => {
    // Get all cookies (note: httpOnly cookies won't be visible here)
    const cookies = document.cookie;
    setCookieInfo(cookies || 'No cookies found (httpOnly cookies are hidden from JavaScript)');

    // Try to fetch profile to check if auth cookie exists on server side
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          setProfileCheck({
            status: 'authenticated',
            user: data.user,
            message: 'Auth cookie is working! User is authenticated.',
          });
        } else if (response.status === 401) {
          setProfileCheck({
            status: 'unauthenticated',
            message: 'No valid auth cookie found on server',
          });
        } else {
          setProfileCheck({
            status: 'error',
            message: `Server returned status ${response.status}`,
          });
        }
      } catch (error) {
        setProfileCheck({
          status: 'error',
          message: 'Failed to check authentication',
          error: String(error),
        });
      }
    };

    checkAuth();

    // Parse auth token (won't work for httpOnly cookies)
    const authCookie = cookies.split(';').find(c => c.trim().startsWith('auth_token='));
    if (authCookie) {
      const token = authCookie.split('=')[1];
      
      try {
        // Decode JWT
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        const decoded = JSON.parse(jsonPayload);
        
        const now = Date.now();
        const exp = decoded.exp * 1000;
        const iat = decoded.iat * 1000;
        const timeUntilExpiry = exp - now;
        
        setTokenInfo({
          userId: decoded.userId,
          email: decoded.email,
          issuedAt: new Date(iat).toLocaleString(),
          expiresAt: new Date(exp).toLocaleString(),
          timeUntilExpiry: {
            milliseconds: timeUntilExpiry,
            seconds: Math.floor(timeUntilExpiry / 1000),
            minutes: Math.floor(timeUntilExpiry / 1000 / 60),
            hours: Math.floor(timeUntilExpiry / 1000 / 60 / 60),
          },
          isExpired: timeUntilExpiry < 0,
        });
      } catch (error) {
        setTokenInfo({ error: 'Failed to decode token' });
      }
    } else {
      setTokenInfo({ note: 'Auth token is httpOnly and cannot be read by JavaScript (this is secure and expected)' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Debug</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(profileCheck, null, 2)}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Cookie Information (JavaScript-accessible only)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {cookieInfo}
          </pre>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Token Information</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {JSON.stringify(tokenInfo, null, 2)}
          </pre>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
            <li>Log in to your account</li>
            <li>Navigate to this page (/debug-auth)</li>
            <li>Check if "Authentication Status" shows you're authenticated</li>
            <li>If authenticated, the auth cookie is working correctly</li>
            <li>If not authenticated, check browser DevTools Network tab for cookie issues</li>
          </ol>
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Note:</h3>
          <p className="text-sm text-blue-700">
            The auth_token cookie is httpOnly, which means JavaScript cannot read it directly. 
            This is a security feature. The "Authentication Status" section above checks if the 
            cookie exists by making a request to the server.
          </p>
        </div>
      </div>
    </div>
  );
}
