import { DesignEditor } from '@/components/designer/DesignEditor';

/**
 * The photo editor: a blank canvas in the design editor, to add a photo
 * (Photos tab), a background and words to. Saved once something is added.
 */
export default function BlankDesignPage() {
  return <DesignEditor draft={{ format: 'square', styleId: 'blank', background: { kind: 'solid', color: '#FFFFFF' }, layers: [] }} />;
}
