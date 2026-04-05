import React from 'react';
import { PageWrapper } from '@/components/layout/PageWrapper';
import { PostsTable } from '@/components/dashboard/PostsTable';

export default function PublisherPage() {
  return (
    <PageWrapper
      title="Content Pipeline"
      description="Manage and curate your cross-platform digital presence."
    >
      <PostsTable />
    </PageWrapper>
  );
}
