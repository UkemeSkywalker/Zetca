'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import MediaUploader from '@/components/dashboard/MediaUploader';
import { Post } from '@/types/post';
import { ScheduledPost } from '@/types/scheduler';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSchedulePost: (post: Omit<Post, 'id' | 'createdAt'>) => Promise<void> | void;
  editingPost?: Post | null;
  /** Optional pre-fill: content text (from CaptionEditor publish flow) */
  prefillContent?: string;
  /** Optional pre-fill: platform (from CaptionEditor publish flow) */
  prefillPlatform?: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  /** Optional pre-fill: hashtags list (from CaptionEditor publish flow) */
  prefillHashtags?: string[];
  /** Optional: ScheduledPost for API-backed editing */
  editingScheduledPost?: ScheduledPost | null;
  /** Optional pre-fill: media ID (from CaptionEditor publish flow) */
  prefillMediaId?: string;
  /** Optional pre-fill: media type (from CaptionEditor publish flow) */
  prefillMediaType?: 'image' | 'video';
  /** Optional pre-fill: media presigned URL (from CaptionEditor publish flow) */
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

export function SchedulingModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  onSchedulePost,
  editingPost = null,
  prefillContent,
  prefillPlatform,
  prefillHashtags,
  editingScheduledPost = null,
  prefillMediaId,
  prefillMediaType,
  prefillMediaUrl,
}: SchedulingModalProps) {
  /** Format a Date to YYYY-MM-DD using local date components (avoids UTC shift from toISOString) */
  const formatLocalDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const getInitialFormData = (): FormData => {
    // Priority: editingScheduledPost > editingPost > prefill > defaults
    if (editingScheduledPost) {
      return {
        content: editingScheduledPost.content,
        platform: editingScheduledPost.platform as FormData['platform'],
        date: editingScheduledPost.scheduledDate,
        time: editingScheduledPost.scheduledTime,
        hashtags: editingScheduledPost.hashtags || [],
      };
    }
    if (editingPost) {
      const postDate = new Date(editingPost.scheduledDate);
      return {
        content: editingPost.content,
        platform: editingPost.platform,
        date: formatLocalDate(postDate),
        time: editingPost.scheduledTime,
        hashtags: [],
      };
    }
    return {
      content: prefillContent || '',
      platform: prefillPlatform || 'instagram',
      date: selectedDate ? formatLocalDate(selectedDate) : '',
      time: '09:00',
      hashtags: prefillHashtags || [],
    };
  };

  const [formData, setFormData] = useState<FormData>(getInitialFormData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaId, setMediaId] = useState<string | null>(prefillMediaId ?? editingPost?.mediaId ?? null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(prefillMediaType ?? editingPost?.mediaType ?? null);
  const [isMediaUploading, setIsMediaUploading] = useState(false);

  const isEditing = !!(editingPost || editingScheduledPost);
  const isPrefilled = !!(prefillContent || prefillPlatform);

  // Update form when props change
  React.useEffect(() => {
    if (editingScheduledPost) {
      setFormData({
        content: editingScheduledPost.content,
        platform: editingScheduledPost.platform as FormData['platform'],
        date: editingScheduledPost.scheduledDate,
        time: editingScheduledPost.scheduledTime,
        hashtags: editingScheduledPost.hashtags || [],
      });
    } else if (editingPost) {
      const postDate = new Date(editingPost.scheduledDate);
      setFormData({
        content: editingPost.content,
        platform: editingPost.platform,
        date: formatLocalDate(postDate),
        time: editingPost.scheduledTime,
        hashtags: [],
      });
      setMediaId(editingPost.mediaId ?? null);
      setMediaType(editingPost.mediaType ?? null);
    } else if (prefillContent || prefillPlatform) {
      setFormData(prev => ({
        ...prev,
        content: prefillContent || prev.content,
        platform: prefillPlatform || prev.platform,
        hashtags: prefillHashtags || prev.hashtags,
        date: selectedDate ? formatLocalDate(selectedDate) : prev.date,
      }));
    } else if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: formatLocalDate(selectedDate),
      }));
    }
  }, [editingPost, editingScheduledPost, selectedDate, prefillContent, prefillPlatform, prefillHashtags]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length > 280 && formData.platform === 'twitter') {
      newErrors.content = 'Twitter posts must be 280 characters or less';
    }

    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
      const now = new Date();
      if (selectedDateTime <= now) {
        newErrors.date = 'Scheduled date must be in the future';
      }
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

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
        content: formData.content.trim(),
        platform: formData.platform,
        scheduledDate,
        scheduledTime: formData.time,
        status: 'scheduled',
        publishedAt: undefined,
        ...(mediaId
          ? { mediaId, mediaType: mediaType ?? undefined }
          : isEditing
            ? { mediaId: undefined, mediaType: undefined }
            : {}),
      };

      console.log('[SchedulingModal] submitting post:', {
        isEditing,
        content: newPost.content?.substring(0, 50),
        platform: newPost.platform,
        scheduledDate: newPost.scheduledDate,
        scheduledTime: newPost.scheduledTime,
        mediaId: newPost.mediaId,
        mediaType: newPost.mediaType,
      });

      await onSchedulePost(newPost);

      resetForm();
      onClose();
    } catch (error) {
      console.error('Error scheduling post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const resetForm = () => {
    setFormData({
      content: '',
      platform: 'instagram',
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      time: '09:00',
      hashtags: [],
    });
    setErrors({});
    setMediaId(null);
    setMediaType(null);
    setIsMediaUploading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const platformOptions = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' },
  ];

  const getModalTitle = () => {
    if (isEditing) return 'Edit Post';
    if (isPrefilled) return 'Schedule Post';
    return 'Schedule New Post';
  };

  const getSubmitLabel = () => {
    if (isEditing) return 'Update Post';
    return 'Schedule Post';
  };

  const footer = (
    <>
      <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
        Cancel
      </Button>
      <Button
        type="submit"
        form="scheduling-form"
        isLoading={isSubmitting}
        disabled={isSubmitting || isMediaUploading}
      >
        {getSubmitLabel()}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={getModalTitle()}
      footer={footer}
      size="md"
    >
      <form id="scheduling-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Pre-filled content preview (read-only when from CaptionEditor) */}
        {isPrefilled && !isEditing ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {formData.content}
            </p>
          </div>
        ) : (
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <textarea
              id="content"
              value={formData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="What would you like to share?"
              rows={4}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                errors.content ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.content && (
              <p className="text-sm text-red-600 mt-1">{errors.content}</p>
            )}
            {formData.platform === 'twitter' && (
              <p className="text-sm text-gray-500 mt-1">
                {formData.content.length}/280 characters
              </p>
            )}
          </div>
        )}

        {/* Platform - read-only when pre-filled, editable otherwise */}
        {isPrefilled && !isEditing ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
            <p className="text-sm text-gray-600 capitalize">{formData.platform}</p>
          </div>
        ) : (
          <div>
            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              id="platform"
              value={formData.platform}
              onChange={(e) => handleInputChange('platform', e.target.value as FormData['platform'])}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.platform ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {platformOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.platform && (
              <p className="text-sm text-red-600 mt-1">{errors.platform}</p>
            )}
          </div>
        )}

        {/* Hashtags display (when pre-filled or editing a ScheduledPost) */}
        {formData.hashtags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hashtags</label>
            <div className="flex flex-wrap gap-1.5">
              {formData.hashtags.map((tag, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700"
                >
                  {tag.startsWith('#') ? tag : `#${tag}`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Media Uploader */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Media</label>
          <MediaUploader
            onMediaAttached={(id, type) => {
              setMediaId(id);
              setMediaType(type);
              setIsMediaUploading(false);
            }}
            onMediaRemoved={() => {
              setMediaId(null);
              setMediaType(null);
              setIsMediaUploading(false);
            }}
            initialMediaId={prefillMediaId ?? editingPost?.mediaId}
            initialMediaType={prefillMediaType ?? editingPost?.mediaType}
            initialMediaUrl={prefillMediaUrl}
            disabled={isSubmitting}
          />
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Input
              label="Date"
              type="date"
              value={formData.date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('date', e.target.value)}
              error={errors.date}
              id="date-input"
            />
          </div>
          <div>
            <Input
              label="Time"
              type="time"
              value={formData.time}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('time', e.target.value)}
              error={errors.time}
              id="time-input"
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
