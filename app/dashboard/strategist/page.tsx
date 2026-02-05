import { PageWrapper } from '@/components/layout/PageWrapper';
import { StrategyForm } from '@/components/dashboard/StrategyForm';

export default function StrategistPage() {
  return (
    <PageWrapper
      title="AI Strategy Generator"
      description="Generate a comprehensive social media strategy tailored to your brand"
      showWorkflow={true}
    >
      <StrategyForm />
    </PageWrapper>
  );
}
