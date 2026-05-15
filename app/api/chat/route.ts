import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type SupabaseError = {
  code?: string;
  message?: string;
};

type ChatCacheRow = {
  id: string;
  answer: string | null;
  hit_count: number | null;
};

const getSupabaseEnvStatus = () => ({
  hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
});

const logSupabaseError = (operation: string, error: SupabaseError) => {
  const isPermissionError =
    error.code === '42501' || error.message?.toLowerCase().includes('permission denied');

  if (isPermissionError) {
    console.warn(`Supabase permission error during ${operation}.`, {
      ...getSupabaseEnvStatus(),
      code: error.code ?? 'unknown'
    });
    return;
  }

  console.warn(`Supabase error during ${operation}:`, error.message);
};

const getSupabaseClient = (): SupabaseClient | null => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('Supabase cache skipped: missing Supabase environment variables.', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRoleKey: Boolean(serviceRoleKey)
    });
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
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

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  try {
    const supabase = getSupabaseClient();
    const cachedAnswer = supabase ? await getCachedAnswer(supabase, message) : null;

    if (cachedAnswer) {
      return NextResponse.json({ answer: cachedAnswer });
    }

    const apiUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
    const model = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';

    const response = await fetch(`${apiUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: message }],
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

    return NextResponse.json({ answer });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : String(error) || 'Unknown error';
    return NextResponse.json(
      { error: 'ローカルLLMからの回答取得に失敗しました', detail },
      { status: 500 }
    );
  }
}
