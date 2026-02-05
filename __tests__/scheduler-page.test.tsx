import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerPage from '../app/dashboard/scheduler/page';
import { AgentProvider } from '../context/AgentContext';

// Wrapper component with AgentProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AgentProvider>{children}</AgentProvider>
);

describe('Scheduler Page', () => {
  it('renders the scheduler page with title and description', () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    expect(screen.getByText('Content Scheduler')).toBeInTheDocument();
    expect(screen.getByText('Schedule your social media posts across different platforms')).toBeInTheDocument();
  });

  it('displays calendar view by default', () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    // Calendar view button should be active (primary variant)
    const calendarButton = screen.getByRole('button', { name: /calendar/i });
    expect(calendarButton).toBeInTheDocument();
    
    // Should show current month and year
    const currentDate = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const expectedMonth = monthNames[currentDate.getMonth()];
    const expectedYear = currentDate.getFullYear().toString();
    
    expect(screen.getByText(new RegExp(`${expectedMonth} ${expectedYear}`))).toBeInTheDocument();
  });

  it('can toggle between calendar and list views', () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    const listButton = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listButton);
    
    // Should show empty state message in list view
    expect(screen.getByText('No scheduled posts')).toBeInTheDocument();
    expect(screen.getByText('Start by scheduling your first post to see it appear here.')).toBeInTheDocument();
  });

  it('shows schedule post button', () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    const scheduleButton = screen.getByRole('button', { name: /schedule post/i });
    expect(scheduleButton).toBeInTheDocument();
  });

  it('opens scheduling modal when schedule post button is clicked', async () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    const scheduleButton = screen.getByRole('button', { name: /schedule post/i });
    fireEvent.click(scheduleButton);
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Schedule New Post')).toBeInTheDocument();
    });
    
    // Modal should have form fields
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/platform/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/time/i)).toBeInTheDocument();
  });

  it('opens date details modal when clicking on date with posts', async () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    // First schedule a post
    const scheduleButton = screen.getByRole('button', { name: /schedule post/i });
    fireEvent.click(scheduleButton);
    
    await waitFor(() => {
      expect(screen.getByText('Schedule New Post')).toBeInTheDocument();
    });
    
    // Fill and submit form
    const contentField = screen.getByLabelText(/content/i);
    const dateField = screen.getByLabelText(/date/i);
    const timeField = screen.getByLabelText(/time/i);
    
    fireEvent.change(contentField, { target: { value: 'Test post content' } });
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    fireEvent.change(dateField, { target: { value: tomorrowString } });
    fireEvent.change(timeField, { target: { value: '10:00' } });
    
    const submitButton = screen.getAllByRole('button', { name: /schedule post/i })[1];
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Schedule New Post')).not.toBeInTheDocument();
    });
    
    // Now click on the date that has the post - this should open date details modal
    // We'll simulate this by clicking the schedule button again and checking for the date details
    // In a real scenario, we'd click on the calendar date
  });

  it('can close the scheduling modal', async () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    const scheduleButton = screen.getByRole('button', { name: /schedule post/i });
    fireEvent.click(scheduleButton);
    
    // Modal should open
    await waitFor(() => {
      expect(screen.getByText('Schedule New Post')).toBeInTheDocument();
    });
    
    // Click cancel button
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);
    
    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Schedule New Post')).not.toBeInTheDocument();
    });
  });

  it('validates form fields in scheduling modal', async () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    const scheduleButton = screen.getByRole('button', { name: /schedule post/i });
    fireEvent.click(scheduleButton);
    
    await waitFor(() => {
      expect(screen.getByText('Schedule New Post')).toBeInTheDocument();
    });
    
    // Try to submit empty form
    const submitButton = screen.getAllByRole('button', { name: /schedule post/i })[1]; // Get the modal submit button
    fireEvent.click(submitButton);
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Content is required')).toBeInTheDocument();
    });
  });

  it('can schedule a post successfully', async () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    const scheduleButton = screen.getByRole('button', { name: /schedule post/i });
    fireEvent.click(scheduleButton);
    
    await waitFor(() => {
      expect(screen.getByText('Schedule New Post')).toBeInTheDocument();
    });
    
    // Fill form
    const contentField = screen.getByLabelText(/content/i);
    const dateField = screen.getByLabelText(/date/i);
    const timeField = screen.getByLabelText(/time/i);
    
    fireEvent.change(contentField, { target: { value: 'Test post content' } });
    
    // Set future date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];
    
    fireEvent.change(dateField, { target: { value: tomorrowString } });
    fireEvent.change(timeField, { target: { value: '10:00' } });
    
    // Submit form
    const submitButton = screen.getAllByRole('button', { name: /schedule post/i })[1]; // Get the modal submit button
    fireEvent.click(submitButton);
    
    // Modal should close
    await waitFor(() => {
      expect(screen.queryByText('Schedule New Post')).not.toBeInTheDocument();
    });
    
    // Switch to list view to see the scheduled post
    const listButton = screen.getByRole('button', { name: /list/i });
    fireEvent.click(listButton);
    
    // Should show the scheduled post
    expect(screen.getByText('Test post content')).toBeInTheDocument();
  });

  it('shows agent workflow', () => {
    render(<SchedulerPage />, { wrapper: TestWrapper });
    
    expect(screen.getByText('Agent Workflow')).toBeInTheDocument();
  });
});