import { randomUUID } from 'node:crypto';
import type {
  CreateDiaryEntry,
  DiaryEntry,
  Food,
  Repository,
  User,
  WeightEntry,
  WorkoutEntry,
} from './types';

const seedFoods: Food[] = [
  { id: 'yumurta', name: 'Yumurta', calories: 143, protein: 12.6, carbohydrates: 0.7, fat: 9.5 },
  { id: 'tavuk-gogsu-pismis', name: 'Tavuk göğsü (pişmiş)', calories: 165, protein: 31, carbohydrates: 0, fat: 3.6 },
  { id: 'yogurt-sade', name: 'Yoğurt (sade)', calories: 61, protein: 3.5, carbohydrates: 4.7, fat: 3.3 },
];

export class MemoryRepository implements Repository {
  private readonly users: User[] = [];
  private readonly sessions = new Map<string, { userId: string; expiresAt: Date }>();
  private readonly entries: DiaryEntry[] = [];
  private readonly weights = new Map<string, WeightEntry>();
  private readonly workouts: WorkoutEntry[] = [];
  private readonly foods: Food[];

  constructor(foods: Food[] = seedFoods) {
    this.foods = foods;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findUserById(id: string): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const user = { id: randomUUID(), email, passwordHash };
    this.users.push(user);
    return user;
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    this.sessions.set(tokenHash, { userId, expiresAt });
  }

  async findUserBySession(tokenHash: string, now: Date): Promise<User | null> {
    const session = this.sessions.get(tokenHash);
    if (!session || session.expiresAt <= now) return null;
    return this.findUserById(session.userId);
  }

  async deleteSession(tokenHash: string): Promise<void> {
    this.sessions.delete(tokenHash);
  }

  async searchFoods(query: string, limit: number): Promise<Food[]> {
    const normalized = query.toLocaleLowerCase('tr');
    return this.foods
      .filter((food) => food.name.toLocaleLowerCase('tr').includes(normalized))
      .slice(0, limit);
  }

  async findFoodById(id: string): Promise<Food | null> {
    return this.foods.find((food) => food.id === id) ?? null;
  }

  async listDiaryEntries(userId: string, date: string): Promise<DiaryEntry[]> {
    return this.entries.filter((entry) => entry.userId === userId && entry.date === date);
  }

  async listDiaryEntriesRange(userId: string, from: string, to: string): Promise<DiaryEntry[]> {
    return this.entries.filter(
      (entry) => entry.userId === userId && entry.date >= from && entry.date <= to,
    );
  }

  async createDiaryEntry(input: CreateDiaryEntry, food: Food): Promise<DiaryEntry> {
    if (input.clientEntryId) {
      const existing = this.entries.find(
        (entry) =>
          entry.userId === input.userId && entry.clientEntryId === input.clientEntryId,
      );
      if (existing) return existing;
    }
    const entry: DiaryEntry = {
      id: randomUUID(),
      ...input,
      name: food.name,
      caloriesPer100g: food.calories,
      proteinPer100g: food.protein,
      carbohydratesPer100g: food.carbohydrates,
      fatPer100g: food.fat,
      clientEntryId: input.clientEntryId ?? null,
    };
    this.entries.push(entry);
    return entry;
  }

  async deleteDiaryEntry(userId: string, entryId: string): Promise<boolean> {
    const index = this.entries.findIndex(
      (entry) => entry.id === entryId && entry.userId === userId,
    );
    if (index === -1) return false;
    this.entries.splice(index, 1);
    return true;
  }

  async listWeights(userId: string, from: string, to: string): Promise<WeightEntry[]> {
    return [...this.weights.entries()]
      .filter(([key, entry]) => key.startsWith(`${userId}:`) && entry.date >= from && entry.date <= to)
      .map(([, entry]) => entry)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async upsertWeight(userId: string, entry: WeightEntry): Promise<WeightEntry> {
    this.weights.set(`${userId}:${entry.date}`, entry);
    return entry;
  }

  async listWorkouts(userId: string, from: string, to: string): Promise<WorkoutEntry[]> {
    return this.workouts.filter(
      (entry) => entry.userId === userId && entry.date >= from && entry.date <= to,
    );
  }

  async createWorkout(input: Omit<WorkoutEntry, 'id'>): Promise<WorkoutEntry> {
    const entry = { id: randomUUID(), ...input };
    this.workouts.push(entry);
    return entry;
  }

  async close(): Promise<void> {}
}
