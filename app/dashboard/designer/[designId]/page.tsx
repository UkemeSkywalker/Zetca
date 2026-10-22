import { DesignEditor } from '@/components/designer/DesignEditor';

export default async function DesignPage({ params }: { params: Promise<{ designId: string }> }) {
  const { designId } = await params;
  return <DesignEditor designId={designId} />;
}
