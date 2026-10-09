'use client';

import { Icon } from '@iconify/react';
import { useState } from 'react';
import type { CopyRecord } from '@/types/agent';
import { updateCopy } from '@/lib/api/copyClient';
import { manualSchedule } from '@/lib/api/schedulerClient';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MediaUploader from '@/components/dashboard/MediaUploader';
import { clipboardText, copyToClipboard, formatHashtags, platformInfo } from './platforms';

const LABEL_MD = 'text-[13px] leading-[18px] tracking-[0.01em] font-semibold';
const LABEL_SM = 'text-[11px] leading-[14px] tracking-[0.05em] font-bold';

interface CopyEditorProps {
  copy: CopyRecord;
  onBack: () => void;
  onSaved: (copy: CopyRecord) => void;
  onDelete: () => Promise<void>;
}

/** Edit one copy in place: text, hashtags and media, then save, copy or schedule it */
export function CopyEditor({ copy, onBack, onSaved, onDelete }: CopyEditorProps) {
  const platform = platformInfo(copy.platform);
  const [text, setText] = useState(copy.text);
  const [hashtags, setHashtags] = useState(() => formatHashtags(copy.hashtags));
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [media, setMedia] = useState<{ id: string; type: 'image' | 'video' } | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleErrors, setScheduleErrors] = useState<{ date?: string; time?: string }>({});
  const [scheduling, setScheduling] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = text !== copy.text || hashtags.join(' ') !== formatHashtags(copy.hashtags).join(' ');
  const over = text.length > platform.limit;

  const flash = (message: string) => {
    setNotice(message);
    setTimeout(() => setNotice(null), 2200);
  };

  const save = async (): Promise<CopyRecord | null> => {
    if (!text.trim()) {
      setError('The copy can’t be empty.');
      return null;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await updateCopy(copy.id, text.trim(), hashtags);
      onSaved(saved);
      flash('Saved');
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save the copy.');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const back = () => {
    if (dirty && !window.confirm('Discard your unsaved changes?')) return;
    onBack();
  };

  const addTag = () => {
    const tags = newTag
      .split(/[\s,]+/)
      .map((t) => t.replace(/^#+/, '').trim())
      .filter(Boolean)
      .map((t) => `#${t}`)
      .filter((t) => !hashtags.includes(t));
    if (tags.length) setHashtags([...hashtags, ...tags]);
    setNewTag('');
  };

  const schedule = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { date?: string; time?: string } = {};
    if (!scheduleDate) errors.date = 'Date is required';
    else if (new Date(`${scheduleDate}T${scheduleTime}`) <= new Date()) errors.date = 'Pick a time in the future';
    if (!scheduleTime) errors.time = 'Time is required';
    if (errors.date || errors.time) {
      setScheduleErrors(errors);
      return;
    }
    setScheduling(true);
    setError(null);
    try {
      // Schedule what's on screen, saving it first so the copy and the post match
      if (dirty && !(await save())) return;
      await manualSchedule({
        copyId: copy.id,
        scheduledDate: scheduleDate,
        scheduledTime: scheduleTime,
        platform: platform.id,
        ...(media ? { mediaId: media.id, mediaType: media.type } : {}),
      });
      setScheduleOpen(false);
      flash('Scheduled');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to schedule the post.');
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label="Back to all copies"
          title="Back to all copies"
          className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#0b1c30] hover:bg-[#e5eeff] shrink-0"
        >
          <Icon icon="material-symbols:arrow-back" width={20} height={20} />
        </button>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${platform.badge}`}>
          <Icon icon={platform.icon} width={16} height={16} />
        </span>
        <div className="min-w-0">
          <p className="text-[17px] font-bold text-[#0b1c30] leading-tight">{platform.label} copy</p>
          {copy.angle && <p className={`${LABEL_SM} text-[#777587] mt-0.5`}>{copy.angle}</p>}
        </div>
        {notice && (
          <span className={`ml-auto inline-flex items-center gap-1 text-emerald-700 ${LABEL_MD}`} role="status">
            <Icon icon="material-symbols:check-circle" width={16} height={16} />
            <span className="text-inherit">{notice}</span>
          </span>
        )}
      </div>

      {error && (
        <div className="bg-[#ffdad6]/60 text-[#93000a] rounded-xl px-4 py-3 text-[13px] font-medium flex items-center gap-2" role="alert">
          <Icon icon="material-symbols:error-outline" width={18} height={18} />
          <span className="text-inherit flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="text-inherit">
            <Icon icon="material-symbols:close" width={16} height={16} />
          </button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-[#c7c4d8]/25 overflow-hidden">
        <label htmlFor="copy-text" className="sr-only">Copy text</label>
        <textarea
          id="copy-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          className="w-full p-5 text-[16px] leading-[26px] text-[#0b1c30] bg-transparent resize-y focus:outline-none min-h-[200px]"
          placeholder="Write your copy…"
        />

        <div className="px-5 pb-4 flex flex-wrap items-center gap-1.5">
          {hashtags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[#e2dfff] text-[#3525cd] text-[12px] font-semibold">
              <span className="text-inherit">{tag}</span>
              <button
                type="button"
                onClick={() => setHashtags(hashtags.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-[#3525cd]/10 text-inherit"
              >
                <Icon icon="material-symbols:close" width={12} height={12} />
              </button>
            </span>
          ))}
          <label htmlFor="copy-new-tag" className="sr-only">Add hashtags</label>
          <input
            id="copy-new-tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="+ hashtag"
            className="w-28 px-2.5 py-1 rounded-full bg-[#eff4ff] text-[12px] font-semibold text-[#0b1c30] placeholder:text-[#777587] focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
          />
        </div>

        <div className="px-5 pb-5">
          <MediaUploader
            onMediaAttached={(id, type) => setMedia({ id, type })}
            onMediaRemoved={() => setMedia(null)}
            disabled={scheduling}
          />
        </div>

        <div className="px-5 py-3 border-t border-[#e5eeff] flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className={`${LABEL_SM} ${over ? 'text-[#ba1a1a]' : 'text-[#777587]'}`}>
            {text.length.toLocaleString()} / {platform.limit.toLocaleString()} characters
            {over && ' · too long'}
          </span>
          <span className={`${LABEL_SM} text-[#777587]`}>{hashtags.length} hashtags</span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (await copyToClipboard(clipboardText(text, hashtags))) flash('Copied');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#464555] hover:bg-[#eff4ff] ${LABEL_MD}`}
            >
              <Icon icon="material-symbols:content-copy-outline" width={16} height={16} />
              <span className="text-inherit">Copy</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setScheduleErrors({});
                setScheduleOpen(true);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#464555] hover:bg-[#eff4ff] ${LABEL_MD}`}
            >
              <Icon icon="material-symbols:calendar-month-outline" width={16} height={16} />
              <span className="text-inherit">Schedule</span>
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!dirty || saving}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4f46e5] text-white hover:opacity-95 disabled:opacity-40 ${LABEL_MD}`}
            >
              {saving && <Icon icon="material-symbols:progress-activity" width={16} height={16} className="animate-spin" />}
              <span className="text-inherit">{saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-[#464555] flex items-center gap-1.5">
          <Icon icon="material-symbols:auto-awesome" width={16} height={16} className="text-[#4f46e5]" />
          <span className="text-inherit">Ask the copywriter on the right to rewrite this copy.</span>
        </p>
        <button
          type="button"
          disabled={deleting}
          onClick={async () => {
            if (!window.confirm('Delete this copy?')) return;
            setDeleting(true);
            try {
              await onDelete();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to delete the copy.');
              setDeleting(false);
            }
          }}
          className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[#ba1a1a] hover:bg-[#ffdad6]/60 disabled:opacity-50 ${LABEL_MD}`}
        >
          <Icon icon="material-symbols:delete-outline" width={16} height={16} />
          <span className="text-inherit">{deleting ? 'Deleting…' : 'Delete'}</span>
        </button>
      </div>

      <Modal
        isOpen={scheduleOpen}
        onClose={() => {
          if (!scheduling) setScheduleOpen(false);
        }}
        title="Schedule post"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setScheduleOpen(false)} disabled={scheduling}>
              Cancel
            </Button>
            <Button type="submit" form="copy-schedule-form" isLoading={scheduling} disabled={scheduling}>
              Schedule
            </Button>
          </>
        }
      >
        <form id="copy-schedule-form" onSubmit={schedule} className="space-y-4">
          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-line">{text}</p>
          {dirty && <p className="text-xs text-gray-500">Your changes will be saved before scheduling.</p>}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              value={scheduleDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setScheduleDate(e.target.value);
                setScheduleErrors((prev) => ({ ...prev, date: undefined }));
              }}
              error={scheduleErrors.date}
              id="copy-schedule-date"
            />
            <Input
              label="Time"
              type="time"
              value={scheduleTime}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setScheduleTime(e.target.value);
                setScheduleErrors((prev) => ({ ...prev, time: undefined }));
              }}
              error={scheduleErrors.time}
              id="copy-schedule-time"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
