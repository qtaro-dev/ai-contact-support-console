import { getAiGenerationConfig, type AiProvider } from '@/lib/aiProvider';

export type AiModeDisplay = {
  provider: AiProvider;
  label: string;
  description: string;
  tone: 'local' | 'production' | 'demo';
};

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

export const getAiModeDisplay = (): AiModeDisplay => {
  const { provider } = getAiGenerationConfig();

  if (provider === 'openai') {
    return {
      provider,
      label: 'OpenAI API / 本番実行',
      description: 'OpenAI APIを使う本番向けの回答生成モードです。',
      tone: 'production'
    };
  }

  if (provider === 'demo') {
    return {
      provider,
      label: 'AI-KEY無し demoモード',
      description: 'demoモードではOpenAI/Ollama APIを呼ばず、固定テンプレート回答で動作します。',
      tone: 'demo'
    };
  }

  return {
    provider,
    label: 'Ollama接続 / ローカル実行',
    description: 'ローカルのOllamaを使う開発向けの回答生成モードです。',
    tone: 'local'
  };
};

export const truncateAnswer = (answer: string, maxChars: number) => {
  if (answer.length <= maxChars) {
    return answer;
  }

  return `${answer.slice(0, Math.max(maxChars - 3, 0))}...`;
};

export const rateLimitMessage =
  '短時間に複数回送信されています。少し時間をおいてから再度お試しください。';
