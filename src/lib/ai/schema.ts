import { z } from 'zod';

export const MinuteRatingSchema = z.enum(['great', 'ok', 'missed', 'mistake', 'critical']);
export type MinuteRating = z.infer<typeof MinuteRatingSchema>;

export const HighlightMomentSchema = z.object({
  minute: z.number().int().min(1),
  title: z.string().min(1),
  detail: z.string().min(1),
});
export type HighlightMoment = z.infer<typeof HighlightMomentSchema>;

export const BuildRecommendationSchema = z.object({
  insteadOf: z.string().min(1),
  suggested: z.string().min(1),
  reason: z.string().min(1),
});
export type BuildRecommendation = z.infer<typeof BuildRecommendationSchema>;

export const MinuteReviewSchema = z.object({
  minute: z.number().int().min(1),
  rating: MinuteRatingSchema,
  isKeyMoment: z.boolean(),
  headline: z.string().min(1),
  analysis: z.string().min(1),
  betterPlay: z.string().nullable(),
});
export type MinuteReview = z.infer<typeof MinuteReviewSchema>;

export const AiCoachingReportSchema = z.object({
  summary: z.object({
    grade: z.enum(['S', 'A', 'B', 'C', 'D']),
    score: z.number().int().min(0).max(100),
    verdict: z.string().min(1),
    strengths: z.array(HighlightMomentSchema).min(1),
    mistakes: z.array(HighlightMomentSchema).min(1),
    nextGameRules: z.array(z.string().min(1)).min(1),
  }),
  draftEvaluation: z.object({
    score: z.number().int().min(0).max(10),
    verdict: z.enum(['great', 'good', 'risky', 'poor']),
    laneMatchup: z.string().min(1),
    teamSynergy: z.string().min(1),
    enemyThreats: z.string().min(1),
    winCondition: z.string().min(1),
  }),
  buildEvaluation: z.object({
    score: z.number().int().min(0).max(10),
    runesVerdict: z.string().min(1),
    spellsVerdict: z.string().min(1),
    bootsAndTrinketVerdict: z.string().min(1),
    itemOrderVerdict: z.string().min(1),
    goodChoices: z.array(z.string().min(1)).default([]),
    recommendations: z.array(BuildRecommendationSchema).default([]),
  }),
  minutes: z.array(MinuteReviewSchema).min(1),
});

export type AiCoachingReport = z.infer<typeof AiCoachingReportSchema>;

/**
 * Clean JSON Schema compatible with Gemini Interactions TextResponseFormat.
 */
export const AI_COACHING_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  required: ['summary', 'draftEvaluation', 'buildEvaluation', 'minutes'],
  properties: {
    summary: {
      type: 'object',
      required: ['grade', 'score', 'verdict', 'strengths', 'mistakes', 'nextGameRules'],
      properties: {
        grade: { type: 'string', enum: ['S', 'A', 'B', 'C', 'D'] },
        score: { type: 'integer' },
        verdict: { type: 'string' },
        strengths: {
          type: 'array',
          items: {
            type: 'object',
            required: ['minute', 'title', 'detail'],
            properties: {
              minute: { type: 'integer' },
              title: { type: 'string' },
              detail: { type: 'string' },
            },
          },
        },
        mistakes: {
          type: 'array',
          items: {
            type: 'object',
            required: ['minute', 'title', 'detail'],
            properties: {
              minute: { type: 'integer' },
              title: { type: 'string' },
              detail: { type: 'string' },
            },
          },
        },
        nextGameRules: { type: 'array', items: { type: 'string' } },
      },
    },
    draftEvaluation: {
      type: 'object',
      required: ['score', 'verdict', 'laneMatchup', 'teamSynergy', 'enemyThreats', 'winCondition'],
      properties: {
        score: { type: 'integer' },
        verdict: { type: 'string', enum: ['great', 'good', 'risky', 'poor'] },
        laneMatchup: { type: 'string' },
        teamSynergy: { type: 'string' },
        enemyThreats: { type: 'string' },
        winCondition: { type: 'string' },
      },
    },
    buildEvaluation: {
      type: 'object',
      required: [
        'score',
        'runesVerdict',
        'spellsVerdict',
        'bootsAndTrinketVerdict',
        'itemOrderVerdict',
        'goodChoices',
        'recommendations',
      ],
      properties: {
        score: { type: 'integer' },
        runesVerdict: { type: 'string' },
        spellsVerdict: { type: 'string' },
        bootsAndTrinketVerdict: { type: 'string' },
        itemOrderVerdict: { type: 'string' },
        goodChoices: { type: 'array', items: { type: 'string' } },
        recommendations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['insteadOf', 'suggested', 'reason'],
            properties: {
              insteadOf: { type: 'string' },
              suggested: { type: 'string' },
              reason: { type: 'string' },
            },
          },
        },
      },
    },
    minutes: {
      type: 'array',
      items: {
        type: 'object',
        required: ['minute', 'rating', 'isKeyMoment', 'headline', 'analysis', 'betterPlay'],
        properties: {
          minute: { type: 'integer' },
          rating: { type: 'string', enum: ['great', 'ok', 'missed', 'mistake', 'critical'] },
          isKeyMoment: { type: 'boolean' },
          headline: { type: 'string' },
          analysis: { type: 'string' },
          betterPlay: { type: 'string', nullable: true },
        },
      },
    },
  },
};

export function extractJsonFromText(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Model did not return valid JSON');
  }
}

export function normalizeRawReport(raw: any): any {
  if (!raw || typeof raw !== 'object') return raw;

  // 1. Summary
  if (raw.summary && typeof raw.summary === 'object') {
    let s = Number(raw.summary.score ?? 75);
    if (isNaN(s)) s = 75;
    if (s <= 10) s = Math.round(s * 10);
    raw.summary.score = Math.min(100, Math.max(0, Math.round(s)));

    const g = String(raw.summary.grade || 'B').toUpperCase();
    raw.summary.grade = ['S', 'A', 'B', 'C', 'D'].includes(g) ? g : 'B';

    if (!Array.isArray(raw.summary.strengths) || raw.summary.strengths.length === 0) {
      raw.summary.strengths = [{ minute: 1, title: 'Хороший темп', detail: 'Уверенная игра на линии' }];
    }
    if (!Array.isArray(raw.summary.mistakes) || raw.summary.mistakes.length === 0) {
      raw.summary.mistakes = [{ minute: 1, title: 'Позиционирование', detail: 'Обращай внимание на варды' }];
    }
    if (!Array.isArray(raw.summary.nextGameRules) || raw.summary.nextGameRules.length === 0) {
      raw.summary.nextGameRules = ['Контролируй тайминги объектов'];
    }
  }

  // 2. Draft Evaluation
  if (!raw.draftEvaluation || typeof raw.draftEvaluation !== 'object') {
    raw.draftEvaluation = {};
  }
  let ds = Number(raw.draftEvaluation.score ?? 7);
  if (isNaN(ds)) ds = 7;
  if (ds > 10) ds = Math.round(ds / 10);
  raw.draftEvaluation.score = Math.min(10, Math.max(0, Math.round(ds)));

  const v = String(raw.draftEvaluation.verdict || 'good').toLowerCase();
  raw.draftEvaluation.verdict = ['great', 'good', 'risky', 'poor'].includes(v) ? v : 'good';
  if (!raw.draftEvaluation.laneMatchup) raw.draftEvaluation.laneMatchup = 'Стабильный матчап на линии';
  if (!raw.draftEvaluation.teamSynergy) raw.draftEvaluation.teamSynergy = 'Хорошая синергия в файтах';
  if (!raw.draftEvaluation.enemyThreats) raw.draftEvaluation.enemyThreats = 'Опасность фокуса в тимфайтах';
  if (!raw.draftEvaluation.winCondition) raw.draftEvaluation.winCondition = 'Контроль объектов и пуш линий';

  // 3. Build Evaluation
  if (!raw.buildEvaluation || typeof raw.buildEvaluation !== 'object') {
    raw.buildEvaluation = {};
  }
  let bs = Number(raw.buildEvaluation.score ?? 7);
  if (isNaN(bs)) bs = 7;
  if (bs > 10) bs = Math.round(bs / 10);
  raw.buildEvaluation.score = Math.min(10, Math.max(0, Math.round(bs)));

  if (!raw.buildEvaluation.runesVerdict) raw.buildEvaluation.runesVerdict = 'Руны соответствуют матчапу';
  if (!raw.buildEvaluation.spellsVerdict) raw.buildEvaluation.spellsVerdict = 'Заклинания подходят под позицию';
  if (!raw.buildEvaluation.bootsAndTrinketVerdict) raw.buildEvaluation.bootsAndTrinketVerdict = 'Стандартный выбор аксессуара';
  if (!raw.buildEvaluation.itemOrderVerdict) raw.buildEvaluation.itemOrderVerdict = 'Оптимальный порядок сборки';

  if (!Array.isArray(raw.buildEvaluation.goodChoices)) {
    raw.buildEvaluation.goodChoices = [];
  }
  if (!Array.isArray(raw.buildEvaluation.recommendations)) {
    raw.buildEvaluation.recommendations = [];
  }

  // 4. Minutes
  if (!Array.isArray(raw.minutes) || raw.minutes.length === 0) {
    raw.minutes = [{
      minute: 1,
      rating: 'ok',
      isKeyMoment: false,
      headline: 'Старт матча',
      analysis: 'Начало игры и выход на линию',
      betterPlay: null,
    }];
  } else {
    for (const m of raw.minutes) {
      if (m && typeof m === 'object') {
        const r = String(m.rating || 'ok').toLowerCase();
        m.rating = ['great', 'ok', 'missed', 'mistake', 'critical'].includes(r) ? r : 'ok';
        m.isKeyMoment = Boolean(m.isKeyMoment);
        if (m.betterPlay === undefined) m.betterPlay = null;
      }
    }
  }

  return raw;
}

export function parseAndValidateAiReport(rawText: string): AiCoachingReport {
  const parsed = extractJsonFromText(rawText);
  const normalized = normalizeRawReport(parsed);
  return AiCoachingReportSchema.parse(normalized);
}
