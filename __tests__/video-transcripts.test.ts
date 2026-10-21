/**
 * @jest-environment node
 */

import { segmentsFromTranscribe } from '@/lib/services/transcriptService';
import { chaptersFromPicks, numberedTranscript } from '@/lib/models/chapters';
import { withChapters, parseChapters } from '@/lib/youtube/chapters';
import type { Transcript } from '@/types/media';

describe('segmentsFromTranscribe', () => {
  it('shifts each piece’s sentences to where the piece starts in the video', () => {
    const out = segmentsFromTranscribe(
      { results: { audio_segments: [{ start_time: '1.5', end_time: '4.25', transcript: ' Now squats. ' }] } },
      300
    );
    expect(out).toEqual([{ start: 301.5, end: 304.25, text: 'Now squats.' }]);
  });

  it('builds sentences from words when there are no audio segments', () => {
    const word = (content: string, start: string, end: string) => ({ type: 'pronunciation', start_time: start, end_time: end, alternatives: [{ content }] });
    const punct = (content: string) => ({ type: 'punctuation', alternatives: [{ content }] });
    const out = segmentsFromTranscribe(
      { results: { items: [word('Hello', '0.0', '0.5'), word('there', '0.6', '1.0'), punct('.'), word('Next', '2.0', '2.4')] } },
      0
    );
    expect(out).toEqual([
      { start: 0, end: 1, text: 'Hello there.' },
      { start: 2, end: 2.4, text: 'Next' },
    ]);
  });
});

const transcript: Transcript = {
  language: 'en-US',
  segments: [
    { start: 0.4, end: 20, text: 'Welcome, warm up.' },
    { start: 25, end: 40, text: 'Squats now.' },
    { start: 31, end: 45, text: 'Keep going.' },
    { start: 90, end: 120, text: 'Push ups.' },
    { start: 200, end: 230, text: 'Cool down.' },
  ],
};

describe('chaptersFromPicks', () => {
  it('uses the transcript’s times, starting at 0:00', () => {
    const chapters = chaptersFromPicks(
      { chapters: [{ segment: 0, title: 'Warm up' }, { segment: 3, title: 'Push ups' }, { segment: 4, title: 'Cool down' }] },
      transcript
    );
    expect(chapters).toEqual([
      { seconds: 0, title: 'Warm up' },
      { seconds: 90, title: 'Push ups' },
      { seconds: 200, title: 'Cool down' },
    ]);
  });

  it('drops made-up segments, chapters under 10 seconds, and too-few results', () => {
    expect(
      chaptersFromPicks(
        { chapters: [{ segment: 0, title: 'A' }, { segment: 1, title: 'B' }, { segment: 2, title: 'Too close' }, { segment: 99, title: 'Invented' }] },
        transcript
      )
    ).toEqual([]);
  });

  it('numbers the transcript for the AI with real times', () => {
    expect(numberedTranscript(transcript).split('\n')[3]).toBe('[3] 1:30 Push ups.');
  });
});

describe('withChapters', () => {
  it('replaces old chapter lines with the new ones at the end', () => {
    const out = withChapters('About this video\n\n0:00 Old\n1:00 Older', [
      { seconds: 0, title: 'Warm up' },
      { seconds: 90, title: 'Push ups' },
      { seconds: 200, title: 'Cool down' },
    ]);
    expect(out).toBe('About this video\n\n00:00 Warm up\n01:30 Push ups\n03:20 Cool down');
    expect(parseChapters(out)).toHaveLength(3);
  });
});
