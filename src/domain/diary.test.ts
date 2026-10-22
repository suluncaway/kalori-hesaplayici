import { describe, expect, it } from 'vitest';
import {
  calculateDiaryTotals,
  calculateEntryNutrients,
  roundNutrient,
} from './diary';

describe('diary calculations', () => {
  it('100 gram değerini tüketilen gramaja ölçekler', () => {
    expect(calculateEntryNutrients([200, 10, 20, 5], 150)).toEqual([
      300, 15, 30, 7.5,
    ]);
  });

  it('birden fazla günlük kaydı toplar', () => {
    const totals = calculateDiaryTotals([
      {
        id: '1',
        foodId: 'yumurta',
        name: 'Yumurta',
        grams: 100,
        meal: 'Kahvaltı',
        nutrientsPer100g: [155, 13, 1.1, 11],
      },
      {
        id: '2',
        foodId: 'yogurt',
        name: 'Yoğurt',
        grams: 200,
        meal: 'Ara öğün',
        nutrientsPer100g: [61, 3.5, 4.7, 3.3],
      },
    ]);

    expect(totals).toEqual({
      calories: 277,
      protein: 20,
      carbohydrates: 10.5,
      fat: 17.6,
    });
  });

  it('ekran ve CSV için bir ondalığa yuvarlar', () => {
    expect(roundNutrient(12.345)).toBe(12.3);
  });
});
