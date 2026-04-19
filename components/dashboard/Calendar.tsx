'use client';

import React, { useState, useCallback } from 'react';
import { Icon } from '@iconify/react';
import { ScheduledPost } from '@/types/scheduler';

interface CalendarProps {
  posts: ScheduledPost[];
  onDateClick: (date: Date) => void;
  onMovePosts?: (postIds: string[], targetDate: string) => void;
  className?: string;
}

export function Calendar({ posts, onDateClick, onMovePosts, className = '' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dragSourceDate, setDragSourceDate] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const toDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const getPostsForDate = (date: Date) => {
    const key = toDateKey(date);
    return posts.filter(post => {
      // Convert UTC stored date/time to local date for calendar matching
      const localDt = new Date(`${post.scheduledDate}T${post.scheduledTime}:00Z`);
      const localKey = `${localDt.getFullYear()}-${String(localDt.getMonth() + 1).padStart(2, '0')}-${String(localDt.getDate()).padStart(2, '0')}`;
      return localKey === key;
    });
  };

  const generateCalendarDays = () => {
    const days = [];
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, day);
      days.push({ date, day, isCurrentMonth: false, posts: getPostsForDate(date) });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      days.push({ date, day, isCurrentMonth: true, posts: getPostsForDate(date) });
    }
    const remainingCells = 42 - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push({ date, day, isCurrentMonth: false, posts: getPostsForDate(date) });
    }
    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

  const platformIcons: Record<string, string> = {
    instagram: 'simple-icons:instagram',
    twitter: 'ri:twitter-x-fill',
    x: 'ri:twitter-x-fill',
    linkedin: 'simple-icons:linkedin',
    facebook: 'simple-icons:facebook',
  };

  const platformColors: Record<string, string> = {
    instagram: '#E4405F',
    twitter: '#000000',
    x: '#000000',
    linkedin: '#0A66C2',
    facebook: '#1877F2',
  };

  const formatTime = (dateStr: string, timeStr: string) => {
    const dt = new Date(`${dateStr}T${timeStr}:00Z`);
    const hour = dt.getHours();
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const today = new Date();

  const handleDragStart = useCallback((e: React.DragEvent, dateKey: string, datePosts: ScheduledPost[]) => {
    if (datePosts.length === 0) { e.preventDefault(); return; }
    setDragSourceDate(dateKey);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dateKey);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, dateKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dateKey !== dragSourceDate) setDragOverDate(dateKey);
  }, [dragSourceDate]);

  const handleDragLeave = useCallback(() => { setDragOverDate(null); }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetDateKey: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const sourceDateKey = e.dataTransfer.getData('text/plain');
    if (!sourceDateKey || sourceDateKey === targetDateKey) { setDragSourceDate(null); return; }
    const sourcePosts = posts.filter(p => {
      const localDt = new Date(`${p.scheduledDate}T${p.scheduledTime}:00Z`);
      const localKey = `${localDt.getFullYear()}-${String(localDt.getMonth() + 1).padStart(2, '0')}-${String(localDt.getDate()).padStart(2, '0')}`;
      return localKey === sourceDateKey;
    });
    if (sourcePosts.length > 0 && onMovePosts) {
      onMovePosts(sourcePosts.map(p => p.id), targetDateKey);
    }
    setDragSourceDate(null);
  }, [posts, onMovePosts]);

  const handleDragEnd = useCallback(() => { setDragSourceDate(null); setDragOverDate(null); }, []);

  return (
    /* Calendar: surface-container-lowest, no borders, tonal shifts */
    <div className={`bg-surface-container-lowest rounded-2xl shadow-ambient ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold font-heading text-on-surface">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 text-outline hover:text-primary hover:bg-primary/5 rounded-full transition-colors"
              aria-label="Previous month"
            >
              <Icon icon="solar:alt-arrow-left-bold" className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 text-outline hover:text-primary hover:bg-primary/5 rounded-full transition-colors"
              aria-label="Next month"
            >
              <Icon icon="solar:alt-arrow-right-bold" className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-5 text-sm text-outline">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-secondary" />
            <span>Post Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-surface-container-highest" style={{ border: '1px solid var(--outline-variant)' }} />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 pb-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-0">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-400 tracking-wider py-2 border-b border-gray-200">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {calendarDays.map((calendarDay, index) => {
            const isToday =
              calendarDay.date.getDate() === today.getDate() &&
              calendarDay.date.getMonth() === today.getMonth() &&
              calendarDay.date.getFullYear() === today.getFullYear();
            const hasPosts = calendarDay.posts.length > 0;
            const dateKey = toDateKey(calendarDay.date);
            const isDragSource = dragSourceDate === dateKey;
            const isDragOver = dragOverDate === dateKey && dragSourceDate !== dateKey;

            return (
              <div
                key={index}
                draggable={hasPosts}
                onDragStart={(e) => handleDragStart(e, dateKey, calendarDay.posts)}
                onDragOver={(e) => handleDragOver(e, dateKey)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, dateKey)}
                onDragEnd={handleDragEnd}
                onClick={() => onDateClick(calendarDay.date)}
                className={`
                  relative p-2 sm:p-3 h-20 sm:h-32 text-left transition-all overflow-hidden cursor-pointer select-none border-b border-r border-gray-200
                  ${index % 7 === 0 ? 'border-l border-gray-200' : ''}
                  ${calendarDay.isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                  ${isDragSource ? 'opacity-40 scale-95 bg-gray-100' : ''}
                  ${isDragOver ? 'bg-indigo-100 scale-[1.02] shadow-md' : ''}
                  ${!isDragSource && !isDragOver ? (
                    isToday
                      ? 'bg-white'
                      : hasPosts
                        ? 'bg-white hover:bg-gray-50'
                        : 'bg-white hover:bg-gray-50'
                  ) : ''}
                  ${hasPosts ? 'cursor-grab active:cursor-grabbing' : ''}
                `}
              >
                <span className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : ''}`}>
                  {calendarDay.day}
                </span>

                {hasPosts && (
                  <>
                    {/* Mobile: dots */}
                    <div className="sm:hidden mt-1.5 flex gap-1 flex-wrap">
                      {calendarDay.posts.slice(0, 3).map((_, postIndex) => (
                        <div key={postIndex} className="w-2 h-2 rounded-full bg-secondary" />
                      ))}
                    </div>

                    {/* Desktop: event cards with secondary-container + left accent */}
                    <div className="hidden sm:block mt-2 space-y-1.5">
                      {calendarDay.posts.slice(0, 2).map((post, postIndex) => (
                        <div
                          key={postIndex}
                          className="flex items-center gap-1.5 text-sm font-semibold leading-tight bg-secondary-container/30 rounded px-1.5 py-0.5"
                          style={{ borderLeft: '2px solid var(--secondary)' }}
                          title={`${post.strategyLabel || post.platform}: ${post.content}`}
                        >
                          <Icon
                            icon={platformIcons[post.platform.toLowerCase()] || 'solar:chat-round-bold'}
                            className="w-4 h-4 shrink-0"
                            style={{ color: platformColors[post.platform.toLowerCase()] || 'var(--outline)' }}
                          />
                          <span className="text-on-secondary-container truncate text-xs">{formatTime(post.scheduledDate, post.scheduledTime)}</span>
                          {post.mediaType === 'image' && (
                            <Icon icon="solar:gallery-bold" className="w-3.5 h-3.5 shrink-0 text-secondary" aria-label="Has image" />
                          )}
                          {post.mediaType === 'video' && (
                            <Icon icon="solar:videocamera-record-bold" className="w-3.5 h-3.5 shrink-0 text-secondary" aria-label="Has video" />
                          )}
                        </div>
                      ))}
                      {calendarDay.posts.length > 2 && (
                        <div className="text-xs font-semibold text-secondary/60">
                          +{calendarDay.posts.length - 2} more
                        </div>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 hidden sm:block">
                      <span className="w-2.5 h-2.5 rounded-full bg-secondary block" />
                    </div>
                  </>
                )}

                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-xl">
                    <div className="text-on-primary text-xs font-semibold px-2 py-1 rounded-full shadow-ambient gradient-primary">
                      Move here
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
