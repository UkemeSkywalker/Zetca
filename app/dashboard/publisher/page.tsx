import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { PostsTable } from '@/components/dashboard/PostsTable';

export default function PublisherPage() {
  return (
    <PageWrapper
      title="Content Publisher"
      description="Manage and publish your scheduled social media posts"
      showWorkflow={true}
    >
      <PostsTable />
    </PageWrapper>
  );
}
