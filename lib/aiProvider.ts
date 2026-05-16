import { aiAnswerSystemPrompt } from '@/lib/ollamaPrompt';

export type AiProvider = 'ollama' | 'openai';

export type AiGenerationConfig = {
  provider: AiProvider;
  model: string;
};

export type AiGenerationResult = AiGenerationConfig & {
  answer: string;
};

export class AiConfigurationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'AiConfigurationError';
    this.status = status;
  }
}

const defaultOllamaModel = 'qwen2.5-coder:7b';
const defaultOpenAiModel = 'gpt-4.1-mini';

const buildSystemPrompt = (maxOutputChars: number) =>
  `${aiAnswerSystemPrompt}\n回答は最大${maxOutputChars}文字以内に収めてください。`;

const getAiProvider = (): AiProvider => {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

  if (provider === 'ollama' || provider === 'openai') {
    return provider;
  }

  throw new AiConfigurationError(
    'AI_PROVIDER は "ollama" または "openai" を指定してください。'
  );
};

export const getAiGenerationConfig = (): AiGenerationConfig => {
  const provider = getAiProvider();

  if (provider === 'openai') {
    return {
      provider,
      model: process.env.OPENAI_MODEL || defaultOpenAiModel
    };
  }

  return {
    provider,
    model: process.env.OLLAMA_MODEL || defaultOllamaModel
  };
};

const getOpenAiText = (data: unknown): string | null => {
  if (typeof data !== 'object' || data === null) {
    return null;
  }

  if ('output_text' in data && typeof data.output_text === 'string') {
    return data.output_text;
  }

  const output = 'output' in data ? data.output : null;

  if (!Array.isArray(output)) {
    return null;
  }

  const textParts = output.flatMap((item) => {
    if (typeof item !== 'object' || item === null || !('content' in item)) {
      return [];
    }

    const content = item.content;

    if (!Array.isArray(content)) {
      return [];
    }

    return content
      .map((part) => {
        if (typeof part !== 'object' || part === null) {
          return null;
        }

        if ('text' in part && typeof part.text === 'string') {
          return part.text;
        }

        return null;
      })
      .filter((text): text is string => Boolean(text));
  });

  return textParts.length > 0 ? textParts.join('\n') : null;
};

const getOllamaAnswer = async (message: string, model: string, maxOutputChars: number) => {
  const apiBase =
    process.env.OLLAMA_API_BASE || process.env.OLLAMA_API_URL || 'http://localhost:11434';
  const systemPrompt = buildSystemPrompt(maxOutputChars);

  const response = await fetch(`${apiBase}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ],
      stream: false
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const detail =
      typeof errorData === 'object' && errorData !== null
        ? 'error' in errorData
          ? errorData.error
          : 'detail' in errorData
            ? errorData.detail
            : response.statusText
        : response.statusText;

    throw new Error(`Failed to get response from Ollama: ${String(detail)}`);
  }

  const data = await response.json();
  console.log('Ollama response:', data);

  return data.message?.content || data.response || 'ローカルLLMから空の回答が返されました。';
};

const getOpenAiAnswer = async (message: string, model: string, maxOutputChars: number) => {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new AiConfigurationError(
      'OPENAI_API_KEY が未設定です。AI_PROVIDER=openai を使う場合はサーバー環境変数に設定してください。'
    );
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      instructions: buildSystemPrompt(maxOutputChars),
      input: message,
      max_output_tokens: Math.ceil(maxOutputChars * 1.2)
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      typeof errorData === 'object' &&
      errorData !== null &&
      'error' in errorData &&
      typeof errorData.error === 'object' &&
      errorData.error !== null &&
      'message' in errorData.error
        ? errorData.error.message
        : response.statusText;

    throw new Error(`Failed to get response from OpenAI: ${String(message)}`);
  }

  const data = await response.json();
  const answer = getOpenAiText(data);

  return answer || 'OpenAI APIから空の回答が返されました。';
};

export const generateAiAnswer = async (
  message: string,
  maxOutputChars: number
): Promise<AiGenerationResult> => {
  const config = getAiGenerationConfig();
  const answer =
    config.provider === 'openai'
      ? await getOpenAiAnswer(message, config.model, maxOutputChars)
      : await getOllamaAnswer(message, config.model, maxOutputChars);

  return {
    ...config,
    answer
  };
};
