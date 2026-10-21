'use client';

import React, { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import type { DetailsDraft } from '@/lib/youtube/draft';
import { VIDEO_LANGUAGES } from '@/lib/youtube/languages';
import { createPlaylist, uploadCaptions } from '@/lib/api/youtubeApi';
import { SectionCard, FieldError, Toggle, RadioRow, Select, INPUT } from './formKit';
import { ThumbnailPicker } from './ThumbnailPicker';
import { DetailsSection } from './DetailsSection';
import type { DetailsFormProps } from './formTypes';

export const SECTIONS = [
  { id: 'details', label: 'Details' },
  { id: 'thumbnail', label: 'Thumbnail' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'audience', label: 'Audience' },
  { id: 'disclosures', label: 'Disclosures' },
  { id: 'more', label: 'More options' },
  { id: 'visibility', label: 'Visibility' },
] as const;

const LANGUAGE_OPTIONS = VIDEO_LANGUAGES.map((l) => ({ value: l.code, label: l.name }));

export type { FormOptions } from './formTypes';
type Props = DetailsFormProps;

export function VideoDetailsForm(props: Props) {
  return (
    <div className="space-y-6">
      <DetailsSection {...props} />
      <SectionCard id="thumbnail" title="Thumbnail" subtitle="Pick an image that shows what your video is about">
        <ThumbnailPicker
          file={props.file}
          isShort={props.isShort}
          value={props.draft.thumbnailMediaId}
          onChange={(thumbnailMediaId) => props.update({ thumbnailMediaId })}
          error={props.errors.thumbnailMediaId}
        />
      </SectionCard>
      <PlaylistsSection {...props} />
      <AudienceSection {...props} />
      <DisclosuresSection {...props} />
      <MoreOptionsSection {...props} />
      <VisibilitySection {...props} />
      <StudioOnlyCard />
    </div>
  );
}

function PlaylistsSection({ draft, update, errors, options, onPlaylistCreated }: Props) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const toggle = (id: string) =>
    update({
      playlistIds: draft.playlistIds.includes(id) ? draft.playlistIds.filter((p) => p !== id) : [...draft.playlistIds, id],
    });

  const create = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const playlist = await createPlaylist(name);
      onPlaylistCreated(playlist);
      update({ playlistIds: [...draft.playlistIds, playlist.id] });
      setName('');
      setCreating(false);
    } catch (err) {
      setProblem((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard
      id="playlists"
      title="Playlists"
      subtitle="Add your video to one or more playlists"
      action={
        !creating && !options.error ? (
          <button type="button" onClick={() => setCreating(true)} className="shrink-0 text-sm font-semibold text-primary hover:text-primary-700">
            + New playlist
          </button>
        ) : undefined
      }
    >
      {creating && (
        <div className="flex flex-wrap gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                e.preventDefault();
                create();
              }
            }}
            autoFocus
            maxLength={150}
            placeholder="Playlist name"
            aria-label="New playlist name"
            className={`${INPUT} flex-1 min-w-[200px]`}
          />
          <button
            type="button"
            onClick={create}
            disabled={busy || !name.trim()}
            className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
          <button type="button" onClick={() => setCreating(false)} className="px-2 text-sm font-semibold text-outline hover:text-on-surface">
            Cancel
          </button>
          <p className="w-full text-xs text-outline">The playlist is created on your channel now, as public.</p>
          <FieldError message={problem ?? undefined} />
        </div>
      )}

      {options.loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 rounded-xl bg-surface-container-low animate-pulse" />
          ))}
        </div>
      ) : options.error ? (
        <p className="text-sm text-red-600">{options.error}</p>
      ) : options.playlists.length === 0 ? (
        <p className="text-sm text-outline">Your channel has no playlists yet.</p>
      ) : (
        <ul className="space-y-1 max-h-[320px] overflow-y-auto">
          {options.playlists.map((p) => {
            const checked = draft.playlistIds.includes(p.id);
            return (
              <li key={p.id}>
                <label
                  className={`flex items-center gap-3 rounded-xl px-4 py-2.5 cursor-pointer transition-colors ${
                    checked ? 'bg-primary-50/70' : 'hover:bg-surface-container-low'
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggle(p.id)} className="h-4 w-4 accent-[#4f46e5]" />
                  <span className="flex-1 text-sm text-on-surface">{p.title}</span>
                  <span className="text-xs text-outline">
                    {p.itemCount} {p.itemCount === 1 ? 'video' : 'videos'}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
      <FieldError message={errors.playlistIds} />
    </SectionCard>
  );
}

function AudienceSection({ draft, update, errors }: Props) {
  return (
    <SectionCard id="audience" title="Audience" required subtitle="This is required by YouTube’s rules for children’s content">
      <div className="space-y-3" role="radiogroup" aria-label="Is this video made for kids?">
        <RadioRow
          name="madeForKids"
          label="Yes, it’s made for kids"
          description="Content primarily directed to children. Comments and some features are turned off."
          checked={draft.madeForKids === true}
          onSelect={() => update({ madeForKids: true })}
        />
        <RadioRow
          name="madeForKids"
          label="No, it’s not made for kids"
          description="Regardless of your location, you’re legally required to comply with COPPA and other laws."
          checked={draft.madeForKids === false}
          onSelect={() => update({ madeForKids: false })}
        />
      </div>
      <FieldError message={errors.madeForKids} />
    </SectionCard>
  );
}

function DisclosuresSection({ draft, update }: Props) {
  return (
    <SectionCard id="disclosures" title="Disclosures" subtitle="Let viewers know about promotions and AI use">
      <Toggle
        label="Paid promotion"
        description="My video has paid promotion like a product placement, sponsorship or endorsement."
        checked={draft.paidPromotion}
        onChange={(paidPromotion) => update({ paidPromotion })}
      />
      <div>
        <p className="text-sm font-medium text-on-surface">Altered or synthetic content</p>
        <p className="text-xs text-outline mt-0.5">
          Realistic content that was made or changed with AI or other tools, e.g. a real person saying something they didn’t.
        </p>
        <div className="mt-3 flex gap-3" role="radiogroup" aria-label="Altered or synthetic content">
          {[
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ].map((o) => (
            <label key={o.label} className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
              <input
                type="radio"
                name="alteredContent"
                checked={draft.alteredContent === o.value}
                onChange={() => update({ alteredContent: o.value })}
                className="h-4 w-4 accent-[#4f46e5]"
              />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}

function MoreOptionsSection({ draft, update, errors }: Props) {
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const addCaptions = async (file: File) => {
    setProblem(null);
    if (!/\.(srt|vtt)$/i.test(file.name)) {
      setProblem('Choose an .srt or .vtt file.');
      return;
    }
    if (file.size > 1024 * 1024) {
      setProblem('Captions files can be up to 1 MB.');
      return;
    }
    setBusy(true);
    try {
      const { key, filename } = await uploadCaptions(file.name, await file.text());
      update({ captions: { key, filename, language: draft.captions?.language ?? draft.language } });
    } catch (err) {
      setProblem((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SectionCard id="more" title="More options" subtitle="Captions, licence and other settings">
      <div>
        <p className="text-sm font-medium text-on-surface mb-1.5">Captions</p>
        <div className="flex flex-wrap items-center gap-3">
          {draft.captions ? (
            <span className="flex items-center gap-2 rounded-xl bg-surface-container-low px-4 py-2.5 text-sm text-on-surface">
              <Icon icon="solar:subtitles-linear" className="w-4 h-4 text-primary" />
              <span className="max-w-[200px] truncate">{draft.captions.filename}</span>
              <button
                type="button"
                onClick={() => update({ captions: undefined })}
                className="text-outline hover:text-red-600"
                aria-label="Remove captions file"
              >
                <Icon icon="solar:close-circle-linear" className="w-4 h-4" />
              </button>
            </span>
          ) : (
            <label className="flex items-center gap-2 rounded-xl bg-white border border-[#c7c4d8]/50 px-4 py-2.5 text-sm font-semibold text-on-surface hover:border-primary/40 hover:text-primary cursor-pointer">
              {busy ? <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" /> : <Icon icon="solar:upload-linear" className="w-4 h-4" />}
              Upload captions file
              <input
                type="file"
                accept=".srt,.vtt,text/vtt,application/x-subrip"
                className="sr-only"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) addCaptions(f);
                }}
              />
            </label>
          )}
          <span className="text-xs text-outline">.srt or .vtt</span>
          {draft.captions && (
            <div className="w-full sm:w-56">
              <Select
                label="Caption language"
                value={draft.captions.language}
                onChange={(language) => update({ captions: { ...draft.captions!, language } })}
                options={LANGUAGE_OPTIONS}
              />
            </div>
          )}
        </div>
        <FieldError message={problem ?? errors.captions} />
      </div>

      <div className="max-w-[240px]">
        <label htmlFor="recording-date" className="block text-sm font-medium text-on-surface mb-1.5">
          Recording date
        </label>
        <input
          id="recording-date"
          type="date"
          value={draft.recordingDate}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => update({ recordingDate: e.target.value })}
          className={INPUT}
        />
      </div>

      <div>
        <p className="text-sm font-medium text-on-surface mb-2">Licence</p>
        <div className="space-y-2" role="radiogroup" aria-label="Licence">
          <RadioRow
            name="license"
            label="Standard YouTube Licence"
            checked={draft.license === 'youtube'}
            onSelect={() => update({ license: 'youtube' })}
          />
          <RadioRow
            name="license"
            label="Creative Commons – Attribution"
            description="Others may reuse your video if they credit you."
            checked={draft.license === 'creativeCommon'}
            onSelect={() => update({ license: 'creativeCommon' })}
          />
        </div>
      </div>

      <Toggle label="Allow embedding" checked={draft.embeddable} onChange={(embeddable) => update({ embeddable })} />
      <Toggle
        label="Show how many viewers like this video"
        checked={draft.publicStatsViewable}
        onChange={(publicStatsViewable) => update({ publicStatsViewable })}
      />
    </SectionCard>
  );
}

function VisibilitySection({ draft, update, errors, timeZones }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const canSchedule = draft.privacyStatus === 'public';
  const setPrivacy = (privacyStatus: DetailsDraft['privacyStatus']) =>
    update({ privacyStatus, ...(privacyStatus !== 'public' ? { publishMode: 'now' as const } : {}) });

  return (
    <SectionCard id="visibility" title="Visibility" subtitle="Choose when and how your video goes public">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Visibility">
        <RadioRow name="privacy" label="Public" description="Everyone can watch" checked={draft.privacyStatus === 'public'} onSelect={() => setPrivacy('public')} />
        <RadioRow name="privacy" label="Unlisted" description="Anyone with the link" checked={draft.privacyStatus === 'unlisted'} onSelect={() => setPrivacy('unlisted')} />
        <RadioRow name="privacy" label="Private" description="Only you" checked={draft.privacyStatus === 'private'} onSelect={() => setPrivacy('private')} />
      </div>

      <div>
        <div className="inline-flex rounded-xl bg-surface-container-low p-1" role="tablist" aria-label="When to publish">
          {(['now', 'schedule'] as const).map((mode) => {
            const active = draft.publishMode === mode;
            const disabled = mode === 'schedule' && !canSchedule;
            return (
              <button
                key={mode}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={disabled}
                onClick={() => update({ publishMode: mode })}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  active ? 'bg-white text-primary shadow-sm' : 'text-outline hover:text-on-surface'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {mode === 'now' ? 'Publish now' : 'Schedule'}
              </button>
            );
          })}
        </div>
        {!canSchedule && <p className="mt-2 text-xs text-outline">Only public videos can be scheduled. This one goes up as soon as it’s uploaded.</p>}
        {draft.publishMode === 'now' && canSchedule && (
          <p className="mt-2 text-xs text-outline">Zetca uploads it straight away and it goes public when YouTube finishes processing.</p>
        )}
        <FieldError message={errors.publishMode} />
      </div>

      {draft.publishMode === 'schedule' && (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.4fr] gap-3">
          <div>
            <label htmlFor="publish-date" className="block text-xs font-medium text-outline mb-1">
              Date
            </label>
            <input
              id="publish-date"
              type="date"
              min={today}
              value={draft.scheduledDate}
              onChange={(e) => update({ scheduledDate: e.target.value })}
              className={INPUT}
              aria-invalid={!!errors.scheduledDate}
            />
            <FieldError message={errors.scheduledDate} />
          </div>
          <div>
            <label htmlFor="publish-time" className="block text-xs font-medium text-outline mb-1">
              Time
            </label>
            <input
              id="publish-time"
              type="time"
              value={draft.scheduledTime}
              onChange={(e) => update({ scheduledTime: e.target.value })}
              className={INPUT}
              aria-invalid={!!errors.scheduledTime}
            />
            <FieldError message={errors.scheduledTime} />
          </div>
          <Select
            label="Time zone"
            value={draft.timeZone}
            onChange={(timeZone) => update({ timeZone })}
            options={timeZones.map((tz) => ({ value: tz, label: tz.replace(/_/g, ' ') }))}
            error={errors.timeZone}
          />
        </div>
      )}

      <Toggle
        label="Notify subscribers"
        description="Let subscribers know when this video goes public."
        checked={draft.notifySubscribers}
        onChange={(notifySubscribers) => update({ notifySubscribers })}
      />
    </SectionCard>
  );
}

function StudioOnlyCard() {
  const items = [
    { icon: 'solar:list-check-linear', label: 'Automatic chapters' },
    { icon: 'solar:users-group-rounded-linear', label: 'Collaborations' },
    { icon: 'solar:chat-round-dots-linear', label: 'Comments and ratings' },
    { icon: 'solar:refresh-circle-linear', label: 'Shorts remixing' },
    { icon: 'solar:shield-user-linear', label: 'Age restriction' },
    { icon: 'solar:copyright-linear', label: 'Copyright checks' },
  ];
  return (
    <section className="rounded-2xl bg-primary-50/50 border border-primary-100 p-6">
      <p className="flex items-center gap-2 text-sm text-on-surface">
        <Icon icon="solar:info-circle-linear" className="w-5 h-5 text-primary" />
        YouTube only lets you change these in YouTube Studio:
      </p>
      <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm text-outline">
            <Icon icon={item.icon} className="w-4 h-4" />
            {item.label}
          </li>
        ))}
      </ul>
      <a
        href="https://studio.youtube.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-white border border-[#c7c4d8]/50 px-4 py-2.5 text-sm font-semibold text-on-surface hover:border-primary/40 hover:text-primary"
      >
        Open in YouTube Studio
        <Icon icon="solar:arrow-right-up-linear" className="w-4 h-4" />
      </a>
    </section>
  );
}
