import { getAiGenerationConfig } from '@/lib/aiProvider';

const parseBoolean = (value: string | undefined, defaultValue: boolean) => {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return defaultValue;
};

const parseInteger = (
  value: string | undefined,
  defaultValue: number,
  min: number,
  max: number
) => {
  const parsedValue = Number.parseInt(value ?? '', 10);

  if (Number.isNaN(parsedValue)) {
    return defaultValue;
  }

  return Math.min(Math.max(parsedValue, min), max);
};

export const getAppSettings = () => {
  const aiConfig = getAiGenerationConfig();

  return {
    aiProvider: aiConfig.provider,
    aiModel: aiConfig.model,
    aiMaxOutputChars: parseInteger(process.env.AI_MAX_OUTPUT_CHARS, 500, 100, 1000),
    rateLimitEnabled: parseBoolean(process.env.RATE_LIMIT_ENABLED, true),
    rateLimitWindowSeconds: parseInteger(
      process.env.RATE_LIMIT_WINDOW_SECONDS,
      60,
      1,
      60 * 60
    ),
    rateLimitMaxRequests: parseInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 2, 1, 5),
    skipAiOnRateLimit: parseBoolean(process.env.SKIP_AI_ON_RATE_LIMIT, true),
    hasOpenAiApiKey: Boolean(process.env.OPENAI_API_KEY),
    hasSupabaseServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  };
};

export type AppSettings = ReturnType<typeof getAppSettings>;

export const truncateAnswer = (answer: string, maxChars: number) => {
  if (answer.length <= maxChars) {
    return answer;
  }

  return `${answer.slice(0, Math.max(maxChars - 3, 0))}...`;
};

export const rateLimitMessage =
  '短時間に複数回送信されています。少し時間をおいてから再度お試しください。';
