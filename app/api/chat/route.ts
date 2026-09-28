import { NextRequest, NextResponse } from 'next/server';
import { AiConfigurationError, generateAiAnswer } from '@/lib/aiProvider';
import { getAppSettings, truncateAnswer } from '@/lib/appSettings';
import { chatUiText } from '@/lib/chatUiText';
import { assessCustomerHarassment } from '@/lib/customerHarassment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'No message provided' }, { status: 400 });
    }

    const appSettings = getAppSettings();
    const harassmentAssessment = assessCustomerHarassment(message);

    const generatedAnswer = await generateAiAnswer(
      message,
      appSettings.aiMaxOutputChars,
      harassmentAssessment
    );
    const answer = truncateAnswer(generatedAnswer.answer, appSettings.aiMaxOutputChars);

    return NextResponse.json({ answer, harassmentAssessment });
  } catch (error) {
    console.error(error);
    const detail = error instanceof Error ? error.message : String(error) || 'Unknown error';
    const status = error instanceof AiConfigurationError ? error.status : 500;

    return NextResponse.json(
      { error: chatUiText.requestFailedMessage, detail },
      { status }
    );
  }
}
