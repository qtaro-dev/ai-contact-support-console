import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = body.message;

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  try {
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
    return NextResponse.json({ answer: data.content });
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
