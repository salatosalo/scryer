import { getChampionRuName } from '@/lib/riot/champion-names-ru';
import type { EngineReport } from './types';

function sign(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Compresses the full EngineReport + PatchGlossary into a token-efficient prompt payload.
 * Supports:
 * - 'compact' (default, ~2.5k tokens): focuses on key combat/tempo moments and player build items
 * - 'deep' (~8k tokens): outputs full 1..N minute details and entire patch glossary
 */
export function packEngineReportForPrompt(
  report: EngineReport,
  mode: 'compact' | 'deep' = 'compact'
): string {
  const { target, laneOpponent, objectives, teams, glossary } = report;
  const allyObj = target.team === 'BLUE' ? objectives.blue : objectives.red;
  const enemyObj = target.team === 'BLUE' ? objectives.red : objectives.blue;

  const lines: string[] = [];

  lines.push(`MATCH OVERVIEW (Patch ${report.patch}, DDragon ${report.ddragonVersion})`);
  lines.push(
    `Result: ${report.result} | Duration: ${report.durationMinutes}m (${report.durationSec}s) | QueueId: ${report.queueId}`
  );
  lines.push(
    `Target Player: ${target.riotId} | Champion: ${target.championName} [RU: ${getChampionRuName(target.championName)}] (${target.position}, ${target.team})`
  );
  lines.push(
    `Target Line: ${target.kills}/${target.deaths}/${target.assists} (KDA ${target.kda}, KP ${target.killParticipation}%) | CS: ${target.cs} (${target.csPerMin}/m) | Gold: ${target.goldEarned} | Dmg: ${target.damageToChampions} | TurretDmg: ${target.damageToTurrets} | Vision: ${target.visionScore} (Wards ${target.wardsPlaced}/${target.wardsKilled}, Control: ${target.controlWardsBought})`
  );
  lines.push(
    `Target Setup: Keystone=${target.keystoneName} (${target.primaryTreeName} / ${target.secondaryTreeName}) | All Runes: ${target.runeNames.join(', ')} | Spells: ${target.summonerSpellNames.join(', ')}`
  );
  lines.push(
    `Target Final Build: ${target.finalItemNames.join(', ') || 'None'} | Trinket: ${target.trinketName}`
  );

  if (laneOpponent) {
    lines.push(
      `Direct Lane Opponent: ${laneOpponent.championName} [RU: ${getChampionRuName(laneOpponent.championName)}] (${laneOpponent.position}) | ${laneOpponent.kills}/${laneOpponent.deaths}/${laneOpponent.assists} | CS: ${laneOpponent.cs} (${laneOpponent.csPerMin}/m) | Gold: ${laneOpponent.goldEarned} | Dmg: ${laneOpponent.damageToChampions} | Build: ${laneOpponent.finalItemNames.join(', ')}`
    );
  }

  lines.push(
    `Team Objectives (Us vs Them): Kills ${allyObj.kills}-${enemyObj.kills}, Towers ${allyObj.towers}-${enemyObj.towers}, Dragons ${allyObj.dragons}-${enemyObj.dragons}, Barons ${allyObj.barons}-${enemyObj.barons}, Heralds ${allyObj.riftHeralds}-${enemyObj.riftHeralds}, Grubs ${allyObj.voidGrubs}-${enemyObj.voidGrubs}, Inhibs ${allyObj.inhibitors}-${enemyObj.inhibitors}`
  );

  lines.push('\nTEAMS ROSTER:');
  for (const side of ['BLUE', 'RED'] as const) {
    const list = side === 'BLUE' ? teams.blue : teams.red;
    lines.push(`${side} TEAM${side === target.team ? ' (TARGET TEAM)' : ' (ENEMY TEAM)'}:`);
    for (const p of list) {
      lines.push(
        `  - ${p.position} ${p.championName}: ${p.kills}/${p.deaths}/${p.assists}, CS ${p.cs} (${p.csPerMin}/m), Gold ${p.goldEarned}, Dmg ${p.damageToChampions}, Vis ${p.visionScore}, Items=[${p.finalItemNames.join(', ')}]`
      );
    }
  }

  lines.push('\nCHRONOLOGICAL COMPLETED/NOTABLE PURCHASES (Target):');
  const keyPurchases = report.purchaseTimeline.filter((p) => p.isCompleted || p.totalGold >= 900);
  if (keyPurchases.length === 0) {
    lines.push('  (No major purchases recorded)');
  } else {
    for (const p of keyPurchases) {
      lines.push(`  - ${p.minute}m: ${p.itemName} (${p.totalGold}g)`);
    }
  }

  lines.push('\nPATCH GLOSSARY (AUTHORITATIVE CURRENT-PATCH MECHANICS):');
  lines.push(
    'Champions: ' +
      glossary.champions
        .map(
          (c) =>
            `${c.name} [RU: ${getChampionRuName(c.name)}] (${c.team}/${c.position}:${c.tags.join('/')})`
        )
        .join(', ')
  );

  const itemsToInclude =
    mode === 'compact'
      ? glossary.items.filter(
          (it) =>
            target.finalItemNames.includes(it.name) ||
            (laneOpponent && laneOpponent.finalItemNames.includes(it.name))
        )
      : glossary.items.slice(0, 24);

  lines.push('Built Items in Match:');
  for (const it of itemsToInclude) {
    lines.push(`  - ${it.name} (${it.gold}g): ${it.summary}`);
  }

  if (mode === 'deep') {
    lines.push('Target Runes & Spells:');
    for (const r of glossary.runes) {
      lines.push(`  - Rune ${r.name} (${r.tree}): ${r.summary}`);
    }
    for (const s of glossary.spells) {
      lines.push(`  - Spell ${s.name}: ${s.summary}`);
    }
  }

  const counterItems = mode === 'compact' ? glossary.counterItems.slice(0, 5) : glossary.counterItems;
  lines.push('Available Counter Items & Trinkets:');
  for (const ci of counterItems) {
    lines.push(`  - [${ci.category}] ${ci.name} (${ci.gold}g): ${ci.summary}`);
  }

  if (mode === 'compact') {
    // Only pack key moments + quiet minutes summary
    const keyMinutes = report.minutes.filter(
      (m) =>
        m.isKeyMoment ||
        m.flags.length > 0 ||
        m.events.length > 0 ||
        m.purchases.some((p) => p.totalGold >= 900)
    );
    const quietMinuteNums = report.minutes
      .filter((m) => !keyMinutes.some((km) => km.minute === m.minute))
      .map((m) => m.minute);

    if (quietMinuteNums.length > 0) {
      lines.push(
        `\nQUIET FARMING MINUTES (Standard CS/Laning, no deaths or critical flags): Min ${quietMinuteNums.join(', ')}`
      );
    }

    lines.push('\nKEY MOMENT TIMELINE (Focus in-depth review on these minutes):');
    for (const m of keyMinutes) {
      const purchasesStr =
        m.purchases.filter((p) => p.totalGold >= 450).map((p) => p.itemName).join(', ') || '';
      const eventsStr = m.events
        .map((e) => {
          const extras: string[] = [];
          if (e.type === 'DEATH') {
            extras.push(e.hadVision ? 'hadVision=yes' : 'hadVision=NO');
            extras.push(`nearby=${e.nearbyAllies ?? 0}v${(e.nearbyEnemies ?? 0) + 1}`);
            if (e.topDamageSources?.length) extras.push(`dmgFrom=[${e.topDamageSources.join(', ')}]`);
          }
          return `${e.type}@${e.timestampSec}s: ${e.label}${extras.length ? ` (${extras.join('; ')})` : ''}`;
        })
        .join(' | ');
      const flagsStr = m.flags.length ? ` FLAGS=[${m.flags.join(',')}]` : '';
      const wardStr = m.wardsPlaced > 0 || m.wardsKilled > 0 ? ` wards=+${m.wardsPlaced}/-${m.wardsKilled}` : '';
      const buyStr = purchasesStr ? ` bought=[${purchasesStr}]` : '';
      const evPart = eventsStr ? ` events={${eventsStr}}` : '';

      lines.push(
        `Min ${m.minute}: Lv${m.targetStats.level} CS=${m.targetStats.cs}(diff ${sign(m.csDiff)}) Gold=${m.targetStats.totalGold}(unspent ${m.targetStats.currentGold}, diff ${sign(m.goldDiff)})${wardStr}${buyStr}${flagsStr}${evPart}`
      );
    }
  } else {
    // Deep mode: output every minute 1..N
    lines.push('\nMINUTE-BY-MINUTE TIMELINE (1..N):');
    for (const m of report.minutes) {
      const purchasesStr =
        m.purchases.filter((p) => p.totalGold >= 450).map((p) => p.itemName).join(', ') || '';
      const eventsStr = m.events
        .map((e) => {
          const extras: string[] = [];
          if (e.type === 'DEATH') {
            extras.push(e.hadVision ? 'hadVision=yes' : 'hadVision=NO');
            extras.push(`nearby=${e.nearbyAllies ?? 0}v${(e.nearbyEnemies ?? 0) + 1}`);
            if (e.topDamageSources?.length) extras.push(`dmgFrom=[${e.topDamageSources.join(', ')}]`);
          }
          return `${e.type}@${e.timestampSec}s: ${e.label}${extras.length ? ` (${extras.join('; ')})` : ''}`;
        })
        .join(' | ');
      const flagsStr = m.flags.length ? ` FLAGS=[${m.flags.join(',')}]` : '';
      const wardStr = m.wardsPlaced > 0 || m.wardsKilled > 0 ? ` wards=+${m.wardsPlaced}/-${m.wardsKilled}` : '';
      const buyStr = purchasesStr ? ` bought=[${purchasesStr}]` : '';
      const evPart = eventsStr ? ` events={${eventsStr}}` : '';

      lines.push(
        `Min ${m.minute}: Lv${m.targetStats.level} CS=${m.targetStats.cs}(+${m.csDeltaThisMin},diff ${sign(m.csDiff)}) Gold=${m.targetStats.totalGold}(unspent ${m.targetStats.currentGold},diff ${sign(m.goldDiff)}) XPdiff=${sign(m.xpDiff)}${wardStr}${buyStr}${flagsStr}${evPart}`
      );
    }
  }

  return lines.join('\n');
}
