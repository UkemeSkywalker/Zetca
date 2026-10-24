/**
 * @jest-environment node
 */
import { YouTubeVideoRepository } from '@/lib/db/youtubeVideoRepository';

describe('videos due a YouTube check', () => {
  it('never filters on status, the key of the index it queries', async () => {
    const repo = new YouTubeVideoRepository();
    const send = jest.fn(async () => ({ Items: [] }));
    (repo as unknown as { docClient: { send: typeof send } }).docClient.send = send;
    await repo.listDueChecks(new Date('2026-10-22T00:00:00Z'), new Date('2026-10-24T00:00:00Z'));
    const inputs = (send.mock.calls as unknown as [{ input: { FilterExpression: string; ExpressionAttributeValues: Record<string, string> } }][]).map(([c]) => c.input);
    expect(inputs).toHaveLength(2);
    for (const input of inputs) expect(input.FilterExpression).not.toContain('#status');
    // Scheduled videos are all checked; published ones only if they went up recently
    expect(inputs[0].ExpressionAttributeValues[':status']).toBe('scheduled');
    expect(inputs[0].FilterExpression).not.toContain(':after');
    expect(inputs[1].ExpressionAttributeValues).toMatchObject({ ':status': 'published', ':after': '2026-10-22T00:00:00.000Z' });
    // Every placeholder used has a value, and vice versa (DynamoDB rejects either)
    for (const input of inputs) {
      const used = new Set(`${input.FilterExpression} #status = :status`.match(/:\w+/g));
      expect(new Set(Object.keys(input.ExpressionAttributeValues))).toEqual(used);
    }
  });
});
