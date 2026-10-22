'use client';

import React, { useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import type { DetailsDraft } from '@/lib/youtube/draft';
import { TITLE_MAX, DESCRIPTION_MAX_BYTES, TAGS_MAX_CHARS, MAX_TRANSLATIONS, tagsLength } from '@/lib/models/youtubeVideo';
import { addChapterLine, chapterProblem, parseChapters, withChapters } from '@/lib/youtube/chapters';
import { VIDEO_LANGUAGES, languageName } from '@/lib/youtube/languages';
import { compactNumber, normalize, scoreDescription, scoreTitle } from '@/lib/youtube/research';
import type { KeywordInsight } from '@/lib/api/youtubeApi';
import type { VideoWriterResponse } from '@/lib/models/videoWriter';
import { FieldError, Counter, Select, TagInput, INPUT, SectionCard } from './formKit';
import { WriteWithCopywriter } from './WriteWithCopywriter';
import { TranscriptChapters } from './TranscriptChapters';
import { ChecksList, FieldScore, Highlighted, IconAction, ScoreBadge, SuggestionPanel } from './suggestions';
import { useVideoInsights, type Insights } from './useVideoInsights';
import type { DetailsFormProps } from './formTypes';

type Props = DetailsFormProps;

const LANGUAGE_OPTIONS = VIDEO_LANGUAGES.map((l) => ({ value: l.code, label: l.name }));
const utf8Length = (s: string) => new TextEncoder().encode(s).length;

export function DetailsSection({ draft, update, errors, file, isShort, durationSeconds, options, mediaId }: Props) {
  const [undo, setUndo] = useState<Pick<DetailsDraft, 'title' | 'description' | 'tags'> | null>(null);
  const [showTranslations, setShowTranslations] = useState(draft.translations.length > 0);
  const chapters = useMemo(() => parseChapters(draft.description), [draft.description]);
  const chapterIssue = chapterProblem(chapters, durationSeconds);
  const chaptersOk = chapters.length ? !chapterIssue : null;
  const { insights, run, rewrite } = useVideoInsights();
  const keywords = insights.keywords;

  const request = { title: draft.title, mediaId, language: draft.language || 'en', isShort, chaptersOk };
  const titleScore = useMemo(() => (keywords.length ? scoreTitle(draft.title, keywords) : null), [draft.title, keywords]);
  const descriptionScore = useMemo(
    () => (keywords.length ? scoreDescription(draft.description, keywords, chaptersOk) : null),
    [draft.description, keywords, chaptersOk]
  );

  const applyCopy = (copy: VideoWriterResponse) => {
    setUndo({ title: draft.title, description: draft.description, tags: draft.tags });
    update(copy);
  };

  const addTags = (more: string[]) => {
    const next = [...draft.tags];
    for (const tag of more) {
      if (next.some((t) => normalize(t) === normalize(tag))) continue;
      if (tagsLength([...next, tag]) > TAGS_MAX_CHARS) break;
      next.push(tag);
    }
    update({ tags: next });
  };

  const categoryOptions = options.categories.length
    ? options.categories.map((c) => ({ value: c.id, label: c.title }))
    : [{ value: '22', label: 'People & Blogs' }];

  return (
    <SectionCard id="details" title="Details" subtitle="Title, description and tags viewers see">
      <ResearchCard insights={insights} keywords={keywords} onRun={() => run(request)} hasVideo={!!mediaId} />

      {undo && (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          <span className="flex items-center gap-2">
            <Icon icon="solar:magic-stick-3-linear" className="w-4 h-4 shrink-0" />
            Suggestion applied.
          </span>
          <button
            type="button"
            onClick={() => {
              update(undo);
              setUndo(null);
            }}
            className="font-semibold hover:underline"
          >
            Undo
          </button>
        </div>
      )}

      {/* Title */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <label htmlFor="video-title" className="text-sm font-medium text-on-surface">
            Title <span className="text-red-500">*</span>
          </label>
          <span className="flex items-center gap-2">
            {titleScore && <FieldScore score={titleScore.score} checks={titleScore.checks} label="Title" />}
            <Counter value={draft.title.length} max={TITLE_MAX} />
          </span>
        </div>
        <input
          id="video-title"
          value={draft.title}
          onChange={(e) => update({ title: e.target.value })}
          maxLength={TITLE_MAX + 20}
          placeholder="Add a title that describes your video"
          className={`${INPUT} ${errors.title ? 'border-red-300' : ''}`}
          aria-invalid={!!errors.title}
        />
        <FieldError message={errors.title} />
        {(insights.titles.length > 0 || insights.phase === 'writing') && (
          <SuggestionPanel
            actions={<IconAction icon="solar:refresh-linear" label="New title ideas" onClick={() => rewrite(request)} disabled={insights.phase === 'writing'} />}
          >
            {insights.phase === 'writing' && !insights.titles.length ? (
              <Loading text="Writing titles around the top searches…" />
            ) : (
              <ul className="space-y-1.5">
                {insights.titles.map((t) => (
                  <TitleRow
                    key={t.text}
                    title={t}
                    keywords={keywords}
                    active={t.text === draft.title}
                    onApply={() => {
                      setUndo({ title: draft.title, description: draft.description, tags: draft.tags });
                      update({ title: t.text });
                    }}
                  />
                ))}
              </ul>
            )}
          </SuggestionPanel>
        )}
      </div>

      {/* Description */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
          <label htmlFor="video-description" className="text-sm font-medium text-on-surface">
            Description
          </label>
          <span className="flex items-center gap-3">
            {descriptionScore && <FieldScore score={descriptionScore.score} checks={descriptionScore.checks} label="Description" />}
            <WriteWithCopywriter filename={file?.name ?? draft.title} durationSeconds={durationSeconds} isShort={isShort} language={draft.language} onWritten={applyCopy} />
          </span>
        </div>
        <textarea
          id="video-description"
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          rows={8}
          placeholder="Tell viewers about your video"
          className={`${INPUT} resize-y min-h-[160px] ${errors.description ? 'border-red-300' : ''}`}
          aria-invalid={!!errors.description}
        />
        <div className="mt-1 flex justify-between">
          <FieldError message={errors.description} />
          <span className="ml-auto">
            <Counter value={utf8Length(draft.description)} max={DESCRIPTION_MAX_BYTES} />
          </span>
        </div>

        {(insights.description || insights.phase === 'writing') && (
          <SuggestionPanel
            actions={
              <>
                <IconAction icon="solar:refresh-linear" label="Write it again" onClick={() => rewrite(request)} disabled={insights.phase === 'writing'} />
                {insights.description && (
                  <IconAction
                    icon="solar:add-circle-linear"
                    label="Use this description"
                    onClick={() => {
                      setUndo({ title: draft.title, description: draft.description, tags: draft.tags });
                      // Keep the chapter lines already in the description
                      update({ description: withChapters(insights.description!.text, chapters.map((c) => ({ seconds: c.seconds, title: c.title }))) });
                    }}
                  />
                )}
              </>
            }
          >
            {insights.phase === 'writing' && !insights.description ? (
              <Loading text="Writing a description from what’s said in the video…" />
            ) : insights.description ? (
              <div className="rounded-lg bg-white border border-[#c7c4d8]/30 p-3">
                <div className="flex items-start gap-3">
                  <ScoreBadge score={insights.description.score} className="text-sm" />
                  <p className="flex-1 min-w-0 text-sm text-on-surface whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
                    <Highlighted text={insights.description.text} phrases={keywords.map((k) => k.phrase)} />
                  </p>
                </div>
                <details className="mt-2 ml-7 group">
                  <summary className="cursor-pointer text-[11px] font-semibold text-outline hover:text-on-surface list-none [&::-webkit-details-marker]:hidden">
                    Why this score
                  </summary>
                  <div className="mt-2">
                    <ChecksList checks={insights.description.checks} />
                  </div>
                </details>
              </div>
            ) : null}
          </SuggestionPanel>
        )}

        {/* Chapters */}
        <div className="mt-3 rounded-xl bg-primary-50/70 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-on-surface">Chapters</p>
              <p className="text-xs text-outline">Timestamps in the description split your video into chapters.</p>
            </div>
            <button
              type="button"
              onClick={() => update({ description: addChapterLine(draft.description, durationSeconds) })}
              className="shrink-0 text-xs font-semibold text-primary hover:text-primary-700"
            >
              + Add chapter
            </button>
          </div>
          {chapters.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {chapters.map((c, i) => (
                <span key={`${c.seconds}-${i}`} className="rounded-full bg-white px-3 py-1 text-xs text-on-surface border border-primary-100">
                  <span className="font-semibold tabular-nums">{c.label}</span> {c.title}
                </span>
              ))}
            </div>
          )}
          {chapterIssue && <p className="mt-2 text-xs text-amber-700">{chapterIssue} YouTube won’t show chapters until this is fixed.</p>}
          <TranscriptChapters mediaId={mediaId} onApply={(list) => update({ description: withChapters(draft.description, list) })} />
        </div>
      </div>

      {/* Tags */}
      <div>
        <TagInput
          tags={draft.tags}
          onChange={(tags) => update({ tags })}
          counter={<Counter value={tagsLength(draft.tags)} max={TAGS_MAX_CHARS} />}
          error={errors.tags}
        />
        {insights.tags.length > 0 && (
          <SuggestionPanel
            actions={
              <button
                type="button"
                onClick={() => addTags(insights.tags.map((t) => t.tag))}
                className="px-2 py-1 rounded-md text-xs font-semibold text-primary hover:bg-white"
              >
                Add all
              </button>
            }
          >
            <ul className="flex flex-wrap gap-2">
              {insights.tags.map((t) => {
                const added = draft.tags.some((d) => normalize(d) === normalize(t.tag));
                return (
                  <li key={t.tag}>
                    <button
                      type="button"
                      onClick={() => !added && addTags([t.tag])}
                      disabled={added}
                      title={`Used by ${t.usedBy} of ${t.sampleSize} top videos · median ${compactNumber(t.medianViews)} views`}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors ${
                        added ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-[#c7c4d8]/50 bg-white text-on-surface hover:border-primary/40'
                      }`}
                    >
                      <ScoreBadge score={t.score} />
                      {t.tag}
                      <Icon icon={added ? 'solar:check-read-linear' : 'solar:add-circle-linear'} className="w-3.5 h-3.5 text-outline" />
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2.5 text-[11px] text-outline">
              Tags the top videos for these searches really use. The score combines how many use a tag and how well those videos do.
            </p>
          </SuggestionPanel>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select label="Category" value={draft.categoryId} onChange={(categoryId) => update({ categoryId })} options={categoryOptions} error={errors.categoryId} />
        <Select label="Video language" value={draft.language} onChange={(language) => update({ language })} options={LANGUAGE_OPTIONS} error={errors.language} />
      </div>

      <div className="border-t border-[#c7c4d8]/30 pt-4">
        <button
          type="button"
          onClick={() => setShowTranslations((s) => !s)}
          aria-expanded={showTranslations}
          className="w-full flex items-center justify-between text-sm text-on-surface text-left"
        >
          <span>
            <span className="font-medium">Translations</span>
            <span className="text-outline">: add the title and description in other languages</span>
            {draft.translations.length > 0 && <span className="text-primary font-semibold"> ({draft.translations.length})</span>}
          </span>
          <Icon icon="solar:alt-arrow-down-linear" className={`w-4 h-4 shrink-0 text-outline transition-transform ${showTranslations ? 'rotate-180' : ''}`} />
        </button>
        {showTranslations && <Translations draft={draft} update={update} errors={errors} />}
      </div>
    </SectionCard>
  );
}

function Loading({ text }: { text: string }) {
  return (
    <p className="flex items-center gap-2 py-1 text-xs text-outline">
      <Icon icon="svg-spinners:ring-resize" className="w-4 h-4 text-primary" />
      {text}
    </p>
  );
}

/** The research card at the top of Details: start it, see progress, see the searches found */
function ResearchCard({ insights, keywords, onRun, hasVideo }: { insights: Insights; keywords: KeywordInsight[]; onRun: () => void; hasVideo: boolean }) {
  const busy = insights.phase === 'researching' || insights.phase === 'writing';
  return (
    <div className="rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50/80 to-white p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
            <Icon icon="mdi:youtube" className="w-5 h-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-on-surface">YouTube suggestions</p>
            <p className="text-xs text-outline">
              {hasVideo
                ? 'From what’s said in your video and what ranks on YouTube right now.'
                : 'From your title and what ranks on YouTube right now. Better once the upload finishes.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={busy}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60 shrink-0"
        >
          {busy ? <Icon icon="svg-spinners:ring-resize" className="w-4 h-4" /> : <Icon icon="solar:magic-stick-3-linear" className="w-4 h-4" />}
          {insights.phase === 'researching' ? 'Searching YouTube…' : insights.phase === 'writing' ? 'Writing…' : keywords.length ? 'Refresh' : 'Get suggestions'}
        </button>
      </div>

      {insights.phase === 'error' && (
        <p role="alert" className="mt-3 text-xs font-medium text-red-600">
          {insights.error}
        </p>
      )}
      {insights.writeError && (
        <p role="alert" className="mt-3 text-xs font-medium text-amber-700">
          Keywords and tags are ready, but writing titles failed: {insights.writeError}
        </p>
      )}

      {keywords.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-outline mb-2">Top searches for this video</p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {keywords.map((k) => (
              <li key={k.phrase} className="rounded-lg bg-white border border-[#c7c4d8]/30 px-3 py-2">
                <div className="flex items-center gap-2">
                  <ScoreBadge score={k.score} className="text-sm" />
                  <span className="text-sm font-medium text-on-surface">{k.phrase}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-outline">
                  Top {k.sampleSize}: median {compactNumber(k.medianViews)} views · {k.recentCount} from the last 6 months · {k.strongCompetitors} strong rivals
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TitleRow({
  title,
  keywords,
  active,
  onApply,
}: {
  title: { text: string; score: number; checks: { ok: boolean; label: string }[] };
  keywords: KeywordInsight[];
  active: boolean;
  onApply: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <li className={`rounded-lg border bg-white ${active ? 'border-emerald-200' : 'border-[#c7c4d8]/30'}`}>
      <div className="flex items-center gap-3 px-3 py-2">
        <ScoreBadge score={title.score} className="text-sm w-6 text-center shrink-0" />
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-1 min-w-0 text-left text-sm text-on-surface" aria-expanded={open}>
          <Highlighted text={title.text} phrases={keywords.map((k) => k.phrase)} />
        </button>
        <button
          type="button"
          onClick={onApply}
          disabled={active}
          aria-label={active ? 'This is your title' : `Use title: ${title.text}`}
          className={`p-1.5 rounded-md shrink-0 ${active ? 'text-emerald-600' : 'text-outline hover:text-primary hover:bg-primary-50'}`}
        >
          <Icon icon={active ? 'solar:check-circle-bold' : 'solar:check-read-linear'} className="w-4 h-4" />
        </button>
      </div>
      {open && (
        <div className="px-3 pb-2.5 pl-12">
          <ChecksList checks={title.checks} />
        </div>
      )}
    </li>
  );
}

function Translations({ draft, update, errors }: Pick<Props, 'draft' | 'update' | 'errors'>) {
  const used = new Set([draft.language, ...draft.translations.map((t) => t.language)]);
  const available = VIDEO_LANGUAGES.filter((l) => !used.has(l.code));
  const [adding, setAdding] = useState('');

  const set = (i: number, patch: Partial<DetailsDraft['translations'][number]>) =>
    update({ translations: draft.translations.map((t, j) => (j === i ? { ...t, ...patch } : t)) });

  return (
    <div className="mt-4 space-y-4">
      {draft.translations.map((t, i) => (
        <div key={t.language} className="rounded-xl border border-[#c7c4d8]/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-on-surface">{languageName(t.language)}</span>
            <button
              type="button"
              onClick={() => update({ translations: draft.translations.filter((_, j) => j !== i) })}
              className="text-xs font-semibold text-outline hover:text-red-600"
            >
              Remove
            </button>
          </div>
          <input
            value={t.title}
            onChange={(e) => set(i, { title: e.target.value })}
            placeholder={`Title in ${languageName(t.language)}`}
            aria-label={`Title in ${languageName(t.language)}`}
            className={INPUT}
          />
          <FieldError message={errors[`translations.${i}.title`]} />
          <textarea
            value={t.description}
            onChange={(e) => set(i, { description: e.target.value })}
            rows={3}
            placeholder={`Description in ${languageName(t.language)}`}
            aria-label={`Description in ${languageName(t.language)}`}
            className={`${INPUT} resize-y`}
          />
          <FieldError message={errors[`translations.${i}.description`]} />
        </div>
      ))}
      {draft.translations.length < MAX_TRANSLATIONS && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <Select
              label="Add a language"
              value={adding}
              onChange={setAdding}
              placeholder="Choose a language"
              options={available.map((l) => ({ value: l.code, label: l.name }))}
            />
          </div>
          <button
            type="button"
            disabled={!adding}
            onClick={() => {
              update({ translations: [...draft.translations, { language: adding, title: draft.title, description: '' }] });
              setAdding('');
            }}
            className="rounded-xl bg-white border border-[#c7c4d8]/50 px-4 py-3 text-sm font-semibold text-on-surface hover:border-primary/40 hover:text-primary disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
      <FieldError message={errors.translations} />
    </div>
  );
}
