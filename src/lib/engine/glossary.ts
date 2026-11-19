import type { DDragonSnapshot } from '@/lib/riot/types';
import type { ParticipantSummary, PatchGlossary, PurchaseEntry } from './types';

function truncate(text: string, maxLen = 190): string {
  if (!text) return '';
  return text.length <= maxLen ? text : `${text.slice(0, maxLen - 1).trim()}…`;
}

function classifyCounterItem(name: string, desc: string, tags: string[]): string | null {
  const lower = `${name} ${desc}`.toLowerCase();
  if (lower.includes('grievous wounds')) return 'Anti-Heal';
  if (lower.includes('tenacity') && tags.includes('Boots')) return 'Tenacity Boots';
  if (tags.includes('Boots') && (lower.includes('auto attack') || lower.includes('basic attack') || lower.includes('armor'))) {
    return 'Armor Boots';
  }
  if (lower.includes('lifeline') && lower.includes('magic')) return 'Anti-AP Shield';
  if (lower.includes('stasis')) return 'Stasis / Anti-Burst';
  if (lower.includes('quicksilver') || lower.includes('removes all crowd control')) return 'Cleanse / QSS';
  if (tags.includes('ArmorPenetration') || lower.includes('armor penetration')) return 'Armor Pen';
  if (tags.includes('MagicPenetration') || lower.includes('magic penetration')) return 'Magic Pen';
  if (name === 'Farsight Alteration' || name === 'Oracle Lens') return 'Trinket';
  return null;
}

export function buildPatchGlossary(input: {
  patch: string;
  ddragon: DDragonSnapshot;
  participants: ParticipantSummary[];
  target: ParticipantSummary;
  purchases: PurchaseEntry[];
}): PatchGlossary {
  const { patch, ddragon, participants, target, purchases } = input;

  const champions = participants.map((p) => {
    const info =
      ddragon.championsById[p.championName.toLowerCase()] ??
      ddragon.championsByKey[String(p.championId)];
    return {
      name: info?.name ?? p.championName,
      team: p.team,
      position: p.position || 'FLEX',
      tags: info?.tags ?? [],
    };
  });

  // Collect all items built by target + final items of all players (prioritizing completed items)
  const itemIds = new Set<number>();
  for (const id of target.finalItemIds) if (id > 0) itemIds.add(id);
  if (target.trinketId > 0) itemIds.add(target.trinketId);
  for (const p of purchases) {
    if (p.isCompleted && p.itemId > 0) itemIds.add(p.itemId);
  }
  for (const player of participants) {
    for (const id of player.finalItemIds) {
      const meta = ddragon.itemsById[id];
      if (meta && meta.totalGold >= 2000) itemIds.add(id);
    }
  }

  const items: PatchGlossary['items'] = [];
  for (const id of itemIds) {
    const meta = ddragon.itemsById[id];
    if (!meta) continue;
    items.push({
      id,
      name: meta.name,
      gold: meta.totalGold,
      summary: truncate(meta.description || meta.plaintext, 210),
    });
  }

  const runes: PatchGlossary['runes'] = [];
  for (const rId of target.runeIds) {
    const r = ddragon.runesById[rId];
    if (!r) continue;
    runes.push({
      id: r.id,
      name: r.name,
      tree: r.treeName,
      summary: truncate(r.shortDesc, 160),
    });
  }

  const spells: PatchGlossary['spells'] = [];
  for (const sId of target.summonerSpellIds) {
    const s = ddragon.summonersById[sId];
    if (!s) continue;
    spells.push({
      id: s.id,
      name: s.name,
      summary: truncate(s.description, 140),
    });
  }

  // Pick a balanced, patch-exact set of counter-items (up to 16) from the same patch's item.json
  const counterItems: PatchGlossary['counterItems'] = [];
  const categoryCount = new Map<string, number>();
  const allItems = Object.values(ddragon.itemsById).sort((a, b) => b.totalGold - a.totalGold);

  for (const item of allItems) {
    const isTrinket = item.name === 'Farsight Alteration' || item.name === 'Oracle Lens';
    const isBoots = item.tags.includes('Boots') && item.totalGold >= 900 && item.totalGold <= 1500;
    const isCompleted = !item.into?.length && item.totalGold >= 2300;
    if (!isTrinket && !isBoots && !isCompleted) continue;

    const category = classifyCounterItem(item.name, item.description, item.tags);
    if (!category) continue;

    const count = categoryCount.get(category) ?? 0;
    const maxPerCategory = category === 'Anti-Heal' ? 3 : 2;
    if (count >= maxPerCategory) continue;

    // Avoid duplicating exact item names
    if (counterItems.some((c) => c.name === item.name)) continue;

    counterItems.push({
      id: item.id,
      name: item.name,
      gold: item.totalGold,
      category,
      summary: truncate(item.description || item.plaintext, 140),
    });
    categoryCount.set(category, count + 1);
    if (counterItems.length >= 16) break;
  }

  return {
    patch,
    ddragonVersion: ddragon.version,
    champions,
    items,
    runes,
    spells,
    counterItems,
  };
}
