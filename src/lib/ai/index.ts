import type { SupportedLang } from '@/lib/i18n/types';
import type { EngineReport } from '@/lib/engine/types';
import { buildDeterministicFallbackReport } from './fallback-engine';
import { callGeminiJson, DEFAULT_GEMINI_MODEL } from './gemini';
import { callGroqJson, DEFAULT_GROQ_MODEL } from './groq';
import { buildCoachingPrompts } from './prompt';
import { parseAndValidateAiReport, type AiCoachingReport } from './schema';

export type AiProviderName = 'gemini' | 'groq' | 'engine-only';

export interface AiAnalysisOutcome {
  report: AiCoachingReport | null;
  provider: AiProviderName;
  model: string;
  error: string | null;
}

function getConfiguredProviders(): Array<{ name: 'gemini' | 'groq'; apiKey: string; model: string }> {
  const preferred = (process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  const geminiKey = (process.env.GEMINI_API_KEY || '').trim();
  const groqKey = (process.env.GROQ_API_KEY || '').trim();

  const list: Array<{ name: 'gemini' | 'groq'; apiKey: string; model: string }> = [];

  const validGemini = geminiKey && geminiKey !== 'your-gemini-api-key-here';
  const validGroq = groqKey && groqKey !== 'your-groq-api-key-here';

  const primaryGeminiModel = (process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL).trim();
  const altGeminiModel =
    primaryGeminiModel === 'gemini-3.5-flash-lite' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash-lite';

  const geminiEntries = validGemini
    ? [
        { name: 'gemini' as const, apiKey: geminiKey, model: primaryGeminiModel },
        { name: 'gemini' as const, apiKey: geminiKey, model: altGeminiModel },
      ]
    : [];

  const groqEntry = validGroq
    ? { name: 'groq' as const, apiKey: groqKey, model: process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL }
    : null;

  if (preferred === 'groq') {
    if (groqEntry) list.push(groqEntry);
    list.push(...geminiEntries);
  } else {
    list.push(...geminiEntries);
    if (groqEntry) list.push(groqEntry);
  }

  return list;
}

export function getAiConfigStatus(): {
  configured: boolean;
  primaryProvider: AiProviderName;
  primaryModel: string;
  hasFallback: boolean;
} {
  const providers = getConfiguredProviders();
  if (providers.length === 0) {
    return {
      configured: false,
      primaryProvider: 'engine-only',
      primaryModel: 'deterministic-v1',
      hasFallback: false,
    };
  }
  return {
    configured: true,
    primaryProvider: providers[0].name,
    primaryModel: providers[0].model,
    hasFallback: providers.length > 1,
  };
}

export async function analyzeMatchWithAi(
  engineReport: EngineReport,
  lang: SupportedLang
): Promise<AiAnalysisOutcome> {
  const providers = getConfiguredProviders();
  if (providers.length === 0) {
    return {
      report: buildDeterministicFallbackReport(engineReport, lang),
      provider: 'engine-only',
      model: 'deterministic-v1',
      error: 'AI_KEY_MISSING',
    };
  }

  const requestedMode =
    (process.env.AI_ANALYSIS_MODE || 'compact').trim().toLowerCase();

  // For matches over 28 minutes, deep mode forces the LLM to output 30-45+ detailed JSON objects,
  // which frequently exceeds free-tier latency quotas (30-50s) or triggers 503 high-demand errors.
  // Compact mode focuses LLM intelligence on key combat & objective turns (~4-6s) and merges baseline stats.
  const initialMode =
    requestedMode === 'deep' && engineReport.durationMinutes <= 28 ? 'deep' : 'compact';

  const modesToTry: Array<'deep' | 'compact'> =
    initialMode === 'deep' ? ['deep', 'compact'] : ['compact'];

  let lastError = 'Unknown AI error';

  for (const mode of modesToTry) {
    const { systemPrompt, userPrompt } = buildCoachingPrompts(engineReport, lang, mode);

    for (const prov of providers) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const promptForAttempt =
            attempt === 1
              ? userPrompt
              : `${userPrompt}\n\nIMPORTANT: Return ONLY strict JSON matching the schema.`;

          const raw =
            prov.name === 'gemini'
              ? await callGeminiJson({
                  apiKey: prov.apiKey,
                  model: prov.model,
                  systemPrompt,
                  userPrompt: promptForAttempt,
                })
              : await callGroqJson({
                  apiKey: prov.apiKey,
                  model: prov.model,
                  systemPrompt,
                  userPrompt: promptForAttempt,
                });

          const validated = parseAndValidateAiReport(raw.text);

          // Normalize score if AI ever mistakenly outputs 1-10 instead of 0-100
          if (validated.summary.score <= 10) {
            validated.summary.score = Math.min(100, Math.round(validated.summary.score * 10));
          }

          // In compact mode, merge AI key moments with deterministic baseline for quiet minutes
          if (mode === 'compact') {
            const aiMap = new Map<number, (typeof validated.minutes)[number]>();
            for (const m of validated.minutes) {
              aiMap.set(m.minute, m);
            }

            const mergedMinutes = engineReport.minutes.map((m) => {
              const existing = aiMap.get(m.minute);
              if (existing) return existing;

              const defaultHeadline =
                m.events[0]?.label ||
                (lang === 'ru'
                  ? `Фарм линии · ${m.targetStats.cs} CS`
                  : `Wave farming · ${m.targetStats.cs} CS`);

              const defaultAnalysis =
                lang === 'ru'
                  ? `Спокойный фарм и удержание позиции (уровень ${m.targetStats.level}, ${m.targetStats.cs} CS, разница по золоту ${m.goldDiff >= 0 ? '+' : ''}${m.goldDiff}g).`
                  : `Standard wave farming and lane control (Lv ${m.targetStats.level}, ${m.targetStats.cs} CS, gold diff ${m.goldDiff >= 0 ? '+' : ''}${m.goldDiff}g).`;

              return {
                minute: m.minute,
                rating: 'ok' as const,
                isKeyMoment: false,
                headline: defaultHeadline,
                analysis: defaultAnalysis,
                betterPlay: null,
              };
            });

            validated.minutes = mergedMinutes;
          }

          return {
            report: validated,
            provider: prov.name,
            model: raw.model,
            error: null,
          };
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.warn(`[AI] Attempt ${attempt} on ${prov.name}:${prov.model} failed:`, lastError);
          // If high-demand spike (503) or rate limit (429) or auth, immediately try fallback provider/model
          if (
            lastError.includes('503') ||
            lastError.includes('high demand') ||
            lastError.includes('429') ||
            lastError.includes('401') ||
            lastError.includes('403') ||
            lastError.includes('timed out')
          ) {
            break;
          }
        }
      }
    }
  }

  console.warn(`[AI] All AI providers failed. Generating high-precision deterministic fallback report (error: ${lastError})...`);
  return {
    report: buildDeterministicFallbackReport(engineReport, lang),
    provider: 'engine-only',
    model: 'deterministic-v1',
    error: lastError,
  };
}

export async function translateCoachingReportWithAi(
  sourceReport: AiCoachingReport,
  fromLang: SupportedLang,
  toLang: SupportedLang
): Promise<AiAnalysisOutcome> {
  if (fromLang === toLang) {
    return {
      report: sourceReport,
      provider: 'engine-only',
      model: 'cache-passthrough',
      error: null,
    };
  }

  const providers = getConfiguredProviders();
  if (providers.length === 0) {
    return {
      report: sourceReport,
      provider: 'engine-only',
      model: 'deterministic-v1',
      error: 'AI_KEY_MISSING',
    };
  }

  const fromLabel = fromLang === 'ru' ? 'Russian' : 'English';
  const toLabel = toLang === 'ru' ? 'Russian' : 'English';

  const systemPrompt = `You are a professional League of Legends coaching report translator.
Translate the provided structured coaching report JSON from ${fromLabel} to ${toLabel}.
CRITICAL RULES:
1. PRESERVE ALL NUMBERS AND ENUMS EXACTLY:
   - summary.grade and summary.score MUST NOT BE CHANGED under any circumstances.
   - draftEvaluation.score and draftEvaluation.verdict MUST NOT BE CHANGED.
   - buildEvaluation.score MUST NOT BE CHANGED.
   - For every minute in "minutes": minute, rating, and isKeyMoment MUST NOT BE CHANGED.
   - For strengths and mistakes: minute MUST NOT BE CHANGED.
2. TRANSLATE HUMAN TEXT ONLY:
   - Translate verdict, explanations, headlines, analysis, betterPlay, reasons, titles, details, nextGameRules.
   - Use standard League of Legends terminology in the target language (CS, wave state, dive, trade, gank, roam, prio, dragon, baron).
3. Return STRICTLY valid JSON conforming to the schema.`;

  const userPrompt = `Translate this League of Legends coaching report from ${fromLabel} to ${toLabel}:\n\n${JSON.stringify(sourceReport)}`;

  let lastError = 'Unknown translation error';

  for (const prov of providers) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const raw =
          prov.name === 'gemini'
            ? await callGeminiJson({
                apiKey: prov.apiKey,
                model: prov.model,
                systemPrompt,
                userPrompt,
              })
            : await callGroqJson({
                apiKey: prov.apiKey,
                model: prov.model,
                systemPrompt,
                userPrompt,
              });

        const validated = parseAndValidateAiReport(raw.text);

        // ENFORCE 100% EXACT NUMERICAL AND STRUCTURAL PARITY WITH SOURCE REPORT
        validated.summary.grade = sourceReport.summary.grade;
        validated.summary.score = sourceReport.summary.score;
        validated.draftEvaluation.score = sourceReport.draftEvaluation.score;
        validated.draftEvaluation.verdict = sourceReport.draftEvaluation.verdict;
        validated.buildEvaluation.score = sourceReport.buildEvaluation.score;

        for (let i = 0; i < sourceReport.minutes.length; i++) {
          const srcMin = sourceReport.minutes[i];
          const tgtMin = validated.minutes[i];
          if (tgtMin && srcMin) {
            tgtMin.minute = srcMin.minute;
            tgtMin.rating = srcMin.rating;
            tgtMin.isKeyMoment = srcMin.isKeyMoment;
          }
        }

        for (let i = 0; i < sourceReport.summary.strengths.length; i++) {
          if (validated.summary.strengths[i] && sourceReport.summary.strengths[i]) {
            validated.summary.strengths[i].minute = sourceReport.summary.strengths[i].minute;
          }
        }

        for (let i = 0; i < sourceReport.summary.mistakes.length; i++) {
          if (validated.summary.mistakes[i] && sourceReport.summary.mistakes[i]) {
            validated.summary.mistakes[i].minute = sourceReport.summary.mistakes[i].minute;
          }
        }

        return {
          report: validated,
          provider: prov.name,
          model: raw.model,
          error: null,
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        if (
          lastError.includes('503') ||
          lastError.includes('high demand') ||
          lastError.includes('429') ||
          lastError.includes('401') ||
          lastError.includes('403')
        ) {
          break;
        }
      }
    }
  }

  return {
    report: sourceReport,
    provider: 'engine-only',
    model: 'translation-fallback',
    error: lastError,
  };
}
