export type Nutrients = readonly [
  calories: number,
  protein: number,
  carbohydrates: number,
  fat: number,
];

export interface DiaryEntry {
  id: string;
  foodId: string;
  name: string;
  grams: number;
  meal: string;
  nutrientsPer100g: Nutrients;
}

export interface DiaryTotals {
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export function calculateEntryNutrients(
  nutrientsPer100g: Nutrients,
  grams: number,
): Nutrients {
  const factor = grams / 100;
  return nutrientsPer100g.map((value) => value * factor) as unknown as Nutrients;
}

export function calculateDiaryTotals(entries: readonly DiaryEntry[]): DiaryTotals {
  const values = entries.reduce<Nutrients>(
    (totals, entry) => {
      const nutrients = calculateEntryNutrients(entry.nutrientsPer100g, entry.grams);
      return totals.map((value, index) => value + (nutrients[index] ?? 0)) as unknown as Nutrients;
    },
    [0, 0, 0, 0],
  );

  return {
    calories: values[0],
    protein: values[1],
    carbohydrates: values[2],
    fat: values[3],
  };
}

export function roundNutrient(value: number): number {
  return Math.round(value * 10) / 10;
}
