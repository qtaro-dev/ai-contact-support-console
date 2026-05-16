import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { HarassmentAssessment } from '@/app/types';
import { assessCustomerHarassment } from '@/lib/customerHarassment';
import { ollamaSystemPrompt } from '@/lib/ollamaPrompt';
import { getSupabaseServerClient, logSupabaseError } from '@/lib/supabaseServer';

type ChatCacheRow = {
  id: string;
  answer: string | null;
  hit_count: number | null;
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

const getCachedAnswer = async (supabase: SupabaseClient, question: string) => {
  const { data, error } = await supabase
    .from('chat_cache')
    .select('id, answer, hit_count')
    .eq('question', question)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle<ChatCacheRow>();

  if (error) {
    logSupabaseError('chat cache read', error);
    return null;
  }

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
  answer: string
) => {
  const now = new Date().toISOString();
  const { error } = await supabase
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

  if (error) {
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const userName = normalizeOptionalText(body.userName);
  const email = normalizeEmail(body.email);

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  try {
    const provider = 'ollama';
    const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
    const ipAddress = getIpAddress(request);
    const userAgent = request.headers.get('user-agent');
    const harassmentAssessment = assessCustomerHarassment(message);
    const supabase = getSupabaseServerClient();
    const cachedAnswer = supabase ? await getCachedAnswer(supabase, message) : null;

    if (cachedAnswer) {
      await saveInquiryIfAvailable(supabase, {
        userName,
        email,
        ipAddress,
        userAgent,
        message,
        answer: cachedAnswer,
        provider,
        model,
        harassmentAssessment
      });

      return NextResponse.json({ answer: cachedAnswer, harassmentAssessment });
    }

    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: ollamaSystemPrompt },
          { role: 'user', content: message }
        ],
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Failed to get response from Ollama: ${errorData.error || errorData.detail || response.statusText}`
      );
    }

    const data = await response.json();
    console.log('Ollama response:', data);
    const answer =
      data.message?.content ||
      data.response ||
      'ローカルLLMから空の回答が返されました。';

    if (supabase) {
      await saveAnswerToCache(supabase, message, answer);
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

    return NextResponse.json({ answer, harassmentAssessment });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : String(error) || 'Unknown error';
    return NextResponse.json(
      { error: 'ローカルLLMからの回答取得に失敗しました', detail },
      { status: 500 }
    );
  }
}
