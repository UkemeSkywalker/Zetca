import { Suspense } from 'react';
import { CopywriterWorkspace } from '@/components/copywriter/CopywriterWorkspace';

export default function CopywriterPage() {
  // The workspace reads ?strategy= from the URL, which needs a Suspense boundary
  return (
    <Suspense>
      <CopywriterWorkspace />
    </Suspense>
  );
}
