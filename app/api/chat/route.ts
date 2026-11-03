import { NextRequest, NextResponse } from 'next/server';
import { generateAiAnswer } from '@/lib/aiProvider';
import { getAppSettings, truncateAnswer } from '@/lib/appSettings';
import { assessCustomerHarassment } from '@/lib/customerHarassment';
import { ApiError, errorResponse, logSecurityEvent, parseChatMessage, readLimitedBody, verifyRequestOrigin, withAbort } from '@/lib/apiSecurity';
import { enforceRateLimit, getSecurityStore, type SecurityStore } from '@/lib/securityStore';
import { securityPolicy } from '@/lib/securityPolicy';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(securityPolicy.processingTimeoutMs)]);
  let lease: string | null = null;
  let store: SecurityStore | undefined;
  try {
    verifyRequestOrigin(request);
    await enforceRateLimit('chat');
    if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
      throw new ApiError('unsupportedMediaType', 415);
    }
    store = getSecurityStore();
    lease = await store.acquire('chat:active', securityPolicy.concurrentChats, securityPolicy.leaseMs);
    if (!lease) throw new ApiError('busy', 503, 1);
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
  } finally {
    if (store && lease) {
      try { await store.release('chat:active', lease); }
      catch { logSecurityEvent('lease_release_failed'); }
    }
  }
}
