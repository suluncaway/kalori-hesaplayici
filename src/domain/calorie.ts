export type Sex = 'erkek' | 'kadin';
export type Goal = 'vermek' | 'korumak' | 'almak';

export interface CalorieInput {
  age: number;
  heightCm: number;
  weightKg: number;
  sex: Sex;
  activityMultiplier: number;
  goal: Goal;
}

export interface CalorieResult {
  bmr: number;
  maintenanceCalories: number;
  targetCalories: number;
  weeklyWeightChangeKg: number;
}

export const CALORIE_LIMITS = {
  age: { min: 18, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
} as const;

export function calculateCalories(input: CalorieInput): CalorieResult {
  const sexOffset = input.sex === 'erkek' ? 5 : -161;
  const bmr =
    10 * input.weightKg +
    6.25 * input.heightCm -
    5 * input.age +
    sexOffset;
  const maintenanceCalories = bmr * input.activityMultiplier;

  let targetCalories = maintenanceCalories;
  if (input.goal === 'vermek') {
    targetCalories = Math.max(1000, maintenanceCalories - 500);
  } else if (input.goal === 'almak') {
    targetCalories = maintenanceCalories + 500;
  }

  return {
    bmr,
    maintenanceCalories,
    targetCalories,
    weeklyWeightChangeKg:
      ((targetCalories - maintenanceCalories) * 7) / 7700,
  };
}

export function isCalorieInputInRange(input: CalorieInput): boolean {
  return (
    Number.isFinite(input.age) &&
    input.age >= CALORIE_LIMITS.age.min &&
    input.age <= CALORIE_LIMITS.age.max &&
    Number.isFinite(input.heightCm) &&
    input.heightCm >= CALORIE_LIMITS.heightCm.min &&
    input.heightCm <= CALORIE_LIMITS.heightCm.max &&
    Number.isFinite(input.weightKg) &&
    input.weightKg >= CALORIE_LIMITS.weightKg.min &&
    input.weightKg <= CALORIE_LIMITS.weightKg.max &&
    Number.isFinite(input.activityMultiplier) &&
    input.activityMultiplier > 0
  );
}
