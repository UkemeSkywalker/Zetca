import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { ResearchChat } from '@/components/strategist/ResearchChat';
import { chatAboutResearch, editResearch, getResearch, type PublicBrandResearch } from '@/lib/api/researchClient';

jest.mock('@iconify/react', () => ({ Icon: () => null }));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
  useSearchParams: () => new URLSearchParams('id=00000000-0000-4000-8000-000000000000'),
}));
jest.mock('@/lib/api/researchClient', () => ({
  getResearch: jest.fn(),
  startResearch: jest.fn(),
  editResearch: jest.fn(),
  chatAboutResearch: jest.fn(),
}));
jest.mock('@/lib/api/billingClient', () => ({ refreshCredits: jest.fn() }));
jest.mock('@/components/strategist/TalkBackground', () => ({ TalkBackground: () => null }));
jest.mock('@/components/strategist/SuggestedStyles', () => ({ SuggestedStyles: () => null }));

const done: PublicBrandResearch = {
  researchId: '00000000-0000-4000-8000-000000000000',
  message: 'I am a cloud and DevOps engineer, I want more followers',
  status: 'done',
  steps: [{ id: 'profile', label: 'Your brand', status: 'done' }],
  socials: {},
  media: { images: [], videos: [] },
  chips: ['Cloud infrastructure', 'DevOps automation'],
  profile: {
    brandName: 'Ukeme Eseme',
    tagline: 'Cloud, DevOps and platform engineer',
    category: 'devops engineer',
    offerings: ['Cloud infrastructure', 'DevOps automation'],
    audience: ['Learners', 'Recruiters'],
    voice: ['Clear'],
    goals: [],
    strengths: [],
    facts: [],
    brandKit: { colors: [{ hex: '#0C0C0C', role: 'primary', name: 'Ink' }], headingFont: 'Kanit', look: [] },
    missing: ['Who do you most want to reach?'],
    styles: [],
  },
  competitors: [],
  cost: 20,
  createdAt: '',
  updatedAt: '',
};

/** Renders the page and lets the research load */
async function show() {
  await act(async () => {
    render(<ResearchChat />);
  });
}

describe('Talk to Zetca after the research', () => {
  beforeEach(() => {
    jest.mocked(getResearch).mockResolvedValue(done);
    Element.prototype.scrollIntoView = jest.fn();
  });

  it('has a chat box that changes the result', async () => {
    jest.mocked(chatAboutResearch).mockResolvedValue({
      ...done,
      profile: { ...done.profile!, audience: ['DevOps teams'] },
      chat: [
        { role: 'user', text: 'drop recruiters, focus on DevOps teams', at: '1' },
        { role: 'zetca', text: 'Done: your customers are DevOps teams now.', changed: ['audience'], at: '2' },
      ],
    });
    await show();
    const box = await screen.findByRole('textbox', { name: /ask zetca to change something/i });
    expect(screen.getByText('1 credit a message')).toBeTruthy();

    fireEvent.change(box, { target: { value: 'drop recruiters, focus on DevOps teams' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    await waitFor(() => expect(chatAboutResearch).toHaveBeenCalledWith(done.researchId, 'drop recruiters, focus on DevOps teams'));
    expect(await screen.findByText('Done: your customers are DevOps teams now.')).toBeTruthy();
    expect(screen.getByText('Updated customers')).toBeTruthy();
    // The board shows the new customers
    const customers = screen.getByRole('group', { name: 'customers' });
    expect(within(customers).getByText('DevOps teams')).toBeTruthy();
    expect(within(customers).queryByText('Recruiters')).toBeNull();
  });

  it('keeps the message and says why when sending fails', async () => {
    jest.mocked(chatAboutResearch).mockRejectedValue(new Error('You’re out of credits'));
    await show();
    const box = await screen.findByRole('textbox', { name: /ask zetca to change something/i });
    fireEvent.change(box, { target: { value: 'warmer colours' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(await screen.findByText('You’re out of credits')).toBeTruthy();
    await waitFor(() => expect((box as HTMLTextAreaElement).value).toBe('warmer colours'));
  });

  it('saves a hand edit and notes it in the chat', async () => {
    jest.mocked(editResearch).mockImplementation(async (_id, edit) => ({ ...done, profile: { ...done.profile!, ...edit } as typeof done.profile }));
    await show();
    fireEvent.click(await screen.findByRole('button', { name: /edit tagline/i }));
    const box = screen.getByRole('textbox', { name: 'tagline' });
    fireEvent.change(box, { target: { value: 'I make cloud simple' } });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(screen.getByText('You changed tagline by hand')).toBeTruthy();
    await waitFor(() => expect(editResearch).toHaveBeenCalledWith(done.researchId, { tagline: 'I make cloud simple' }));
  });

  it('has no chat box while the research is still running', async () => {
    jest.mocked(getResearch).mockResolvedValue({ ...done, status: 'working', profile: undefined });
    await show();
    await waitFor(() => expect(getResearch).toHaveBeenCalled());
    expect(screen.queryByRole('textbox', { name: /ask zetca/i })).toBeNull();
  });
});
