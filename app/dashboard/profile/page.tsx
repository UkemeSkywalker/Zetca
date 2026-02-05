'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { ProfileForm } from '@/components/dashboard/ProfileForm';

export default function ProfilePage() {
  return (
    <PageWrapper showWorkflow={false}>
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Profile Settings</h1>
        <ProfileForm />
      </div>
    </PageWrapper>
  );
}
