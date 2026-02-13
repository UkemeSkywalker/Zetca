'use client';

import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { UserProfile, ConnectedAccount } from '@/types';
import { Icon } from '@iconify/react';
import { useAuth } from '@/context/AuthContext';

interface ProfileFormProps {
  className?: string;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({ className = '' }) => {
  const { user: authUser, updateUser } = useAuth();
  
  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    name: '',
    email: '',
    company: '',
    bio: '',
  });

  // Loading states
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Connected accounts state
  const [accounts] = useState<ConnectedAccount[]>([
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

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const response = await fetch('/api/profile', {
          method: 'GET',
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setProfile({
              id: data.user.id,
              name: data.user.name,
              email: data.user.email,
              company: data.user.company || '',
              bio: data.user.bio || '',
            });
          }
        } else if (response.status === 401) {
          // Unauthorized - will be handled by AuthContext
          console.error('Unauthorized access to profile');
        } else {
          const data = await response.json();
          setErrors({ general: data.error || 'Failed to load profile' });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setErrors({ general: 'Failed to load profile' });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchProfile();
  }, []);

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
    if (field === 'company' && value.length > 100) {
      return 'Company name must be less than 100 characters';
    }
    if (field === 'bio' && value.length > 500) {
      return 'Bio must be less than 500 characters';
    }
    return null;
  };

  // Save field
  const saveField = async (field: keyof UserProfile) => {
    const error = validateField(field, tempValue);
    if (error) {
      setErrors({ [field]: error });
      return;
    }

    try {
      setIsSaving(true);
      setErrors({});

      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          [field]: tempValue,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update local state
        setProfile(prev => ({ ...prev, [field]: tempValue }));
        
        // Update auth context
        if (authUser) {
          updateUser({
            ...authUser,
            [field]: tempValue,
          });
        }

        setEditingField(null);
        setTempValue('');
        setSuccessMessage(`${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully!`);
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
      } else {
        // Handle validation errors from API
        if (data.errors && data.errors[field]) {
          setErrors({ [field]: data.errors[field] });
        } else {
          setErrors({ [field]: data.error || 'Failed to update profile' });
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setErrors({ [field]: 'Failed to update profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle account connection toggle (to be implemented separately)
  const handleAccountToggle = () => {
    // Account connection will be implemented in a future task
    setConnectionMessage(`Account connection feature coming soon!`);

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
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cancelEditing}
                    disabled={isSaving}
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
      {/* General Error Message */}
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
          {errors.general}
        </div>
      )}

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

      {/* Loading State */}
      {isLoadingProfile ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Profile Information" variant="bordered">
            <div className="space-y-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </Card>
          <Card title="Connected Accounts" variant="bordered">
            <div className="space-y-4 animate-pulse">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </Card>
        </div>
      ) : (
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
                            {account.username || 'Connected'}
                          </p>
                          {account.username && (
                            <p className="text-xs text-gray-500">
                              Account connected
                            </p>
                          )}
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
                    onClick={handleAccountToggle}
                  >
                    {account.isConnected ? 'Disconnect' : 'Connect'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      )}
    </div>
  );
};
