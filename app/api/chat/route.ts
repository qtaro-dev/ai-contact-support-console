import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HarassmentAssessment } from '@/app/types';
import { AiConfigurationError, generateAiAnswer, getAiGenerationConfig } from '@/lib/aiProvider';
import { getAppSettings, rateLimitMessage, truncateAnswer } from '@/lib/appSettings';
import { assessCustomerHarassment } from '@/lib/customerHarassment';
import { getSupabaseServerClient, logSupabaseError } from '@/lib/supabaseServer';

type ChatCacheRow = {
  id: string;
  answer: string | null;
  hit_count: number | null;
  provider?: string | null;
  model?: string | null;
};

type InquiryInput = {
  userName: string | null;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  message: string;
  answer: string;
  provider: string;
  model: string;
  harassmentAssessment: HarassmentAssessment;
};

const isMissingCacheProviderColumn = (message?: string) =>
  Boolean(message?.includes('provider') || message?.includes('model'));

const getProviderScopedCachedAnswer = async (
  supabase: SupabaseClient,
  question: string,
  provider: string,
  model: string
) => {
  const { data, error } = await supabase
    .from('chat_cache')
    .select('id, answer, hit_count, provider, model')
    .eq('question', question)
    .eq('provider', provider)
    .eq('model', model)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<ChatCacheRow>();

  if (error) {
    if (isMissingCacheProviderColumn(error.message)) {
      console.warn('Provider-scoped chat cache skipped: provider/model columns are unavailable.');
      return null;
    }

    logSupabaseError('chat cache read', error);
    return null;
  }

  return data;
};

const getLegacyCachedAnswer = async (supabase: SupabaseClient, question: string) => {
  const { data, error } = await supabase
    .from('chat_cache')
    .select('id, answer, hit_count')
    .eq('question', question)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<ChatCacheRow>();

  if (error) {
    logSupabaseError('legacy chat cache read', error);
    return null;
  }

  return data;
};

const getCachedAnswer = async (
  supabase: SupabaseClient,
  question: string,
  provider: string,
  model: string
) => {
  const data =
    (await getProviderScopedCachedAnswer(supabase, question, provider, model)) ??
    (provider === 'ollama' ? await getLegacyCachedAnswer(supabase, question) : null);

  if (!data?.answer) {
    return null;
  }

  const { error: updateError } = await supabase
    .from('chat_cache')
    .update({
      hit_count: (data.hit_count ?? 0) + 1,
      updated_at: new Date().toISOString()
    })
    .eq('id', data.id);

  if (updateError) {
    logSupabaseError('chat cache hit count update', updateError);
  }

  return data.answer;
};

const saveAnswerToCache = async (
  supabase: SupabaseClient,
  question: string,
  answer: string,
  provider: string,
  model: string
) => {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from('chat_cache')
    .insert([
      {
        question,
        answer,
        provider,
        model,
        hit_count: 1,
        created_at: now,
        updated_at: now
      }
    ]);

  if (error) {
    if (isMissingCacheProviderColumn(error.message)) {
      const { error: legacyError } = await supabase
        .from('chat_cache')
        .insert([
          {
            question,
            answer,
            hit_count: 1,
            created_at: now,
            updated_at: now
          }
        ]);

      if (legacyError) {
        logSupabaseError('legacy chat cache save', legacyError);
      }

      return;
    }

    logSupabaseError('chat cache save', error);
  }
};

const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue === '' ? null : trimmedValue;
};

const normalizeEmail = (value: unknown) => {
  const email = normalizeOptionalText(value);

  if (!email) {
    return null;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const getIpAddress = (request: NextRequest) => {
  const forwardedFor = request.headers.get('x-forwarded-for');

  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() || null;
  }

  return request.headers.get('x-real-ip');
};

const saveInquiry = async (supabase: SupabaseClient, input: InquiryInput) => {
  const { error } = await supabase.from('inquiries').insert([
    {
      user_name: input.userName,
      email: input.email,
      ip_address: input.ipAddress,
      user_agent: input.userAgent,
      message: input.message,
      answer: input.answer,
      provider: input.provider,
      model: input.model,
      risk_level: input.harassmentAssessment.level,
      harassment_type: input.harassmentAssessment.harassmentType,
      harassment_categories: input.harassmentAssessment.categories,
      assessment_reasons: input.harassmentAssessment.reasons,
      recommended_action: input.harassmentAssessment.recommendedAction,
      status: 'new'
    }
  ]);

  if (error) {
    console.error('Failed to save inquiry record.', {
      code: error.code ?? 'unknown',
      message: error.message,
      hasMessage: Boolean(input.message),
      hasAnswer: Boolean(input.answer),
      hasEmail: Boolean(input.email),
      hasIpAddress: Boolean(input.ipAddress)
    });
  }
};

const saveInquiryIfAvailable = async (
  supabase: SupabaseClient | null,
  input: InquiryInput
) => {
  if (!supabase) {
    return;
  }

  await saveInquiry(supabase, input);
};

const isRateLimited = async (
  supabase: SupabaseClient | null,
  ipAddress: string | null,
  windowSeconds: number,
  maxRequests: number
) => {
  if (!supabase || !ipAddress) {
    return false;
  }

  const since = new Date(Date.now() - windowSeconds * 1000).toISOString();
  const { count, error } = await supabase
    .from('inquiries')
    .select('id', { count: 'exact', head: true })
    .eq('ip_address', ipAddress)
    .gte('created_at', since);

  if (error) {
    logSupabaseError('rate limit inquiry count', error);
    return false;
  }

  return (count ?? 0) >= maxRequests;
};

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const userName = normalizeOptionalText(body.userName);
  const email = normalizeEmail(body.email);

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  try {
    const appSettings = getAppSettings();
    const aiConfig = getAiGenerationConfig();
    const ipAddress = getIpAddress(request);
    const userAgent = request.headers.get('user-agent');
    const harassmentAssessment = assessCustomerHarassment(message);
    const supabase = getSupabaseServerClient();
    const rateLimited = appSettings.rateLimitEnabled
      ? await isRateLimited(
          supabase,
          ipAddress,
          appSettings.rateLimitWindowSeconds,
          appSettings.rateLimitMaxRequests
        )
      : false;

    if (rateLimited && appSettings.skipAiOnRateLimit) {
      await saveInquiryIfAvailable(supabase, {
        userName,
        email,
        ipAddress,
        userAgent,
        message,
        answer: rateLimitMessage,
        provider: aiConfig.provider,
        model: aiConfig.model,
        harassmentAssessment
      });

      return NextResponse.json({
        answer: rateLimitMessage,
        harassmentAssessment,
        rateLimited: true
      });
    }

    const cachedAnswer = supabase
      ? await getCachedAnswer(supabase, message, aiConfig.provider, aiConfig.model)
      : null;

    if (cachedAnswer) {
      const answer = truncateAnswer(cachedAnswer, appSettings.aiMaxOutputChars);
      await saveInquiryIfAvailable(supabase, {
        userName,
        email,
        ipAddress,
        userAgent,
        message,
        answer,
        provider: aiConfig.provider,
        model: aiConfig.model,
        harassmentAssessment
      });

      return NextResponse.json({ answer, harassmentAssessment, rateLimited });
    }

    const generatedAnswer = await generateAiAnswer(
      message,
      appSettings.aiMaxOutputChars,
      harassmentAssessment
    );
    const { provider, model } = generatedAnswer;
    const answer = truncateAnswer(generatedAnswer.answer, appSettings.aiMaxOutputChars);

    if (supabase) {
      await saveAnswerToCache(supabase, message, answer, provider, model);
    }

    await saveInquiryIfAvailable(supabase, {
      userName,
      email,
      ipAddress,
      userAgent,
      message,
      answer,
      provider,
      model,
      harassmentAssessment
    });

    return NextResponse.json({ answer, harassmentAssessment, rateLimited });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : String(error) || 'Unknown error';
    const status = error instanceof AiConfigurationError ? error.status : 500;

    return NextResponse.json(
      { error: 'AI回答の取得に失敗しました', detail },
      { status }
    );
  }
}
