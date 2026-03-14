'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';

export default function DebugTokenPage() {
  const [tokenInfo, setTokenInfo] = useState<any>(null);
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = () => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      setTokenInfo({ error: 'No token found in localStorage' });
      return;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        setTokenInfo({ error: 'Invalid JWT format' });
        return;
      }

      const payload = JSON.parse(atob(parts[1]));
      const expDate = payload.exp ? new Date(payload.exp * 1000) : null;
      const now = new Date();

      setTokenInfo({
        exists: true,
        length: token.length,
        preview: token.substring(0, 50) + '...',
        payload,
        expired: expDate ? now > expDate : false,
        expiresAt: expDate?.toISOString(),
      });
    } catch (error: any) {
      setTokenInfo({ error: error.message });
    }
  };

  const testAPI = async () => {
    setTestResult('Testing...');
    const token = localStorage.getItem('token');
    
    if (!token) {
      setTestResult('ERROR: No token found');
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/strategy/list', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      setTestResult(`Status: ${response.status}\nResponse: ${JSON.stringify(data, null, 2)}`);
    } catch (error: any) {
      setTestResult(`ERROR: ${error.message}`);
    }
  };

  const clearToken = () => {
    localStorage.removeItem('token');
    setTokenInfo(null);
    setTestResult('');
    checkToken();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">JWT Token Debug</h1>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Token Information</h2>
          
          {tokenInfo?.error ? (
            <div className="text-red-600 mb-4">
              <strong>Error:</strong> {tokenInfo.error}
            </div>
          ) : tokenInfo?.exists ? (
            <div className="space-y-2">
              <p><strong>Token exists:</strong> ✓ Yes</p>
              <p><strong>Length:</strong> {tokenInfo.length}</p>
              <p><strong>Preview:</strong> <code className="text-xs">{tokenInfo.preview}</code></p>
              <p><strong>Expired:</strong> {tokenInfo.expired ? '✗ Yes' : '✓ No'}</p>
              {tokenInfo.expiresAt && (
                <p><strong>Expires at:</strong> {tokenInfo.expiresAt}</p>
              )}
              <div className="mt-4">
                <strong>Payload:</strong>
                <pre className="bg-gray-100 p-4 rounded mt-2 text-xs overflow-auto">
                  {JSON.stringify(tokenInfo.payload, null, 2)}
                </pre>
              </div>
              {!tokenInfo.payload.userId && (
                <div className="text-red-600 mt-4">
                  <strong>⚠ WARNING:</strong> Token does not contain userId field!
                </div>
              )}
            </div>
          ) : (
            <p>Loading...</p>
          )}

          <div className="flex gap-4 mt-6">
            <Button onClick={checkToken} variant="outline">
              Refresh
            </Button>
            <Button onClick={clearToken} variant="outline">
              Clear Token
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">API Test</h2>
          <Button onClick={testAPI} className="mb-4">
            Test /api/strategy/list
          </Button>
          
          {testResult && (
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
              {testResult}
            </pre>
          )}
        </Card>

        <Card>
          <h2 className="text-xl font-semibold mb-4">Instructions</h2>
          <ol className="list-decimal list-inside space-y-2">
            <li>Check if token exists and is valid</li>
            <li>If token is expired or missing userId, log out and log back in</li>
            <li>Test the API call to see the actual error</li>
            <li>Make sure Python service is running on port 8000</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
