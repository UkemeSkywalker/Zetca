'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
import MediaUploader from '@/components/dashboard/MediaUploader';
import { Post } from '@/types/post';
import { ScheduledPost } from '@/types/scheduler';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSchedulePost: (post: Omit<Post, 'id' | 'createdAt'>) => Promise<void> | void;
  editingPost?: Post | null;
  prefillContent?: string;
  prefillPlatform?: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  prefillHashtags?: string[];
  editingScheduledPost?: ScheduledPost | null;
  prefillMediaId?: string;
  prefillMediaType?: 'image' | 'video';
  prefillMediaUrl?: string;
}

interface FormData {
  content: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  date: string;
  time: string;
  hashtags: string[];
}

interface FormErrors {
  content?: string;
  platform?: string;
  date?: string;
  time?: string;
}

const platformOptions = [
  { value: 'linkedin', label: 'LinkedIn', icon: 'simple-icons:linkedin', color: '#0A66C2' },
  { value: 'twitter', label: 'X / Twitter', icon: 'ri:twitter-x-fill', color: '#000000' },
  { value: 'instagram', label: 'Instagram', icon: 'simple-icons:instagram', color: '#E4405F' },
  { value: 'facebook', label: 'Facebook', icon: 'simple-icons:facebook', color: '#1877F2' },
];

const MAX_CHARS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  instagram: 2200,
  facebook: 63206,
};

export function SchedulingModal({
  isOpen, onClose, selectedDate, onSchedulePost,
  editingPost = null, prefillContent, prefillPlatform, prefillHashtags,
  editingScheduledPost = null, prefillMediaId, prefillMediaType, prefillMediaUrl,
}: SchedulingModalProps) {
  const formatLocalDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const getInitialFormData = (): FormData => {
    if (editingScheduledPost) {
      return { content: editingScheduledPost.content, platform: editingScheduledPost.platform as FormData['platform'], date: editingScheduledPost.scheduledDate, time: editingScheduledPost.scheduledTime, hashtags: editingScheduledPost.hashtags || [] };
    }
    if (editingPost) {
      return { content: editingPost.content, platform: editingPost.platform, date: formatLocalDate(new Date(editingPost.scheduledDate)), time: editingPost.scheduledTime, hashtags: [] };
    }
    return { content: prefillContent || '', platform: prefillPlatform || 'linkedin', date: selectedDate ? formatLocalDate(selectedDate) : '', time: '09:00', hashtags: prefillHashtags || [] };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaId, setMediaId] = useState<string | null>(prefillMediaId ?? editingPost?.mediaId ?? null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(prefillMediaType ?? editingPost?.mediaType ?? null);
  const [isMediaUploading, setIsMediaUploading] = useState(false);

  const isEditing = !!(editingPost || editingScheduledPost);
  const maxChars = MAX_CHARS[formData.platform] || 3000;

  useEffect(() => {
    if (editingScheduledPost) {
      setFormData({ content: editingScheduledPost.content, platform: editingScheduledPost.platform as FormData['platform'], date: editingScheduledPost.scheduledDate, time: editingScheduledPost.scheduledTime, hashtags: editingScheduledPost.hashtags || [] });
    } else if (editingPost) {
      setFormData({ content: editingPost.content, platform: editingPost.platform, date: formatLocalDate(new Date(editingPost.scheduledDate)), time: editingPost.scheduledTime, hashtags: [] });
      setMediaId(editingPost.mediaId ?? null);
      setMediaType(editingPost.mediaType ?? null);
    } else if (prefillContent || prefillPlatform) {
      setFormData(prev => ({ ...prev, content: prefillContent || prev.content, platform: prefillPlatform || prev.platform, hashtags: prefillHashtags || prev.hashtags, date: selectedDate ? formatLocalDate(selectedDate) : prev.date }));
    } else if (selectedDate) {
      setFormData(prev => ({ ...prev, date: formatLocalDate(selectedDate) }));
    }
  }, [editingPost, editingScheduledPost, selectedDate, prefillContent, prefillPlatform, prefillHashtags]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    if (isOpen) { document.addEventListener('keydown', handleEsc); document.body.style.overflow = 'hidden'; }
    return () => { document.removeEventListener('keydown', handleEsc); document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.content.trim()) newErrors.content = 'Content is required';
    else if (formData.content.length > maxChars) newErrors.content = `Must be ${maxChars.toLocaleString()} characters or less`;
    if (!formData.platform) newErrors.platform = 'Platform is required';
    if (!formData.date) newErrors.date = 'Date is required';
    else { const dt = new Date(`${formData.date}T${formData.time}`); if (dt <= new Date()) newErrors.date = 'Must be in the future'; }
    if (!formData.time) newErrors.time = 'Time is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, minutes] = formData.time.split(':').map(Number);
      const scheduledDate = new Date(year, month - 1, day, hours, minutes);
      const newPost: Omit<Post, 'id' | 'createdAt'> = {
        content: formData.content.trim(), platform: formData.platform, scheduledDate, scheduledTime: formData.time, status: 'scheduled', publishedAt: undefined,
        ...(mediaId ? { mediaId, mediaType: mediaType ?? undefined } : isEditing ? { mediaId: undefined, mediaType: undefined } : {}),
      };
      await onSchedulePost(newPost);
      resetForm();
      onClose();
    } catch (error) { console.error('Error scheduling post:', error); }
    finally { setIsSubmitting(false); }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const resetForm = () => {
    setFormData({ content: '', platform: 'linkedin', date: selectedDate ? formatLocalDate(selectedDate) : '', time: '09:00', hashtags: [] });
    setErrors({}); setMediaId(null); setMediaType(null); setIsMediaUploading(false);
  };

  const handleClose = () => { resetForm(); onClose(); };

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div className="fixed inset-0 bg-on-surface/30 z-40" style={{ backdropFilter: 'blur(4px)' }} onClick={handleClose} aria-hidden="true" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="relative rounded-2xl shadow-ambient-lg w-full max-w-7xl min-h-[700px] max-h-[95vh] flex pointer-events-auto overflow-hidden"
          style={{ background: 'rgba(246, 246, 255, 0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}
          role="dialog" aria-modal="true"
        >
          {/* LEFT — Editor workspace */}
          <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200/60">
            <div className="px-10 pt-10 pb-3">
              <p className="text-sm font-semibold uppercase tracking-wider text-primary mb-1">Editor Workspace</p>
              <h2 className="text-3xl font-bold text-on-surface">
                {isEditing ? 'Refine Your Narrative' : 'Craft Your Post'}
              </h2>
            </div>

            <form id="scheduling-form" onSubmit={handleSubmit} className="flex-1 flex flex-col px-10 pb-10 overflow-y-auto">
              {/* Post Copy label + char count */}
              <div className="flex items-center justify-between mt-5 mb-3">
                <label htmlFor="content" className="text-lg font-semibold text-on-surface">Post Copy</label>
                <span className={`text-sm ${formData.content.length > maxChars ? 'text-red-500 font-medium' : 'text-outline'}`}>
                  {formData.content.length.toLocaleString()} / {maxChars.toLocaleString()} characters
                </span>
              </div>

              {/* Content textarea */}
              <div className="flex-1 min-h-[340px]">
                <textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="What would you like to share?"
                  className={`w-full h-full px-6 py-5 text-base leading-relaxed border rounded-xl resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
                    errors.content ? 'border-red-400 bg-red-50/30' : 'border-gray-200 bg-white/50'
                  }`}
                />
                {errors.content && <p className="text-sm text-red-500 mt-1">{errors.content}</p>}
              </div>

              {/* Hashtags */}
              {formData.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {formData.hashtags.map((tag, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-sm font-medium bg-primary/10 text-primary">
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                </div>
              )}

              {/* Formatting toolbar */}
              <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-200/60">
                <button type="button" className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high/50 transition-colors" aria-label="Insert emoji">
                  <Icon icon="solar:emoji-funny-circle-linear" className="w-5 h-5" />
                </button>
                <button type="button" className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high/50 transition-colors" aria-label="Mention">
                  <Icon icon="solar:at-sign-linear" className="w-5 h-5" />
                </button>
                <button type="button" className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high/50 transition-colors" aria-label="Add hashtag">
                  <Icon icon="solar:hashtag-linear" className="w-5 h-5" />
                </button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <button type="button" className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high/50 transition-colors" aria-label="Bold">
                  <Icon icon="solar:text-bold-linear" className="w-5 h-5" />
                </button>
                <button type="button" className="p-2.5 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container-high/50 transition-colors" aria-label="Italic">
                  <Icon icon="solar:text-italic-linear" className="w-5 h-5" />
                </button>
              </div>
            </form>
          </div>

          {/* RIGHT — Settings panel */}
          <div className="w-[440px] flex-shrink-0 flex flex-col overflow-y-auto">
            {/* Close button */}
            <div className="flex justify-end px-6 pt-6">
              <button onClick={handleClose} className="text-outline hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container-high/50" aria-label="Close">
                <Icon icon="solar:close-circle-bold" className="w-6 h-6" />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-7">
              {/* Select Destinations */}
              <div>
                <h3 className="text-lg font-semibold text-on-surface mb-3">Select Destination</h3>
                <div className="grid grid-cols-4 gap-2">
                  {platformOptions.map((p) => {
                    const selected = formData.platform === p.value;
                    return (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => handleInputChange('platform', p.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                          selected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-gray-200/60 bg-white/40 hover:border-gray-300'
                        }`}
                      >
                        <Icon icon={p.icon} className="w-6 h-6" style={{ color: selected ? p.color : '#9CA3AF' }} />
                        <span className={`text-xs font-medium uppercase tracking-wide ${selected ? 'text-primary' : 'text-outline'}`}>
                          {p.label.split(' / ')[0]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {errors.platform && <p className="text-sm text-red-500 mt-1">{errors.platform}</p>}
              </div>

              {/* Media Assets */}
              <div>
                <h3 className="text-lg font-semibold text-on-surface mb-3">Media Assets</h3>
                <MediaUploader
                  onMediaAttached={(id, type) => { setMediaId(id); setMediaType(type); setIsMediaUploading(false); }}
                  onMediaRemoved={() => { setMediaId(null); setMediaType(null); setIsMediaUploading(false); }}
                  initialMediaId={prefillMediaId ?? editingPost?.mediaId}
                  initialMediaType={prefillMediaType ?? editingPost?.mediaType}
                  initialMediaUrl={prefillMediaUrl}
                  disabled={isSubmitting}
                />
              </div>

              {/* Publication Timing */}
              <div>
                <h3 className="text-lg font-semibold text-on-surface mb-3">Publication Timing</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="sched-date" className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Date</label>
                    <div className="relative">
                      <input
                        id="sched-date"
                        type="date"
                        value={formData.date}
                        onChange={(e) => handleInputChange('date', e.target.value)}
                        className={`w-full px-4 py-3 text-base border rounded-xl bg-white/50 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
                          errors.date ? 'border-red-400' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
                  </div>
                  <div>
                    <label htmlFor="sched-time" className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1.5">Time</label>
                    <div className="relative">
                      <input
                        id="sched-time"
                        type="time"
                        value={formData.time}
                        onChange={(e) => handleInputChange('time', e.target.value)}
                        className={`w-full px-4 py-3 text-base border rounded-xl bg-white/50 focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors ${
                          errors.time ? 'border-red-400' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    {errors.time && <p className="text-xs text-red-500 mt-1">{errors.time}</p>}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200/60">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-6 py-3 text-base font-medium text-outline hover:text-on-surface transition-colors rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="scheduling-form"
                  disabled={isSubmitting || isMediaUploading}
                  className="px-8 py-3 text-base font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 rounded-xl transition-colors shadow-sm"
                >
                  {isSubmitting ? 'Saving…' : isEditing ? 'Update Post' : 'Schedule Post'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
