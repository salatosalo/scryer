import { NextResponse } from 'next/server';
import { getAiConfigStatus } from '@/lib/ai';

export async function GET() {
  const riotKey = (process.env.RIOT_API_KEY || '').trim();
  const riotConfigured = Boolean(riotKey && riotKey !== 'RGAPI-your-key-here');
  const ai = getAiConfigStatus();

  return NextResponse.json({
    riotConfigured,
    aiConfigured: ai.configured,
    aiProvider: ai.primaryProvider,
    aiModel: ai.primaryModel,
    hasAiFallback: ai.hasFallback,
  });
}
