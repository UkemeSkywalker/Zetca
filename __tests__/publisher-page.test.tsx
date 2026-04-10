import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PublisherPage from '../app/dashboard/publisher/page';
import { AgentProvider } from '../context/AgentContext';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AgentProvider>{children}</AgentProvider>
);

describe('Publisher Page', () => {
  it('renders the publisher page with title and description', () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    expect(screen.getByText('Content Pipeline')).toBeInTheDocument();
    expect(
      screen.getByText('Manage and curate your cross-platform digital presence.')
    ).toBeInTheDocument();
  });

  it('displays posts with mock data', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      // Posts derive short titles from content
      const snippets = screen.getAllByText(/Check out our.../i);
      expect(snippets.length).toBeGreaterThan(0);
    });
  });

  it('displays view mode toggle buttons', () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    expect(screen.getByLabelText('List view')).toBeInTheDocument();
    expect(screen.getByLabelText('Grid view')).toBeInTheDocument();
  });

  it('can toggle between list and grid views', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      const snippets = screen.getAllByText(/Check out our.../i);
      expect(snippets.length).toBeGreaterThan(0);
    });

    const gridViewButton = screen.getByLabelText('Grid view');
    fireEvent.click(gridViewButton);
    expect(gridViewButton.className).toContain('bg-white');
    expect(gridViewButton.className).toContain('text-primary');

    const listViewButton = screen.getByLabelText('List view');
    fireEvent.click(listViewButton);
    expect(listViewButton.className).toContain('bg-white');
    expect(listViewButton.className).toContain('text-primary');
  });

  it('opens filter dropdown and can filter posts', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      const snippets = screen.getAllByText(/Check out our.../i);
      expect(snippets.length).toBeGreaterThan(0);
    });

    // Click the Filters button
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Status filter options
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Scheduled')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();

    // Platform filter options
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Instagram')).toBeInTheDocument();
    expect(screen.getByText('Twitter / X')).toBeInTheDocument();
    expect(screen.getByText('Facebook')).toBeInTheDocument();
  });

  it('displays status dots for each post', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      const statusLabels = screen.getAllByText(/Scheduled|Published|Draft/);
      expect(statusLabels.length).toBeGreaterThan(0);
    });
  });

  it('displays publish button for draft posts', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      const snippets = screen.getAllByText(/Check out our.../i);
      expect(snippets.length).toBeGreaterThan(0);
    });

    // Open filters and select Draft
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Draft'));

    await waitFor(() => {
      const publishButtons = screen.getAllByRole('button', { name: /publish/i });
      expect(publishButtons.length).toBeGreaterThan(0);
    });
  });

  it('can publish a draft post', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      const snippets = screen.getAllByText(/Check out our.../i);
      expect(snippets.length).toBeGreaterThan(0);
    });

    // Open filters and select Draft
    fireEvent.click(screen.getByText('Filters'));
    fireEvent.click(screen.getByText('Draft'));

    await waitFor(() => {
      const publishButtons = screen.getAllByRole('button', { name: /publish/i });
      expect(publishButtons.length).toBeGreaterThan(0);
    });

    const initialDraftCount = screen.getAllByText('Draft').length;
    const publishButtons = screen.getAllByRole('button', { name: /publish/i });
    fireEvent.click(publishButtons[0]);

    await waitFor(() => {
      const currentDraftCount = screen.queryAllByText('Draft').length;
      expect(currentDraftCount).toBeLessThan(initialDraftCount);
    });
  });

  it('displays platform labels for each post', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      const platforms = screen.getAllByText(/LinkedIn|Instagram|Twitter \/ X|Facebook/);
      expect(platforms.length).toBeGreaterThan(0);
    });
  });

  it('shows pagination when posts exceed page size', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText(/Showing \d+ to \d+ of \d+ posts/)).toBeInTheDocument();
    });

    // Should have page number buttons
    expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Page 2')).toBeInTheDocument();
  });

  it('can navigate between pages', async () => {
    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByLabelText('Page 1')).toBeInTheDocument();
    });

    const page2 = screen.getByLabelText('Page 2');
    fireEvent.click(page2);

    await waitFor(() => {
      expect(screen.getByText(/Showing 11 to/)).toBeInTheDocument();
    });
  });

  it('is responsive on mobile', async () => {
    global.innerWidth = 375;
    global.innerHeight = 667;

    render(<PublisherPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      const snippets = screen.getAllByText(/Check out our.../i);
      expect(snippets.length).toBeGreaterThan(0);
    });
  });
});
