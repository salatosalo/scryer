import type { SupportedLang } from '@/lib/i18n/types';
import type { EngineReport } from '@/lib/engine/types';
import type { AiCoachingReport, HighlightMoment, MinuteReview } from './schema';

/**
 * Builds a 100% valid, rich AiCoachingReport directly from deterministic Timeline data.
 * Used when all external AI APIs (Gemini/Groq) are unreachable (e.g., Google 503 high-demand outage).
 */
export function buildDeterministicFallbackReport(
  engine: EngineReport,
  lang: SupportedLang
): AiCoachingReport {
  const isRu = lang === 'ru';
  const { target, laneOpponent, durationMinutes } = engine;

  // 1. Calculate deterministic performance score (0-100)
  let baseScore = 65;
  if (engine.result === 'WIN') baseScore += 10;
  if (target.kda >= 4) baseScore += 8;
  else if (target.kda >= 2.5) baseScore += 4;
  else if (target.kda < 1.5) baseScore -= 8;

  if (target.csPerMin >= 8) baseScore += 8;
  else if (target.csPerMin >= 6.5) baseScore += 4;
  else if (target.csPerMin < 5) baseScore -= 6;

  if (target.killParticipation >= 50) baseScore += 5;
  if (target.visionScore >= durationMinutes * 1.2) baseScore += 4;
  else if (target.visionScore < durationMinutes * 0.6) baseScore -= 4;

  const score = Math.max(35, Math.min(95, Math.round(baseScore)));
  let grade: 'S' | 'A' | 'B' | 'C' | 'D' = 'B';
  if (score >= 90) grade = 'S';
  else if (score >= 80) grade = 'A';
  else if (score >= 70) grade = 'B';
  else if (score >= 60) grade = 'C';
  else grade = 'D';

  // 2. Extract strengths from timeline
  const strengths: HighlightMoment[] = [];
  const soloKillMin = engine.minutes.find((m) =>
    m.events.some((e) => e.type === 'KILL' && e.label.includes('Соло') || e.label.includes('Solo'))
  );
  if (soloKillMin) {
    strengths.push({
      minute: soloKillMin.minute,
      title: isRu ? 'Соло-килл на линии' : 'Solo kill in lane',
      detail: isRu
        ? `Отличная агрессия и тайминг трейда на ${soloKillMin.minute}-й минуте.`
        : `Strong trade execution and solo pressure at min ${soloKillMin.minute}.`,
    });
  }

  if (target.csPerMin >= 6.5) {
    strengths.push({
      minute: Math.min(10, durationMinutes),
      title: isRu ? `Фарм темп ${target.csPerMin} CS/мин` : `Farming pace ${target.csPerMin} CS/m`,
      detail: isRu
        ? `Стабильное добивание миньонов позволило держать постоянный приток золота.`
        : `Consistent CS pace maintained steady gold income throughout laning.`,
    });
  }

  const towerMin = engine.minutes.find((m) =>
    m.events.some((e) => e.type === 'PLATE' || e.type === 'BUILDING')
  );
  if (towerMin) {
    strengths.push({
      minute: towerMin.minute,
      title: isRu ? 'Урон по строениям' : 'Tower pressure',
      detail: isRu
        ? `Своевременный пуш и взятие пластин/вышки открыли карту.`
        : `Capitalized on lane priority to secure tower gold and map opening.`,
    });
  }

  if (strengths.length === 0) {
    strengths.push({
      minute: 5,
      title: isRu ? 'Удержание линии' : 'Lane stability',
      detail: isRu ? 'Стабильная игра на ранней стадии матча.' : 'Controlled early laning pace.',
    });
  }

  // 3. Extract mistakes from flags & deaths
  const mistakes: HighlightMoment[] = [];
  const deathMin = engine.minutes.find((m) =>
    m.events.some((e) => e.type === 'DEATH' && !e.hadVision)
  );
  if (deathMin) {
    mistakes.push({
      minute: deathMin.minute,
      title: isRu ? 'Смерть вслепую (без вижна)' : 'Death without vision',
      detail: isRu
        ? `Заход в туман войны без вардов привел к бесплатной отдаче золота сопернику.`
        : `Stepped into fog of war without ward coverage, resulting in an unforced death.`,
    });
  }

  const unspentMin = engine.minutes.find((m) => m.flags.includes('HIGH_UNSPENT_GOLD'));
  if (unspentMin) {
    mistakes.push({
      minute: unspentMin.minute,
      title: isRu ? 'Непотраченное золото (>1700g)' : 'High unspent gold (>1700g)',
      detail: isRu
        ? `Задержка бэка на ${unspentMin.minute}-й минуте: преимущество в кармане не превратилось в боевые статы перед файтом.`
        : `Delayed recall at min ${unspentMin.minute}: sitting on gold prevented item powerspike before fights.`,
    });
  }

  const lateDeath = engine.minutes.slice(20).find((m) => m.events.some((e) => e.type === 'DEATH'));
  if (lateDeath) {
    mistakes.push({
      minute: lateDeath.minute,
      title: isRu ? 'Потеря темпа в лейте' : 'Late-game positioning catch',
      detail: isRu
        ? `Смерть на ${lateDeath.minute}-й минуте дала противникам возможность забрать ключевой нейтральный объект.`
        : `Elimination at min ${lateDeath.minute} conceded free cross-map or objective pressure.`,
    });
  }

  if (mistakes.length === 0) {
    mistakes.push({
      minute: Math.min(15, durationMinutes),
      title: isRu ? 'Контроль карты' : 'Map control',
      detail: isRu
        ? 'Увеличь количество контрольных вардов вокруг реки перед драконами.'
        : 'Increase control ward frequency around river corridors before neutral spawns.',
    });
  }

  // 4. Next game rules
  const nextGameRules: string[] = isRu
    ? [
        `Покупай Control Ward при каждом возвращении на базу с остатком 75+ золота.`,
        `Синхронизируй бэк за 45–60 секунд до появления Дракона или Барона, чтобы не драться с непотраченным золотом.`,
      ]
    : [
        `Buy a Control Ward on resets whenever you have 75+ floating gold.`,
        `Time your recalls 45–60s prior to major Dragon/Baron spawns to fight on item spikes.`,
      ];

  // 5. Verdict
  const verdict = isRu
    ? `Матч завершился ${engine.result === 'WIN' ? 'победой' : 'поражением'}. Итоговая статистика: ${target.kills}/${target.deaths}/${target.assists} (KDA ${target.kda}), ${target.cs} CS (${target.csPerMin}/мин). ${target.csPerMin >= 7 ? 'Отличный темп фарма на линии.' : 'Главная точка роста — стабильность фарма в мидгейме.'} ${target.visionScore < durationMinutes ? 'Требуется уделить больше внимания расстановке вижна в реке перед объектами.' : 'Хорошая активность по расстановке вардов.'}`
    : `Game ended in ${engine.result}. Final line: ${target.kills}/${target.deaths}/${target.assists} (KDA ${target.kda}), ${target.cs} CS (${target.csPerMin}/m). ${target.csPerMin >= 7 ? 'Strong CSing mechanics during laning.' : 'Primary opportunity is wave discipline in mid-game.'} ${target.visionScore < durationMinutes ? 'Invest in deeper vision coverage before objective setups.' : 'Solid active vision coverage.'}`;

  // 6. Draft & Build evaluations
  const draftScore = Math.max(6, Math.min(9, Math.round(score / 10)));
  const buildScore = Math.max(7, Math.min(9, Math.round((baseScore + 5) / 10)));

  const draftEvaluation = {
    score: draftScore,
    verdict: (draftScore >= 8 ? 'good' : 'fair') as 'great' | 'good' | 'risky' | 'poor',
    laneMatchup: laneOpponent
      ? isRu
        ? `Матчап против ${laneOpponent.championName}: позиция ${target.position}. Требует аккуратного контроля дистанции и трейдов по кулдаунам.`
        : `Matchup vs ${laneOpponent.championName} on ${target.position}. Demands strict spacing and trading around cooldown windows.`
      : isRu
        ? 'Стандартный драфт с фокусом на сплитпуш и темп.'
        : 'Standard draft dynamic focused on tempo.',
    teamSynergy: isRu
      ? 'Хорошая синергия в командных файтах при наличии фронтлайна.'
      : 'Solid teamfight synergy with frontline setup.',
    enemyThreats: isRu
      ? 'Опасность фланговых заходов и контроля в узких проходах джунглей.'
      : 'Vulnerable to flank engages in tight jungle corridors.',
    winCondition: isRu
      ? 'Реализация преимущества по золоту через контроль боковых линий и объектов.'
      : 'Snowball gold lead through side-lane waves and neutral timers.',
  };

  const buildEvaluation = {
    score: buildScore,
    runesVerdict: isRu
      ? `Ключевая руна ${target.keystoneName} соответствует стилю чемпиона.`
      : `Keystone ${target.keystoneName} fits the champion's trading profile.`,
    spellsVerdict: isRu
      ? `Заклинания (${target.summonerSpellNames.join(' + ')}) дают необходимую выживаемость и дуэльный потенциал.`
      : `Summoner spells (${target.summonerSpellNames.join(' + ')}) provide necessary safety and kill pressure.`,
    bootsAndTrinketVerdict: isRu
      ? `Выбран аксессуар: ${target.trinketName}. Не забывай переключаться на Farsight Alteration после 9 уровня.`
      : `Trinket: ${target.trinketName}. Swap to Farsight Alteration after level 9.`,
    itemOrderVerdict: isRu
      ? `Сборка (${target.finalItemNames.slice(0, 3).join(' → ') || 'Стартовые предметы'}) обеспечивает своевременные спайки урона.`
      : `Build path (${target.finalItemNames.slice(0, 3).join(' → ') || 'Core starters'}) ensures timely damage spikes.`,
    goodChoices: target.finalItemNames.slice(0, 4),
    recommendations: [],
  };

  // 7. Minutes
  const minutes: MinuteReview[] = engine.minutes.map((m) => {
    let rating: MinuteReview['rating'] = 'ok';
    let betterPlay: string | null = null;
    let headline = isRu ? `Минута ${m.minute}` : `Minute ${m.minute}`;
    let analysis = isRu
      ? `Фарм волны (CS: ${m.targetStats.cs}, золото: ${m.targetStats.totalGold}g).`
      : `Wave management (CS: ${m.targetStats.cs}, gold: ${m.targetStats.totalGold}g).`;

    if (m.events.some((e) => e.type === 'KILL')) {
      rating = 'great';
      headline = isRu ? 'Убийство соперника' : 'Kill secured';
      analysis = isRu
        ? 'Успешная дуэль/ганка с получением локального преимущества по золоту.'
        : 'Successful skirmish conversion yielding immediate map momentum.';
    } else if (m.events.some((e) => e.type === 'DEATH')) {
      rating = 'mistake';
      headline = isRu ? 'Смерть на карте' : 'Death conceded';
      betterPlay = isRu
        ? 'Следи за миникартой и не выходи на открытое пространство без вардов.'
        : 'Respect missing enemy pings and avoid facechecking unwarded areas.';
      analysis = isRu
        ? 'Потеря темпа и отдача золота соперникам.'
        : 'Conceded shutdown or lane momentum to opponent.';
    } else if (m.flags.includes('HIGH_UNSPENT_GOLD')) {
      rating = 'missed';
      headline = isRu ? 'Задержка бэка (>1700g)' : 'Floating gold (>1700g)';
      betterPlay = isRu
        ? 'Запушь пачку и сразу нажимай Recall для покупки компонентов.'
        : 'Crash the wave and immediately reset for items.';
      analysis = isRu
        ? `На руках ${m.targetStats.currentGold}g непотраченного золота.`
        : `Holding ${m.targetStats.currentGold}g unspent gold in pocket.`;
    }

    return {
      minute: m.minute,
      rating,
      isKeyMoment: m.isKeyMoment || rating !== 'ok',
      headline,
      analysis,
      betterPlay,
    };
  });

  return {
    summary: {
      grade,
      score,
      verdict,
      strengths: strengths.slice(0, 4),
      mistakes: mistakes.slice(0, 4),
      nextGameRules: nextGameRules.slice(0, 3),
    },
    draftEvaluation,
    buildEvaluation,
    minutes,
  };
}
