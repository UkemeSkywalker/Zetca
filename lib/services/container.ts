/**
 * Service container: wires up agents, repositories, and services based on
 * runtime config. Each export is lazily constructed once and memoized,
 * mirroring the module-level singletons each Python route file used to
 * create at import time.
 */

import { getConfig } from '../config';
import { StrategyRepository } from '../db/strategyRepository';
import { CopyRepository } from '../db/copyRepository';
import { SchedulerRepository } from '../db/schedulerRepository';
import { PublisherRepository } from '../db/publisherRepository';
import { UserRepository } from '../db/userRepository';
import { MediaRepository } from '../db/mediaRepository';
import { StrategyService } from './strategyService';
import { CopyService } from './copyService';
import { SchedulerService } from './schedulerService';
import { PublisherService } from './publisherService';
import { LinkedInClient } from './linkedinClient';
import { StrategistAgent } from '../agents/strategistAgent';
import { MockStrategistAgent } from '../agents/mockStrategistAgent';
import { KeywordAgent } from '../agents/keywordAgent';
import { MockKeywordAgent } from '../agents/mockKeywordAgent';
import { QuizStrategistAgent } from '../agents/quizStrategistAgent';
import { MockQuizStrategistAgent } from '../agents/mockQuizStrategistAgent';
import { CopywriterAgent } from '../agents/copywriterAgent';
import { MockCopywriterAgent } from '../agents/mockCopywriterAgent';
import { SchedulerAgent } from '../agents/schedulerAgent';
import { MockSchedulerAgent } from '../agents/mockSchedulerAgent';

function memo<T>(factory: () => T): () => T {
  let instance: T | undefined;
  return () => {
    if (instance === undefined) instance = factory();
    return instance;
  };
}

export const getStrategyRepository = memo(
  () => new StrategyRepository(getConfig().dynamoDbStrategiesTableName, getConfig().awsRegion)
);
export const getCopyRepository = memo(
  () => new CopyRepository(getConfig().dynamoDbCopiesTableName, getConfig().awsRegion)
);
export const getSchedulerRepository = memo(
  () => new SchedulerRepository(getConfig().dynamoDbScheduledPostsTableName, getConfig().awsRegion)
);
export const getPublisherRepository = memo(
  () => new PublisherRepository(getConfig().dynamoDbPublishLogTableName, getConfig().awsRegion)
);
export const getUserRepository = memo(() => new UserRepository());
export const getMediaRepository = memo(() => new MediaRepository());

export const getStrategistAgent = memo(() => {
  const cfg = getConfig();
  if (cfg.useMockAgent) {
    console.info('Using MOCK agent for strategy generation (no AWS required)');
    return new MockStrategistAgent();
  }
  console.info(`Using REAL Strands agent with Bedrock (region: ${cfg.awsRegion}, model: ${cfg.bedrockModelId})`);
  return new StrategistAgent({
    awsRegion: cfg.awsRegion,
    modelId: cfg.bedrockModelId,
    awsAccessKeyId: cfg.awsAccessKeyId,
    awsSecretAccessKey: cfg.awsSecretAccessKey,
  });
});

export const getQuizStrategistAgent = memo(() => {
  const cfg = getConfig();
  if (cfg.useMockAgent) {
    console.info('Using MOCK agent for quiz strategies (no AWS required)');
    return new MockQuizStrategistAgent();
  }
  console.info(`Using REAL Quiz Strategist agent with Bedrock (region: ${cfg.awsRegion}, model: ${cfg.bedrockModelId})`);
  return new QuizStrategistAgent({
    awsRegion: cfg.awsRegion,
    modelId: cfg.bedrockModelId,
    awsAccessKeyId: cfg.awsAccessKeyId,
    awsSecretAccessKey: cfg.awsSecretAccessKey,
  });
});

export const getKeywordAgent = memo(() => {
  const cfg = getConfig();
  if (cfg.useMockAgent) {
    console.info('Using MOCK agent for keyword suggestions (no AWS required)');
    return new MockKeywordAgent();
  }
  console.info(`Using REAL Keyword agent with Bedrock (region: ${cfg.awsRegion}, model: ${cfg.bedrockModelId})`);
  return new KeywordAgent({
    awsRegion: cfg.awsRegion,
    modelId: cfg.bedrockModelId,
    awsAccessKeyId: cfg.awsAccessKeyId,
    awsSecretAccessKey: cfg.awsSecretAccessKey,
  });
});

export const getCopywriterAgent = memo(() => {
  const cfg = getConfig();
  if (cfg.useMockAgent) {
    console.info('Using MOCK agent for copy generation (no AWS required)');
    return new MockCopywriterAgent();
  }
  console.info(`Using REAL Copywriter agent with Bedrock (region: ${cfg.awsRegion}, model: ${cfg.bedrockModelId})`);
  return new CopywriterAgent({
    awsRegion: cfg.awsRegion,
    modelId: cfg.bedrockModelId,
    awsAccessKeyId: cfg.awsAccessKeyId,
    awsSecretAccessKey: cfg.awsSecretAccessKey,
  });
});

export const getSchedulerAgent = memo(() => {
  const cfg = getConfig();
  if (cfg.useMockAgent) {
    console.info('Using MOCK agent for scheduling (no AWS required)');
    return new MockSchedulerAgent();
  }
  console.info(`Using REAL Scheduler agent with Bedrock (region: ${cfg.awsRegion}, model: ${cfg.bedrockModelId})`);
  return new SchedulerAgent({
    awsRegion: cfg.awsRegion,
    modelId: cfg.bedrockModelId,
    awsAccessKeyId: cfg.awsAccessKeyId,
    awsSecretAccessKey: cfg.awsSecretAccessKey,
  });
});

export const getLinkedInClient = memo(() => new LinkedInClient(getConfig().linkedinApiTimeoutSeconds));

export const getStrategyService = memo(
  () => new StrategyService(getStrategistAgent(), getStrategyRepository(), getQuizStrategistAgent())
);

export const getCopyService = memo(
  () => new CopyService(getCopywriterAgent(), getCopyRepository(), getStrategyRepository())
);

export const getSchedulerService = memo(
  () => new SchedulerService(getSchedulerAgent(), getSchedulerRepository(), getCopyRepository(), getStrategyRepository())
);

export const getPublisherService = memo(
  () =>
    new PublisherService(
      getLinkedInClient(),
      getPublisherRepository(),
      getSchedulerRepository(),
      getUserRepository(),
      getMediaRepository()
    )
);
