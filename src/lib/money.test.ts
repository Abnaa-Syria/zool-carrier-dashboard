import { describe, expect, it } from 'vitest';
import { formatBasisPoints, formatPercent, formatSdg, minorToSdg, sdgToMinor } from './money';

describe('money (minor units, 100 = 1 SDG)', () => {
  it('converts between SDG and minor units without float drift', () => {
    expect(minorToSdg(3_500_000)).toBe(35_000);
    expect(sdgToMinor(35_000)).toBe(3_500_000);
    expect(sdgToMinor(12.345)).toBe(1235);
    expect(sdgToMinor(0.1 + 0.2)).toBe(30);
  });

  it('formats SDG with piasters only when present', () => {
    expect(formatSdg(3_500_000)).toBe('35,000 ج.س');
    expect(formatSdg(150)).toBe('1.50 ج.س');
    expect(formatSdg(-7_000_000)).toBe('-70,000 ج.س');
    expect(formatSdg(null)).toBe('—');
    expect(formatSdg(undefined)).toBe('—');
  });

  it('formats percents and basis points', () => {
    expect(formatPercent(10)).toBe('10%');
    expect(formatPercent(2.5)).toBe('2.5%');
    expect(formatPercent(33.3333)).toBe('33.33%');
    expect(formatPercent(Number.NaN)).toBe('—');
    expect(formatBasisPoints(500)).toBe('5%');
    expect(formatBasisPoints(1250)).toBe('12.5%');
  });
});
