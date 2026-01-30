'use client';

import React, { useState } from 'react';
import { Icon } from '@iconify/react';
import { Post } from '@/types/post';

interface CalendarProps {
  posts: Post[];
  onDateClick: (date: Date) => void;
  className?: string;
}

export function Calendar({ posts, onDateClick, className = '' }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get first day of current month
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Get first day of the week for the first day of month (0 = Sunday)
  const firstDayOfWeek = firstDayOfMonth.getDay();
  
  // Get number of days in current month
  const daysInMonth = lastDayOfMonth.getDate();
  
  // Get number of days in previous month
  const prevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 0);
  const daysInPrevMonth = prevMonth.getDate();

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    return posts.filter(post => {
      const postDate = new Date(post.scheduledDate);
      // Compare only the date parts, ignoring time
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    
    // Previous month's trailing days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        posts: getPostsForDate(date)
      });
    }
    
    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      days.push({
        date,
        day,
        isCurrentMonth: true,
        posts: getPostsForDate(date)
      });
    }
    
    // Next month's leading days to fill the grid
    const remainingCells = 42 - days.length; // 6 rows × 7 days = 42 cells
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
      days.push({
        date,
        day,
        isCurrentMonth: false,
        posts: getPostsForDate(date)
      });
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Platform colors for post indicators
  const platformColors = {
    instagram: 'bg-pink-500',
    twitter: 'bg-blue-500',
    linkedin: 'bg-blue-700',
    facebook: 'bg-blue-600'
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={goToPreviousMonth}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Previous month"
        >
          <Icon icon="solar:arrow-left-bold" className="w-5 h-5" />
        </button>
        
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        
        <button
          onClick={goToNextMonth}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Next month"
        >
          <Icon icon="solar:arrow-right-bold" className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((calendarDay, index) => {
            const isToday = 
              calendarDay.date.getDate() === new Date().getDate() &&
              calendarDay.date.getMonth() === new Date().getMonth() &&
              calendarDay.date.getFullYear() === new Date().getFullYear();

            return (
              <button
                key={index}
                onClick={() => onDateClick(calendarDay.date)}
                className={`
                  relative p-2 h-20 text-left border border-gray-100 hover:bg-gray-50 transition-colors overflow-hidden
                  ${calendarDay.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                  ${isToday ? 'bg-blue-50 border-blue-200' : ''}
                `}
              >
                <span className={`text-sm ${isToday ? 'font-semibold text-blue-600' : ''}`}>
                  {calendarDay.day}
                </span>
                
                {/* Post content preview */}
                {calendarDay.posts.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {calendarDay.posts.slice(0, 2).map((post, postIndex) => (
                      <div
                        key={postIndex}
                        className={`text-xs p-1 rounded text-white truncate ${
                          post.platform === 'instagram' ? 'bg-pink-500' :
                          post.platform === 'twitter' ? 'bg-blue-500' :
                          post.platform === 'linkedin' ? 'bg-blue-700' :
                          'bg-blue-600'
                        }`}
                        title={`${post.platform.toUpperCase()}: ${post.content}`}
                      >
                        {post.content.length > 20 ? `${post.content.substring(0, 20)}...` : post.content}
                      </div>
                    ))}
                    {calendarDay.posts.length > 2 && (
                      <div className="text-xs text-gray-500 font-medium">
                        +{calendarDay.posts.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}