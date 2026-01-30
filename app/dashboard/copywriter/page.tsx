import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { CaptionEditor } from '@/components/dashboard/CaptionEditor';

export default function CopywriterPage() {
  return (
    <PageWrapper showWorkflow={true}>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Copywriter</h1>
          <p className="text-gray-600">
            Review and edit your AI-generated captions for each social media platform.
          </p>
        </div>
        
        <CaptionEditor />
      </div>
    </PageWrapper>
  );
}