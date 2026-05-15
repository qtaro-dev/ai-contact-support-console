import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL 環境変数が設定されていません');
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY 環境変数が設定されていません');
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.message;

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check cache
    const { data: cachedMessage, error: cacheError } = await supabase
      .from('chat_cache')
      .select('*')
      .eq('question', message)
      .single();

    if (cachedMessage) {
      // Update hit_count and updated_at
      const { error: updateCacheError } = await supabase
        .from('chat_cache')
        .update({ hit_count: cachedMessage.hit_count + 1, updated_at: new Date() })
        .eq('id', cachedMessage.id);

      if (updateCacheError) {
        throw new Error(`Failed to update cache: ${updateCacheError.message}`);
      }

      return NextResponse.json({ answer: cachedMessage.answer });
    } else {
      // Fetch from Ollama
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
        const errorData = await response.json();
        throw new Error(`Failed to get response from Ollama: ${errorData.error || errorData.detail}`);
      }

      const data = await response.json();
      console.log("Ollama response:", data);
      let answer = data.message?.content || data.response || "ローカルLLMから空の回答が返されました。";

      // Save to cache
      const { error: insertCacheError } = await supabase
        .from('chat_cache')
        .insert([
          {
            question: message,
            answer: answer || '',
            hit_count: 1,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]);

      if (insertCacheError) {
        throw new Error(`Failed to insert cache: ${insertCacheError.message}`);
      }

      return NextResponse.json({ answer });
    }
  } catch (error) {
    console.error(error);
    let detail;
    if (error instanceof Error) {
      detail = error.message;
    } else {
      detail = String(error) || "Unknown error";
    }
    return NextResponse.json({ error: 'ローカルLLMからの回答取得に失敗しました', detail }, { status: 500 });
  }
}
