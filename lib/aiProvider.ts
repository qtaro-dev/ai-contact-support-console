import { aiAnswerSystemPrompt } from '@/lib/ollamaPrompt';
import type { HarassmentAssessment } from '@/app/types';

export type AiProvider = 'ollama' | 'demo';

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
const demoModel = 'demo-template';

const buildSystemPrompt = (maxOutputChars: number) =>
  `${aiAnswerSystemPrompt}\n回答は最大${maxOutputChars}文字以内に収めてください。`;

const getAiProvider = (): AiProvider => {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

  if (provider === 'ollama' || provider === 'demo') {
    return provider;
  }

  throw new AiConfigurationError(
    'AI_PROVIDER は "ollama" または "demo" を指定してください。'
  );
};

export const getAiGenerationConfig = (): AiGenerationConfig => {
  const provider = getAiProvider();

  if (provider === 'demo') {
    return {
      provider,
      model: demoModel
    };
  }

  return {
    provider,
    model: process.env.OLLAMA_MODEL || defaultOllamaModel
  };
};

const getDemoAnswer = (assessment: HarassmentAssessment) => {
  if (assessment.categories.includes('self_harm')) {
    return '安全確認が必要な内容です。緊急性がある場合は、すぐに周囲の人や公的な相談窓口、緊急窓口へつなぐ対応を検討してください。';
  }

  if (assessment.categories.includes('discriminatory_or_sexual')) {
    return '問い合わせ内容に不適切な表現が含まれています。通常対応は行わず、内容を記録したうえで管理者確認に回してください。';
  }

  if (assessment.level === 'high') {
    return '安全確保を優先する必要があります。対応者は単独判断を避け、管理者確認に回してください。必要に応じて対応を中断し、記録を残してください。';
  }

  if (assessment.level === 'medium') {
    return 'ご不便をおかけして申し訳ありません。内容を確認し、事実関係を整理したうえで対応いたします。状況が分かる情報があればお知らせください。';
  }

  return 'お問い合わせありがとうございます。内容を確認し、必要に応じて担当者よりご連絡いたします。追加情報があれば、続けてお知らせください。';
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

export const generateAiAnswer = async (
  message: string,
  maxOutputChars: number,
  assessment: HarassmentAssessment
): Promise<AiGenerationResult> => {
  const config = getAiGenerationConfig();
  const answer = await (async () => {
    if (config.provider === 'demo') {
      return getDemoAnswer(assessment);
    }

    return getOllamaAnswer(message, config.model, maxOutputChars);
  })();

  return {
    ...config,
    answer
  };
};
