'use client';

import { use } from 'react';
import { StyleDetail } from '@/components/designer/StyleDetail';

/** One design style: an example, what stays the same, and the price per post */
export default function StylePage({ params }: { params: Promise<{ styleId: string }> }) {
  const { styleId } = use(params);
  return <StyleDetail id={styleId} />;
}
