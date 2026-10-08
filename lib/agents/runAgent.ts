/**
 * Runs a Strands agent call and logs how long it took and how many tokens it used,
 * so slow generations can be traced to their cause (long output, extra model calls).
 */

import type { Agent, AgentResult, AgentStreamEvent, InvokeArgs, InvokeOptions } from '@strands-agents/sdk';

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
  const stream = agent.stream(prompt, invokeOptions);
  let next = await stream.next();
  while (!next.done) {
    onEvent?.(next.value);
    next = await stream.next();
  }
  const result = next.value;
  logAgentMetrics(label, result, Date.now() - started);
  return result;
}

function logAgentMetrics(label: string, result: AgentResult, elapsedMs: number): void {
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
      (firstByte !== undefined ? `, first byte ${(firstByte / 1000).toFixed(1)}s` : '')
  );
}
