import { describe, expect, it } from 'vitest';
import { matchPatchToDDragonVersion, stripDDragonHtml } from './ddragon';

describe('Data Dragon patch resolver & HTML cleaner', () => {
  it('matches gameVersion prefix to exact Data Dragon version', () => {
    const versions = ['16.23.1', '16.22.1', '16.21.1'];
    expect(matchPatchToDDragonVersion('16.22.634.1234', versions)).toBe('16.22.1');
    expect(matchPatchToDDragonVersion('16.23.1', versions)).toBe('16.23.1');
  });

  it('falls back to latest version when patch is newer than Data Dragon', () => {
    const versions = ['16.23.1', '16.22.1'];
    expect(matchPatchToDDragonVersion('17.1.100.200', versions)).toBe('16.23.1');
  });

  it('strips Riot HTML markup cleanly into readable plain text', () => {
    const raw =
      '<mainText><stats><attention>65</attention> Attack Damage<br><attention>5%</attention> Omnivamp</stats><br><passive>Famine</passive>: Gain haste.</mainText>';
    expect(stripDDragonHtml(raw)).toBe('65 Attack Damage; 5% Omnivamp; Famine : Gain haste.');
  });
});
