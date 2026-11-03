import { aiAnswerSystemPrompt } from '@/lib/ollamaPrompt';
import type { HarassmentAssessment } from '@/app/types';
import { aiProviderText } from '@/lib/chatUiText';
import { ApiError, readLimitedBody } from '@/lib/apiSecurity';
import { securityPolicy } from '@/lib/securityPolicy';

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
  `${aiAnswerSystemPrompt}\n${aiProviderText.outputLimit(maxOutputChars)}`;

const getAiProvider = (): AiProvider => {
  const provider = (process.env.AI_PROVIDER || 'ollama').toLowerCase();

  if (provider === 'ollama' || provider === 'demo') {
    return provider;
  }

  throw new AiConfigurationError(
    aiProviderText.invalidProvider
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
    return aiProviderText.demo.selfHarm;
  }

  if (assessment.categories.includes('discriminatory_or_sexual')) {
    return aiProviderText.demo.sexual;
  }

  if (assessment.level === 'high') {
    return aiProviderText.demo.high;
  }

  if (assessment.level === 'medium') {
    return aiProviderText.demo.medium;
  }

  return aiProviderText.demo.normal;
};

const getOllamaAnswer = async (message: string, model: string, maxOutputChars: number, signal: AbortSignal) => {
  const apiBase =
    process.env.OLLAMA_API_BASE || process.env.OLLAMA_API_URL || 'http://localhost:11434';
  const systemPrompt = buildSystemPrompt(maxOutputChars);

  try {
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
        stream: false,
        options: { num_predict: securityPolicy.ollamaMaxTokens }
      }),
      signal,
      cache: 'no-store'
    });

    if (!response.ok) {
      void response.body?.cancel().catch(() => {});
      throw new ApiError('generationFailed', 502);
    }

    const data = JSON.parse(await readLimitedBody(response, securityPolicy.ollamaResponseMaxBytes, signal));
    const answer = data?.message?.content || data?.response;
    if (typeof answer !== 'string' || !answer.trim()) throw new ApiError('generationFailed', 502);
    return answer;
  } catch {
    throw new ApiError(signal.aborted ? 'timeout' : 'generationFailed', signal.aborted ? 504 : 502);
  }
};

export const generateAiAnswer = async (
  message: string,
  maxOutputChars: number,
  assessment: HarassmentAssessment,
  signal: AbortSignal = AbortSignal.timeout(securityPolicy.processingTimeoutMs)
): Promise<AiGenerationResult> => {
  const config = getAiGenerationConfig();
  const answer = await (async () => {
    if (config.provider === 'demo') {
      return getDemoAnswer(assessment);
    }

    return getOllamaAnswer(message, config.model, maxOutputChars, signal);
  })();

  return {
    ...config,
    answer
  };
};
