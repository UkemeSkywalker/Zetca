/**
 * Real Scheduler Agent using the Strands Agents TypeScript SDK with Amazon Bedrock.
 *
 * Analyzes a strategy's posting schedule, platform recommendations, and
 * content themes alongside copy content to determine optimal scheduling
 * dates and times for each post.
 */

import { Agent } from '@strands-agents/sdk';
import { BedrockModel } from '@strands-agents/sdk/models/bedrock';
import { AutoScheduleOutput, AutoScheduleOutputSchema } from '../models/scheduler';
import { StructuredOutputException } from './errors';
import { AgentCredentials } from './strategistAgent';

const SYSTEM_PROMPT = `You are an expert social media scheduling optimizer. Your job is to analyze
a brand's posting strategy and a set of ready-to-publish copies, then determine the optimal
date and time to publish each copy on its target platform.

CRITICAL RULES:
- You will be given today's date in the prompt. ALL scheduled dates MUST be in the FUTURE
  (strictly after today). NEVER schedule a post on today's date or any past date.
- Distribute copies starting from tomorrow onwards across the upcoming 2-4 weeks.

When scheduling, follow these principles:

1. Respect the strategy's posting_schedule — honour the recommended frequency and preferred
   days/times for each platform.
2. Use platform_recommendations to prioritise platforms and align timing with peak engagement
   windows (e.g., LinkedIn mornings on weekdays, Instagram evenings and weekends).
3. Distribute copies evenly across the upcoming 2-4 weeks so the calendar is balanced.
4. NEVER schedule two posts on the same platform at the same date AND time — every
   (platform, scheduledDate, scheduledTime) combination must be unique.
5. Use content_themes to group thematically related posts on consecutive days when it
   makes sense for storytelling.
6. Prefer time slots known for high engagement on each platform:
   - Instagram: 11:00, 13:00, 17:00, 19:00
   - Twitter/X: 08:00, 12:00, 17:00
   - LinkedIn: 07:30, 09:00, 12:00
   - Facebook: 09:00, 13:00, 16:00
   - TikTok: 10:00, 14:00, 19:00, 21:00

For each copy provided, produce exactly one PostAssignment containing:
- copy_id: the id of the copy being scheduled (must match one of the provided copies)
- scheduled_date: an ISO 8601 date string (YYYY-MM-DD) that is AFTER today's date
- scheduled_time: a time string in HH:MM format
- platform: the target social media platform

Return a structured AutoScheduleOutput with a "posts" list containing all assignments.`;

export class SchedulerAgent {
  private agent: Agent;

  constructor({ awsRegion, modelId = 'anthropic.claude-3-haiku-20240307-v1:0', awsAccessKeyId, awsSecretAccessKey }: AgentCredentials) {
    const model = new BedrockModel({
      modelId,
      region: awsRegion,
      ...(awsAccessKeyId && awsSecretAccessKey
        ? { clientConfig: { credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey } } }
        : {}),
    });

    this.agent = new Agent({ model, systemPrompt: SYSTEM_PROMPT, structuredOutputSchema: AutoScheduleOutputSchema });
  }

  async autoSchedule(strategyData: Record<string, any>, copiesData: Record<string, any>[]): Promise<AutoScheduleOutput> {
    const postingSchedule = strategyData.posting_schedule ?? 'N/A';
    const contentThemes = strategyData.content_themes ?? [];
    const platformRecs = strategyData.platform_recommendations ?? [];

    const themesStr = Array.isArray(contentThemes) ? contentThemes.join(', ') : String(contentThemes);
    let platformStr: string;
    if (platformRecs.length && typeof platformRecs[0] === 'object') {
      platformStr = platformRecs.map((p: any) => p.platform ?? '').join(', ');
    } else if (Array.isArray(platformRecs)) {
      platformStr = platformRecs.map((p: any) => String(p)).join(', ');
    } else {
      platformStr = String(platformRecs);
    }

    const copiesBlock = copiesData
      .map(
        (c) =>
          `  - Copy ID: ${c.id ?? c.copy_id ?? 'unknown'}, ` +
          `Platform: ${c.platform ?? 'N/A'}, ` +
          `Content preview: ${String(c.text ?? c.content ?? '').slice(0, 120)}`
      )
      .join('\n');

    const today = new Date().toISOString().slice(0, 10);
    const prompt = `Schedule the following copies based on the brand strategy below.

IMPORTANT: Today's date is ${today}. All scheduled_date values
MUST be strictly after today. Do NOT use today's date or any past date.

Strategy:
- Brand: ${strategyData.brand_name ?? 'N/A'}
- Posting Schedule: ${postingSchedule}
- Content Themes: ${themesStr}
- Recommended Platforms: ${platformStr}

Copies to schedule (${copiesData.length} total):
${copiesBlock}

Produce exactly ${copiesData.length} PostAssignment entries — one per copy.
Each must reference the exact copy_id from the list above.
Ensure no two assignments share the same (platform, scheduled_date, scheduled_time).
All dates must be in the future (after ${today}).`;

    const result = await this.agent.invoke(prompt);
    if (!result.structuredOutput) {
      throw new StructuredOutputException('Scheduler agent failed to return structured output');
    }
    return result.structuredOutput as AutoScheduleOutput;
  }
}
