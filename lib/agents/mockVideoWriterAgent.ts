/**
 * Mock Video Writer Agent for development without Bedrock.
 */

import { VideoWriterRequest, VideoWriterResponse } from '../models/videoWriter';
import { cleanVideoCopy } from '../youtube/videoCopy';

export class MockVideoWriterAgent {
  async write(input: VideoWriterRequest): Promise<VideoWriterResponse> {
    await new Promise((r) => setTimeout(r, 600));
    const topic = input.brief.split(/[.!?\n]/)[0].trim();
    return cleanVideoCopy({
      title: topic.charAt(0).toUpperCase() + topic.slice(1),
      description: input.isShort
        ? `${topic}. Follow for more.`
        : `${topic}.\n\nIn this video you'll see everything step by step.\n\nSubscribe for more videos like this.`,
      tags: topic.toLowerCase().split(/\s+/).filter((w) => w.length > 3).slice(0, 6).concat(['tutorial', 'how to']),
    });
  }
}
