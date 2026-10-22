import { describe, expect, it } from 'vitest';
import { createFoodId } from './food-id';

describe('createFoodId', () => {
  it('Türkçe besin adından kararlı bir kimlik üretir', () => {
    expect(createFoodId('Tavuk göğsü (pişmiş)')).toBe('tavuk-gogsu-pismis');
    expect(createFoodId('Süt (yarım yağlı)')).toBe('sut-yarim-yagli');
  });

  it('boşluk ve noktalama değişikliklerini normalize eder', () => {
    expect(createFoodId('  Ton balığı / suda  ')).toBe('ton-baligi-suda');
  });
});
