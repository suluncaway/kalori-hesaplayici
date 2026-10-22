export interface User {
  id: string;
  email: string;
  passwordHash: string;
}

export interface Food {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

export interface DiaryEntry {
  id: string;
  userId: string;
  date: string;
  meal: string;
  foodId: string;
  name: string;
  grams: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbohydratesPer100g: number;
  fatPer100g: number;
  clientEntryId: string | null;
}

export interface CreateDiaryEntry {
  userId: string;
  date: string;
  meal: string;
  foodId: string;
  grams: number;
  clientEntryId?: string;
}

export interface WeightEntry {
  date: string;
  value: number;
}

export interface WorkoutEntry {
  id: string;
  userId: string;
  date: string;
  name: string;
  sets: number;
  reps: number;
  weight: number;
}

export interface Repository {
  findUserByEmail(email: string): Promise<User | null>;
  findUserById(id: string): Promise<User | null>;
  createUser(email: string, passwordHash: string): Promise<User>;
  createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findUserBySession(tokenHash: string, now: Date): Promise<User | null>;
  deleteSession(tokenHash: string): Promise<void>;
  searchFoods(query: string, limit: number): Promise<Food[]>;
  findFoodById(id: string): Promise<Food | null>;
  listDiaryEntries(userId: string, date: string): Promise<DiaryEntry[]>;
  listDiaryEntriesRange(userId: string, from: string, to: string): Promise<DiaryEntry[]>;
  createDiaryEntry(input: CreateDiaryEntry, food: Food): Promise<DiaryEntry>;
  deleteDiaryEntry(userId: string, entryId: string): Promise<boolean>;
  listWeights(userId: string, from: string, to: string): Promise<WeightEntry[]>;
  upsertWeight(userId: string, entry: WeightEntry): Promise<WeightEntry>;
  listWorkouts(userId: string, from: string, to: string): Promise<WorkoutEntry[]>;
  createWorkout(input: Omit<WorkoutEntry, 'id'>): Promise<WorkoutEntry>;
  close(): Promise<void>;
}
