import type { SupportedLang } from '@/lib/i18n/types';
import { packEngineReportForPrompt } from '@/lib/engine/prompt-packer';
import type { EngineReport } from '@/lib/engine/types';

export function buildCoachingPrompts(
  report: EngineReport,
  lang: SupportedLang,
  mode: 'compact' | 'deep' = 'compact'
): { systemPrompt: string; userPrompt: string } {
  const languageDirective =
    lang === 'ru'
      ? 'Respond 100% in natural Russian using normal Russian League of Legends terminology (лайнинг, сплитпуш, вижн, баунти, ротация, макро, антихил, тимфайт, драфт, тайминг бэка). IMPORTANT FOR CHAMPIONS: Always use the official Russian champion names provided in brackets in the glossary (e.g., Фиора, Кейл, Наафири, Атрокс, Ари, Люциан, Каин, Седжуани, Брайар, Йоне). Never invent homemade transliterations. For items and runes, keep official names as shown in the glossary (e.g., Ravenous Hydra, Conqueror, Farsight Alteration).'
      : 'Respond 100% in crisp, direct English using authentic high-elo League of Legends terminology.';

  const minuteRule =
    mode === 'compact'
      ? `3. KEY MOMENTS REVIEW: You do NOT need to write essays for quiet farming minutes (our engine automatically fills baseline stats for calm farming). Provide entries in "minutes" for the KEY MOMENTS listed in the digest (fights, deaths, unspent gold, baron/dragon, towers, solo kills).
   - For strong tempo minutes: rating="great", isKeyMoment=true, explain why it mattered.
   - For missed opportunities, CS drops, missed objectives, or deaths: rating="missed" | "mistake" | "critical", isKeyMoment=true, give a concrete, specific "betterPlay" action.`
      : `3. COMPLETE MINUTE COVERAGE: You MUST output an entry in "minutes" for EVERY minute from 1 to ${report.durationMinutes} (exact count = ${report.durationMinutes}).
   - For calm/standard minutes: set rating="ok", isKeyMoment=false, keep headline (3-6 words) and analysis (1 short crisp sentence), betterPlay=null.
   - For strong tempo minutes: rating="great", isKeyMoment=true, explain why it mattered.
   - For missed opportunities, CS drops, missed objectives, or deaths: rating="missed" | "mistake" | "critical", isKeyMoment=true, give a concrete, specific "betterPlay" action.`;

  const systemPrompt = `You are a Challenger-level League of Legends analytical coach producing a structured JSON post-game review.

HARD RULES (NEVER VIOLATE):
1. GROUNDING: Treat the provided MATCH DIGEST and PATCH GLOSSARY as the SOLE authoritative source of truth for this patch's items, runes, champions, gold, CS, vision, events, and timestamps. Never override current-patch item mechanics from the glossary with outdated memory.
2. ZERO MICRO HALLUCINATIONS: You only have Riot Match-V5 Timeline data (positions, gold, CS, XP, items, wards, objectives, kill/death breakdowns). NEVER invent micro details you cannot see (do NOT claim the player missed a skillshot, mistimed a specific ability cast, or froze a wave pixel-by-pixel). Ground every critique in verifiable timeline facts: positioning, ward coverage, unspent gold, CS drops, bounty throws, objective timings, cross-map trades, and item spikes.
${minuteRule}
4. BUILD & DRAFT SPECIFICITY: Only recommend items/runes/trinkets that exist in the provided PATCH GLOSSARY or standard League rune trees. Tie every recommendation directly to enemy threats in THIS exact match.
5. STRICT SCORING SCALES:
   - "summary.score" is ALWAYS an integer from 0 to 100 (NEVER 1-10), strictly matching the letter grade:
     * S: 90–100 points (Dominant MVP / high impact, near-flawless macro)
     * A: 80–89 points (Very good performance, clean lane, minimal errors)
     * B: 70–79 points (Solid game, noticeable tempo/recall or vision hiccups)
     * C: 60–69 points (Below average, lost lane, frequent unforced errors)
     * D: 0–59 points (Major underperformance or heavy throws)
   - "draftEvaluation.score" is ALWAYS an integer from 0 to 10 (e.g. 7 or 8 out of 10).
   - "buildEvaluation.score" is ALWAYS an integer from 0 to 10 (e.g. 7, 8, or 9 out of 10).
6. ${languageDirective}
7. Output ONLY valid JSON conforming strictly to the requested schema — no extra commentary outside JSON.`;

  const digest = packEngineReportForPrompt(report, mode);

  const userPrompt =
    mode === 'compact'
      ? `Analyze this League of Legends match for the target player (${report.target.championName}, ${report.target.position}, ${report.result}) and produce the structured JSON coaching report (summary, draftEvaluation, buildEvaluation, and key moment reviews).

${digest}`
      : `Analyze this League of Legends match for the target player (${report.target.championName}, ${report.target.position}, ${report.result}) and produce the complete JSON coaching report covering all ${report.durationMinutes} minutes.

${digest}`;

  return { systemPrompt, userPrompt };
}
