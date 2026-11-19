import { NextRequest, NextResponse } from 'next/server';
import { buildDemoMatch } from '@/lib/demo';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lang = searchParams.get('lang') === 'en' ? 'en' : 'ru';
  const demo = buildDemoMatch(lang);
  return NextResponse.json({
    engineReport: demo.engineReport,
    aiReport: demo.aiReport,
    aiError: null,
    meta: demo.meta,
  });
}
