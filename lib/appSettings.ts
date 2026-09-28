import { getAiGenerationConfig, type AiProvider } from '@/lib/aiProvider';
import { aiModeText } from '@/lib/chatUiText';

export type AiModeDisplay = {
  provider: AiProvider;
  label: string;
  description: string;
  tone: 'local' | 'demo';
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
  const ollamaApiBase =
    process.env.OLLAMA_API_BASE || process.env.OLLAMA_API_URL || 'http://localhost:11434';

  return {
    aiProvider: aiConfig.provider,
    aiModel: aiConfig.model,
    ollamaApiBase,
    aiMaxOutputChars: parseInteger(process.env.AI_MAX_OUTPUT_CHARS, 500, 100, 1000)
  };
};

export type AppSettings = ReturnType<typeof getAppSettings>;

export const getAiModeDisplay = (): AiModeDisplay => {
  const { provider } = getAiGenerationConfig();

  if (provider === 'demo') {
    return {
      provider,
      label: aiModeText.demo.label,
      description: aiModeText.demo.description,
      tone: 'demo'
    };
  }

  return {
    provider,
    label: aiModeText.ollama.label,
    description: aiModeText.ollama.description,
    tone: 'local'
  };
};

export const truncateAnswer = (answer: string, maxChars: number) => {
  if (answer.length <= maxChars) {
    return answer;
  }

  return `${answer.slice(0, Math.max(maxChars - 3, 0))}...`;
};
