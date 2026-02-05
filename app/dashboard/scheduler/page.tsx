import { PageWrapper } from '@/components/layout/PageWrapper';
import { Scheduler } from '@/components/dashboard/Scheduler';

export default function SchedulerPage() {
  return (
    <PageWrapper 
      title="Content Scheduler"
      description="Schedule your social media posts across different platforms"
      showWorkflow={true}
    >
      <Scheduler />
    </PageWrapper>
  );
}