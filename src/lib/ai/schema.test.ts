import { describe, expect, it } from 'vitest';
import { parseAndValidateAiReport } from './schema';

const VALID_PAYLOAD = {
  summary: {
    grade: 'B',
    score: 76,
    verdict: 'Dominated top lane but surrendered 5 dragons and failed to crack an inhibitor.',
    strengths: [{ minute: 7, title: 'Solo kill on Kayle', detail: 'Snowballed a 600g lead early.' }],
    mistakes: [{ minute: 24, title: 'Died deep without vision', detail: 'Gave 600g shutdown before Drake.' }],
    nextGameRules: ['Switch to Farsight Alteration before pushing tier-2 towers.'],
  },
  draftEvaluation: {
    score: 8,
    verdict: 'great',
    laneMatchup: 'Fiora dominates Kayle pre-11.',
    teamSynergy: 'Strong splitpush pressure paired with Varus waveclear.',
    enemyThreats: "Cho'Gath true damage and Zed dive.",
    winCondition: 'Force 1-3-1 sidelane pressure opposite to Dragon/Baron.',
  },
  buildEvaluation: {
    score: 6,
    runesVerdict: 'Hail of Blades falls off compared to Conqueror vs ChoGath.',
    spellsVerdict: 'Flash + Teleport is ideal.',
    bootsAndTrinketVerdict: 'No boots at 39m hurts vital spacing; kept Stealth Ward too long.',
    itemOrderVerdict: 'Ravenous Hydra first spike was on time.',
    goodChoices: ['Ravenous Hydra', 'Hullbreaker'],
    recommendations: [
      {
        insteadOf: 'Stealth Ward',
        suggested: 'Farsight Alteration',
        reason: 'Prevents blind facechecks while splitpushing.',
      },
    ],
  },
  minutes: [
    {
      minute: 1,
      rating: 'ok',
      isKeyMoment: false,
      headline: 'Standard lane start',
      analysis: 'Normal opening setup.',
      betterPlay: null,
    },
  ],
};

describe('AiCoachingReport schema validation', () => {
  it('parses clean JSON and markdown-fenced JSON', () => {
    const clean = parseAndValidateAiReport(JSON.stringify(VALID_PAYLOAD));
    expect(clean.summary.grade).toBe('B');

    const fenced = parseAndValidateAiReport('```json\n' + JSON.stringify(VALID_PAYLOAD) + '\n```');
    expect(fenced.draftEvaluation.score).toBe(8);
  });

  it('rejects malformed payloads missing required sections', () => {
    expect(() => parseAndValidateAiReport('{"summary":{"grade":"Z"}}')).toThrow();
  });
});
