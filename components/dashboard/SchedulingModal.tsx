'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Post } from '@/types/post';

interface SchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  onSchedulePost: (post: Omit<Post, 'id' | 'createdAt'>) => void;
}

interface FormData {
  content: string;
  platform: 'instagram' | 'twitter' | 'linkedin' | 'facebook';
  date: string;
  time: string;
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
  onSchedulePost 
}: SchedulingModalProps) {
  const [formData, setFormData] = useState<FormData>({
    content: '',
    platform: 'instagram',
    date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
    time: '09:00'
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update date when selectedDate changes
  React.useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [selectedDate]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Content validation
    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.length > 280 && formData.platform === 'twitter') {
      newErrors.content = 'Twitter posts must be 280 characters or less';
    }

    // Platform validation
    if (!formData.platform) {
      newErrors.platform = 'Platform is required';
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDateTime = new Date(`${formData.date}T${formData.time}`);
      const now = new Date();
      if (selectedDateTime <= now) {
        newErrors.date = 'Scheduled date must be in the future';
      }
    }

    // Time validation
    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Create scheduled date from date and time
      // Parse the date string to avoid timezone issues
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, minutes] = formData.time.split(':').map(Number);
      const scheduledDate = new Date(year, month - 1, day, hours, minutes);
      
      // Create post object
      const newPost: Omit<Post, 'id' | 'createdAt'> = {
        content: formData.content.trim(),
        platform: formData.platform,
        scheduledDate,
        scheduledTime: formData.time,
        status: 'scheduled',
        publishedAt: undefined
      };

      // Call the onSchedulePost callback
      onSchedulePost(newPost);

      // Reset form
      setFormData({
        content: '',
        platform: 'instagram',
        date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
        time: '09:00'
      });
      setErrors({});

      // Close modal
      onClose();
    } catch (error) {
      console.error('Error scheduling post:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      content: '',
      platform: 'instagram',
      date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      time: '09:00'
    });
    setErrors({});
    onClose();
  };

  const platformOptions = [
    { value: 'instagram', label: 'Instagram' },
    { value: 'twitter', label: 'Twitter' },
    { value: 'linkedin', label: 'LinkedIn' },
    { value: 'facebook', label: 'Facebook' }
  ];

  const footer = (
    <>
      <Button
        variant="outline"
        onClick={handleClose}
        disabled={isSubmitting}
      >
        Cancel
      </Button>
      <Button
        type="submit"
        form="scheduling-form"
        isLoading={isSubmitting}
        disabled={isSubmitting}
      >
        Schedule Post
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Schedule New Post"
      footer={footer}
      size="md"
    >
      <form id="scheduling-form" onSubmit={handleSubmit} className="space-y-4">
        {/* Content */}
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

        {/* Platform */}
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

        {/* Date and Time */}
        <div className="grid grid-cols-2 gap-4">
        <div>
          <Input
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange('date', e.target.value)}
            error={errors.date}
            id="date-input"
          />
        </div>
        <div>
          <Input
            label="Time"
            type="time"
            value={formData.time}
            onChange={(e) => handleInputChange('time', e.target.value)}
            error={errors.time}
            id="time-input"
          />
        </div>
        </div>
      </form>
    </Modal>
  );
}