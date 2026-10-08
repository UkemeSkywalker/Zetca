/**
 * Mock Keyword Agent for testing and development.
 *
 * Returns the rule-based suggestions without calling Bedrock.
 */

import { KeywordRequest } from '../models/keywords';
import { ruleBasedKeywords } from '../strategist/keywords';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class MockKeywordAgent {
  /** Returns rule-based keywords with a short simulated delay. */
  async suggestKeywords(input: KeywordRequest): Promise<string[]> {
    await sleep(400);
    return ruleBasedKeywords({ niches: input.niches, topics: input.topics, skill: input.skill_level });
  }
}
