import { NextRequest, NextResponse } from 'next/server';
import { generateAiAnswer } from '@/lib/aiProvider';
import { getAppSettings, truncateAnswer } from '@/lib/appSettings';
import { assessCustomerHarassment } from '@/lib/customerHarassment';
import { ApiError, errorResponse, parseChatMessage, readLimitedBody, verifyRequestOrigin, withAbort } from '@/lib/apiSecurity';
import { securityPolicy } from '@/lib/securityPolicy';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(securityPolicy.processingTimeoutMs)]);
  try {
    verifyRequestOrigin(request);
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      throw new ApiError('unsupportedMediaType', 415);
    }
    const bodySignal = AbortSignal.any([signal, AbortSignal.timeout(securityPolicy.bodyTimeoutMs)]);
    const message = parseChatMessage(await readLimitedBody(request, securityPolicy.requestMaxBytes, bodySignal));
    const settings = getAppSettings();
    const harassmentAssessment = assessCustomerHarassment(message);
    const result = await withAbort(generateAiAnswer(message, settings.aiMaxOutputChars, harassmentAssessment, signal), signal);
    return NextResponse.json(
      { answer: truncateAnswer(result.answer, settings.aiMaxOutputChars), harassmentAssessment },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
