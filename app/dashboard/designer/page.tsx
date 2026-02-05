'use client';

import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { ImageGenerator } from '@/components/dashboard/ImageGenerator';

export default function DesignerPage() {
  return (
    <PageWrapper showWorkflow={true}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI Image Designer
          </h1>
          <p className="text-gray-600">
            Generate stunning visuals for your social media posts using AI-powered image creation.
          </p>
        </div>

        <ImageGenerator />
      </div>
    </PageWrapper>
  );
}