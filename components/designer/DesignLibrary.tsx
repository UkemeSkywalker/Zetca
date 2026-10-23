'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';
import { FORMATS, FORMAT_IDS, type DesignRecord, type FormatId } from '@/lib/design/types';
import { designToBlob } from '@/lib/design/render';
import { createDesign, deleteDesign, designerPath, listDesigns } from '@/lib/api/designApi';
import { DesignThumb } from './DesignCanvas';
import { FONT_FAMILIES, loadDesignFonts } from './fonts';
import { photosFor } from './photos';
import { CARD, Chip, INPUT, PrimaryButton, timeAgo } from './ui';

export function DesignLibrary() {
  const router = useRouter();
  const [designs, setDesigns] = useState<DesignRecord[] | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [format, setFormat] = useState<FormatId | 'all'>('all');
  const [menu, setMenu] = useState<string | null>(null);

  useEffect(() => {
    listDesigns().then(setDesigns, (err) => {
      setError(err instanceof Error ? err.message : 'Couldn’t load your designs');
      setDesigns([]);
    });
  }, []);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (designs ?? []).filter(
      (d) =>
        (format === 'all' || d.doc.format === format) &&
        (!q || d.name.toLowerCase().includes(q) || d.doc.layers.some((l) => l.text.toLowerCase().includes(q)))
    );
  }, [designs, query, format]);

  const duplicate = async (d: DesignRecord) => {
    setMenu(null);
    try {
      const copy = await createDesign({ name: `${d.name} (copy)`.slice(0, 80), source: d.source, doc: d.doc });
      setDesigns((all) => [copy, ...(all ?? [])]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t copy the design');
    }
  };

  const download = async (d: DesignRecord) => {
    setMenu(null);
    await loadDesignFonts();
    const url = URL.createObjectURL(await designToBlob(d.doc, FONT_FAMILIES, await photosFor(d.doc)));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${d.name.replace(/[^\w-]+/g, '-').toLowerCase() || 'design'}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const remove = async (d: DesignRecord) => {
    setMenu(null);
    if (!window.confirm(`Delete “${d.name}”? This can’t be undone.`)) return;
    try {
      await deleteDesign(d.designId);
      setDesigns((all) => (all ?? []).filter((x) => x.designId !== d.designId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t delete the design');
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/designer" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
            <Icon icon="lucide:chevron-left" className="w-4 h-4" aria-hidden /> Back to Designer
          </Link>
          <h1 className="mt-1 text-[28px] font-bold font-heading text-[#0B1C30]">My designs</h1>
        </div>
        <PrimaryButton type="button" onClick={() => router.push('/dashboard/designer/new')}>
          <Icon icon="lucide:plus" className="w-4 h-4" aria-hidden /> New design
        </PrimaryButton>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {designs !== null && designs.length === 0 && !error ? (
        <EmptyState />
      ) : (
        <>
          <div className={`${CARD} p-4 flex flex-col md:flex-row md:items-center gap-3`}>
            <div className="relative md:w-72">
              <Icon icon="lucide:search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#777587]" aria-hidden />
              <input aria-label="Search designs" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search designs" className={`${INPUT} pl-9 py-2.5`} />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Format">
              <Chip selected={format === 'all'} onClick={() => setFormat('all')}>
                All sizes
              </Chip>
              {FORMAT_IDS.map((id) => (
                <Chip key={id} selected={format === id} onClick={() => setFormat(id)}>
                  {FORMATS[id].label}
                </Chip>
              ))}
            </div>
          </div>

          {designs === null ? (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="aspect-[4/5] rounded-2xl bg-white/70 animate-pulse" />
              ))}
            </div>
          ) : shown.length === 0 ? (
            <p className="text-sm text-[#464555]">No designs match.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
              {shown.map((d) => (
                <div key={d.designId} className={`${CARD} p-3 relative group`}>
                  <Link href={designerPath(d.designId)} aria-label={`Edit ${d.name}`}>
                    <DesignThumb doc={d.doc} className="rounded-xl" />
                  </Link>
                  <div className="mt-3 flex items-start justify-between gap-2 px-1">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#0B1C30] truncate">{d.name}</p>
                      <p className="text-xs text-[#777587]">
                        {FORMATS[d.doc.format].label} · {timeAgo(d.updatedAt)}
                      </p>
                      <span className="mt-2 inline-block rounded-md bg-[#F1F5F9] px-2 py-0.5 text-[11px] font-semibold text-[#464555]">{d.doc.background.kind === 'photo' ? 'Stock photo' : 'Text design'}</span>
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        aria-label={`More for ${d.name}`}
                        aria-expanded={menu === d.designId}
                        onClick={() => setMenu(menu === d.designId ? null : d.designId)}
                        className="p-1.5 rounded-lg text-[#464555] hover:bg-[#F1F5F9]"
                      >
                        <Icon icon="lucide:ellipsis" className="w-5 h-5" aria-hidden />
                      </button>
                      {menu === d.designId && (
                        <div role="menu" className="absolute right-0 bottom-9 z-10 w-40 rounded-xl border border-[#E2E8F0] bg-white p-1 shadow-lg">
                          <MenuItem icon="lucide:pencil" onClick={() => router.push(designerPath(d.designId))}>
                            Edit
                          </MenuItem>
                          <MenuItem icon="lucide:copy" onClick={() => duplicate(d)}>
                            Duplicate
                          </MenuItem>
                          <MenuItem icon="lucide:download" onClick={() => download(d)}>
                            Download
                          </MenuItem>
                          <MenuItem icon="lucide:trash-2" danger onClick={() => remove(d)}>
                            Delete
                          </MenuItem>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: string; children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${danger ? 'text-red-600 hover:bg-red-50' : 'text-[#0B1C30] hover:bg-[#F1F5F9]'}`}
    >
      <Icon icon={icon} className="w-4 h-4" aria-hidden />
      {children}
    </button>
  );
}

function EmptyState() {
  const cards = [
    { bg: '#15803D', color: '#FFFFFF', text: 'SHOW UP', rotate: -8 },
    { bg: '#0B0B0F', color: '#FACC15', text: 'DAY 12', rotate: 0 },
    { bg: '#DC2626', color: '#FFFFFF', text: 'NO EXCUSES', rotate: 8 },
  ];
  return (
    <div className="flex flex-col items-center text-center py-16">
      <div className="relative h-40 w-56" aria-hidden>
        {cards.map((c, i) => (
          <div
            key={c.text}
            className="absolute top-0 h-36 w-28 rounded-xl shadow-lg flex items-end p-3"
            style={{ left: 14 + i * 44, background: c.bg, transform: `rotate(${c.rotate}deg)` }}
          >
            <span className="text-lg font-black leading-none" style={{ color: c.color }}>
              {c.text}
            </span>
          </div>
        ))}
      </div>
      <h2 className="mt-6 text-2xl font-bold font-heading text-[#0B1C30]">No designs yet</h2>
      <p className="mt-1 text-sm text-[#464555]">Make your first one in under a minute.</p>
      <Link href="/dashboard/designer/new" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 h-11 text-sm font-semibold text-white hover:bg-primary-700">
        <Icon icon="lucide:plus" className="w-4 h-4" aria-hidden /> New design
      </Link>
    </div>
  );
}
