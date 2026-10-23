import { Suspense } from 'react';
import { CreateDesign } from '@/components/designer/CreateDesign';

export default function NewDesignPage() {
  return (
    <Suspense>
      <CreateDesign />
    </Suspense>
  );
}
