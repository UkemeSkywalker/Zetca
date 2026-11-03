'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createDesign, designerPath } from '@/lib/api/designApi';

/**
 * The photo editor: a blank canvas in the design editor, to add a photo
 * (Photos tab), a background and words to
 */
export default function BlankDesignPage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    createDesign({
      name: 'Untitled design',
      source: 'template',
      doc: { format: 'square', styleId: 'blank', background: { kind: 'solid', color: '#FFFFFF' }, layers: [] },
    }).then(
      (d) => router.replace(`${designerPath(d.designId)}?tab=photos`),
      (e) => setError(e instanceof Error ? e.message : 'Couldn’t open the editor')
    );
  }, [router]);

  return error ? (
    <div className="max-w-md mx-auto mt-16 text-center space-y-3">
      <p className="text-lg font-semibold text-[#0B1C30]">{error}</p>
      <Link href="/dashboard/designer" className="text-sm font-semibold text-primary hover:underline">
        Back to Designer
      </Link>
    </div>
  ) : (
    <div className="h-[60vh] rounded-2xl bg-white/60 animate-pulse" aria-label="Opening the editor" />
  );
}
