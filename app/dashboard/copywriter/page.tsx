import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { CaptionEditor } from '@/components/dashboard/CaptionEditor';

export default function CopywriterPage() {
  return (
    <PageWrapper showWorkflow={false}>
      <div className="w-full">
        <CaptionEditor />
      </div>
    </PageWrapper>
  );
}