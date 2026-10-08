/**
 * Runs a Strands agent call and logs how long it took and how many tokens it used,
 * so slow generations can be traced to their cause (long output, extra model calls).
 */

import type { Agent, AgentResult, AgentStreamEvent, ContentBlockDelta, InvokeArgs, InvokeOptions } from '@strands-agents/sdk';

/**
 * Appended to the system prompt of agents with a structured output schema. Text the model
 * writes before calling the output tool is wasted time: the SDK discards a text-only
 * reply and asks again, and text written alongside the tool call is never shown.
 */
export const STRUCTURED_OUTPUT_ONLY =
  'Respond only by calling the strands_structured_output tool. Do not write any text, notes or working before or after the tool call.';

export interface RunAgentOptions extends InvokeOptions {
  /** Called for every stream event, e.g. to report progress while the model writes */
  onEvent?: (event: AgentStreamEvent) => void;
}

export async function runAgent(
  agent: Agent,
  label: string,
  prompt: InvokeArgs,
  { onEvent, ...invokeOptions }: RunAgentOptions = {}
): Promise<AgentResult> {
  const started = Date.now();
  // Characters of plain text the model wrote; with a structured output schema all of it is wasted
  let textChars = 0;
  const stream = agent.stream(prompt, invokeOptions);
  let next = await stream.next();
  while (!next.done) {
    const delta = streamDelta(next.value);
    if (delta?.type === 'textDelta') textChars += delta.text.length;
    onEvent?.(next.value);
    next = await stream.next();
  }
  const result = next.value;
  logAgentMetrics(label, result, Date.now() - started, textChars);
  return result;
}

/** The content delta carried by a stream event, if it is one */
export function streamDelta(event: AgentStreamEvent): ContentBlockDelta | undefined {
  if (event.type !== 'modelStreamUpdateEvent' || event.event.type !== 'modelContentBlockDeltaEvent') return undefined;
  return event.event.delta;
}

function logAgentMetrics(label: string, result: AgentResult, elapsedMs: number, textChars: number): void {
  const metrics = result.metrics;
  if (!metrics) {
    console.info(`[agent] ${label}: ${(elapsedMs / 1000).toFixed(1)}s`);
    return;
  }
  const { inputTokens, outputTokens } = metrics.accumulatedUsage;
  const seconds = elapsedMs / 1000;
  // More than one model call means the model wrote text before the structured output
  // tool (the SDK discards it and asks again) or its output failed validation
  const firstByte = metrics.accumulatedMetrics.timeToFirstByteMs;
  console.info(
    `[agent] ${label}: ${seconds.toFixed(1)}s, ${metrics.cycleCount} model call(s), ` +
      `${inputTokens} input / ${outputTokens} output tokens (${Math.round(outputTokens / seconds)} tokens/s)` +
      (firstByte !== undefined ? `, first byte ${(firstByte / 1000).toFixed(1)}s` : '') +
      (textChars > 0 ? `, ${textChars} chars of plain text` : '')
  );
}
