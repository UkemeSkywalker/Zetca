'use client';

import React, { useState } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserProfile, ConnectedAccount } from '@/types';
import { Icon } from '@iconify/react';

interface ProfileFormProps {
  className?: string;
}

// Mock data for connected accounts with username and followers
const mockAccountData: Record<string, { username: string; followers: string }> = {
  instagram: { username: '@johndoe', followers: '12.5K' },
  twitter: { username: '@johndoe', followers: '8.3K' },
  linkedin: { username: 'John Doe', followers: '2.1K' },
  facebook: { username: 'John Doe', followers: '5.7K' },
};

export const ProfileForm: React.FC<ProfileFormProps> = ({ className = '' }) => {
  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    id: 'user-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Acme Inc',
    bio: 'Social media enthusiast and content creator',
  });

  // Connected accounts state
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([
    { platform: 'instagram', isConnected: false },
    { platform: 'twitter', isConnected: false },
    { platform: 'linkedin', isConnected: false },
    { platform: 'facebook', isConnected: false },
  ]);

  // Editing state for each field
  const [editingField, setEditingField] = useState<string | null>(null);
  const [tempValue, setTempValue] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [connectionMessage, setConnectionMessage] = useState('');

  // Start editing a field
  const startEditing = (field: keyof UserProfile) => {
    setEditingField(field);
    setTempValue(profile[field] as string);
    setErrors({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingField(null);
    setTempValue('');
    setErrors({});
  };

  // Validate field
  const validateField = (field: string, value: string): string | null => {
    if (field === 'name' && value.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address';
      }
    }
    if (field === 'bio' && value.length > 500) {
      return 'Bio must be less than 500 characters';
    }
    return null;
  };

  // Save field
  const saveField = (field: keyof UserProfile) => {
    const error = validateField(field, tempValue);
    if (error) {
      setErrors({ [field]: error });
      return;
    }

    setProfile(prev => ({ ...prev, [field]: tempValue }));
    setEditingField(null);
    setTempValue('');
    setSuccessMessage(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
    
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Handle account connection toggle
  const handleAccountToggle = (platform: ConnectedAccount['platform']) => {
    setAccounts(prev =>
      prev.map(account =>
        account.platform === platform
          ? { 
              ...account, 
              isConnected: !account.isConnected,
              username: !account.isConnected ? mockAccountData[platform].username : undefined,
            }
          : account
      )
    );

    const account = accounts.find(a => a.platform === platform);
    const action = account?.isConnected ? 'disconnected from' : 'connected to';
    setConnectionMessage(`Successfully ${action} ${platform.charAt(0).toUpperCase() + platform.slice(1)}!`);

    setTimeout(() => {
      setConnectionMessage('');
    }, 3000);
  };

  // Platform icons
  const platformIcons: Record<string, string> = {
    instagram: 'solar:instagram-bold',
    twitter: 'solar:twitter-bold',
    linkedin: 'solar:linkedin-bold',
    facebook: 'solar:facebook-bold',
  };

  // Render profile field
  const renderProfileField = (
    field: keyof UserProfile,
    label: string,
    isTextarea: boolean = false
  ) => {
    const isEditing = editingField === field;
    const value = profile[field] as string;

    return (
      <div className="py-3 border-b border-gray-200 last:border-b-0">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-500 mb-1">
              {label}
            </label>
            {isEditing ? (
              <div className="space-y-2">
                {isTextarea ? (
                  <textarea
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    rows={4}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                ) : (
                  <input
                    type={field === 'email' ? 'email' : 'text'}
                    value={tempValue}
                    onChange={(e) => setTempValue(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors[field] ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                )}
                {errors[field] && (
                  <p className="text-sm text-red-600">{errors[field]}</p>
                )}
                {field === 'bio' && (
                  <p className="text-sm text-gray-500">
                    {tempValue.length}/500 characters
                  </p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => saveField(field)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-gray-900">{value || 'Not set'}</p>
            )}
          </div>
          {!isEditing && (
            <button
              onClick={() => startEditing(field)}
              className="ml-4 p-2 text-gray-400 hover:text-blue-600 transition-colors"
            >
              <Icon icon="solar:pen-bold" width={18} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={className}>
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      )}

      {/* Connection Message */}
      {connectionMessage && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg mb-6">
          {connectionMessage}
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Profile Information */}
        <Card title="Profile Information" variant="bordered">
          <div className="space-y-0">
            {renderProfileField('name', 'Name')}
            {renderProfileField('email', 'Email')}
            {renderProfileField('company', 'Company')}
            {renderProfileField('bio', 'Bio', true)}
          </div>
        </Card>

        {/* Right Column - Connected Accounts */}
        <Card title="Connected Accounts" variant="bordered">
          <p className="text-sm text-gray-600 mb-4">
            Connect your social media accounts to enable publishing
          </p>

          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.platform}
                className="p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <Icon
                      icon={platformIcons[account.platform]}
                      className="text-3xl text-gray-700 mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 capitalize">
                          {account.platform}
                        </p>
                        <StatusBadge
                          status={account.isConnected ? 'complete' : 'not-started'}
                        />
                      </div>
                      
                      {account.isConnected ? (
                        <div className="space-y-1">
                          <p className="text-sm text-gray-600">
                            {mockAccountData[account.platform].username}
                          </p>
                          <p className="text-xs text-gray-500">
                            {mockAccountData[account.platform].followers} followers
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">
                          Not connected
                        </p>
                      )}
                    </div>
                  </div>

                  <Button
                    variant={account.isConnected ? 'outline' : 'primary'}
                    size="sm"
                    onClick={() => handleAccountToggle(account.platform)}
                  >
                    {account.isConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};
