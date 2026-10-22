import { describe, expect, it } from 'vitest';
import { calculateCalories, isCalorieInputInRange } from './calorie';

describe('calculateCalories', () => {
  it('Mifflin-St Jeor formülünü erkek kullanıcı için uygular', () => {
    const result = calculateCalories({
      age: 30,
      heightCm: 180,
      weightKg: 80,
      sex: 'erkek',
      activityMultiplier: 1.55,
      goal: 'korumak',
    });

    expect(result.bmr).toBe(1780);
    expect(result.maintenanceCalories).toBe(2759);
    expect(result.targetCalories).toBe(2759);
  });

  it('kilo verme hedefinde 500 kcal açık uygular', () => {
    const result = calculateCalories({
      age: 35,
      heightCm: 165,
      weightKg: 70,
      sex: 'kadin',
      activityMultiplier: 1.375,
      goal: 'vermek',
    });

    expect(result.targetCalories).toBe(result.maintenanceCalories - 500);
    expect(result.weeklyWeightChangeKg).toBeCloseTo(-0.4545, 4);
  });

  it('kilo verme hedefini 1000 kcal altında oluşturmaz', () => {
    const result = calculateCalories({
      age: 100,
      heightCm: 120,
      weightKg: 30,
      sex: 'kadin',
      activityMultiplier: 1.2,
      goal: 'vermek',
    });

    expect(result.targetCalories).toBe(1000);
  });
});

describe('isCalorieInputInRange', () => {
  it('sınır değerlerini kabul eder', () => {
    expect(
      isCalorieInputInRange({
        age: 18,
        heightCm: 120,
        weightKg: 30,
        sex: 'kadin',
        activityMultiplier: 1.2,
        goal: 'korumak',
      }),
    ).toBe(true);
  });

  it('aralık dışındaki değerleri reddeder', () => {
    expect(
      isCalorieInputInRange({
        age: 17,
        heightCm: 180,
        weightKg: 80,
        sex: 'erkek',
        activityMultiplier: 1.55,
        goal: 'korumak',
      }),
    ).toBe(false);
  });
});
