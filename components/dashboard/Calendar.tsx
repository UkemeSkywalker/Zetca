'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { ScheduledPost } from '@/types/scheduler';

interface CalendarProps {
  posts: ScheduledPost[];
  onDateClick: (date: Date) => void;
  className?: string;
}

export function Calendar({ posts, onDateClick, className = '' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const getPostsForDate = (date: Date) => {
    return posts.filter(post => {
      const [year, month, day] = post.scheduledDate.split('-').map(Number);
      return (
        day === date.getDate() &&
        month - 1 === date.getMonth() &&
        year === date.getFullYear()
      );
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

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const today = new Date();

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPreviousMonth}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              aria-label="Previous month"
            >
              <Icon icon="solar:alt-arrow-left-bold" className="w-5 h-5" />
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
              aria-label="Next month"
            >
              <Icon icon="solar:alt-arrow-right-bold" className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-5 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            <span>Post Scheduled</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 sm:px-6 pb-5">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {dayNames.map(day => (
            <div key={day} className="text-center text-xs font-semibold text-gray-400 tracking-wider py-2">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((calendarDay, index) => {
            const isToday =
              calendarDay.date.getDate() === today.getDate() &&
              calendarDay.date.getMonth() === today.getMonth() &&
              calendarDay.date.getFullYear() === today.getFullYear();
            const hasPosts = calendarDay.posts.length > 0;

            return (
              <button
                key={index}
                onClick={() => onDateClick(calendarDay.date)}
                className={`
                  relative p-2 sm:p-3 h-20 sm:h-32 text-left rounded-xl transition-all overflow-hidden
                  ${calendarDay.isCurrentMonth ? 'text-gray-900' : 'text-gray-300'}
                  ${isToday
                    ? 'bg-indigo-50 border-2 border-indigo-300 shadow-sm'
                    : hasPosts
                      ? 'bg-gray-50 border border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/30'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }
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
                        <div key={postIndex} className="w-2 h-2 rounded-full bg-indigo-500" />
                      ))}
                    </div>

                    {/* Desktop: icon + time */}
                    <div className="hidden sm:block mt-2 space-y-1.5">
                      {calendarDay.posts.slice(0, 2).map((post, postIndex) => (
                        <div
                          key={postIndex}
                          className="flex items-center gap-1.5 text-sm font-semibold leading-tight"
                          title={`${post.strategyLabel || post.platform}: ${post.content}`}
                        >
                          <Icon
                            icon={platformIcons[post.platform.toLowerCase()] || 'solar:chat-round-bold'}
                            className="w-4.5 h-4.5 shrink-0"
                            style={{ color: platformColors[post.platform.toLowerCase()] || '#6B7280' }}
                          />
                          <span className="text-gray-700 truncate">{formatTime(post.scheduledTime)}</span>
                        </div>
                      ))}
                      {calendarDay.posts.length > 2 && (
                        <div className="text-xs font-semibold text-indigo-400">
                          +{calendarDay.posts.length - 2} more
                        </div>
                      )}
                    </div>

                    {/* Scheduled dot indicator (bottom-right) */}
                    {calendarDay.posts.length > 0 && (
                      <div className="absolute bottom-2 right-2 hidden sm:block">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block" />
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
