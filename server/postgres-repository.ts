import { randomUUID } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import type {
  CreateDiaryEntry,
  DiaryEntry,
  Food,
  Repository,
  User,
  WeightEntry,
  WorkoutEntry,
} from './types';

export class PostgresRepository implements Repository {
  private readonly sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = postgres(databaseUrl, { max: 10, idle_timeout: 20 });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    const [row] = await this.sql<{ id: string; email: string; password_hash: string }[]>`
      select id, email, password_hash from users where email = ${email}
    `;
    return row ? { id: row.id, email: row.email, passwordHash: row.password_hash } : null;
  }

  async findUserById(id: string): Promise<User | null> {
    const [row] = await this.sql<{ id: string; email: string; password_hash: string }[]>`
      select id, email, password_hash from users where id = ${id}
    `;
    return row ? { id: row.id, email: row.email, passwordHash: row.password_hash } : null;
  }

  async createUser(email: string, passwordHash: string): Promise<User> {
    const [row] = await this.sql<{ id: string; email: string; password_hash: string }[]>`
      insert into users (email, password_hash)
      values (${email}, ${passwordHash})
      returning id, email, password_hash
    `;
    if (!row) throw new Error('Kullanıcı oluşturulamadı.');
    return { id: row.id, email: row.email, passwordHash: row.password_hash };
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.sql`
      insert into sessions (user_id, token_hash, expires_at)
      values (${userId}, ${tokenHash}, ${expiresAt})
    `;
  }

  async findUserBySession(tokenHash: string, now: Date): Promise<User | null> {
    const [row] = await this.sql<{ id: string; email: string; password_hash: string }[]>`
      select u.id, u.email, u.password_hash
      from sessions s join users u on u.id = s.user_id
      where s.token_hash = ${tokenHash} and s.expires_at > ${now}
    `;
    return row ? { id: row.id, email: row.email, passwordHash: row.password_hash } : null;
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.sql`delete from sessions where token_hash = ${tokenHash}`;
  }

  async searchFoods(query: string, limit: number): Promise<Food[]> {
    const rows = await this.sql<Food[]>`
      select id, name, calories::float8, protein::float8,
             carbohydrates::float8, fat::float8
      from foods
      where name ilike ${`%${query}%`}
      order by name
      limit ${limit}
    `;
    return rows;
  }

  async findFoodById(id: string): Promise<Food | null> {
    const [row] = await this.sql<Food[]>`
      select id, name, calories::float8, protein::float8,
             carbohydrates::float8, fat::float8
      from foods where id = ${id}
    `;
    return row ?? null;
  }

  async listDiaryEntries(userId: string, date: string): Promise<DiaryEntry[]> {
    const rows = await this.sql<DiaryEntry[]>`
      select id, user_id as "userId", entry_date::text as date, meal,
             food_id as "foodId", name, grams::float8,
             calories_per_100g::float8 as "caloriesPer100g",
             protein_per_100g::float8 as "proteinPer100g",
             carbohydrates_per_100g::float8 as "carbohydratesPer100g",
             fat_per_100g::float8 as "fatPer100g", client_entry_id as "clientEntryId"
      from diary_entries
      where user_id = ${userId} and entry_date = ${date}
      order by created_at
    `;
    return rows;
  }

  async listDiaryEntriesRange(userId: string, from: string, to: string): Promise<DiaryEntry[]> {
    return this.sql<DiaryEntry[]>`
      select id, user_id as "userId", entry_date::text as date, meal,
             food_id as "foodId", name, grams::float8,
             calories_per_100g::float8 as "caloriesPer100g",
             protein_per_100g::float8 as "proteinPer100g",
             carbohydrates_per_100g::float8 as "carbohydratesPer100g",
             fat_per_100g::float8 as "fatPer100g", client_entry_id as "clientEntryId"
      from diary_entries
      where user_id = ${userId} and entry_date between ${from} and ${to}
      order by entry_date, created_at
    `;
  }

  async createDiaryEntry(input: CreateDiaryEntry, food: Food): Promise<DiaryEntry> {
    const id = randomUUID();
    const [row] = await this.sql<DiaryEntry[]>`
      insert into diary_entries (
        id, user_id, entry_date, meal, food_id, name, grams,
        calories_per_100g, protein_per_100g, carbohydrates_per_100g, fat_per_100g,
        client_entry_id
      ) values (
        ${id}, ${input.userId}, ${input.date}, ${input.meal}, ${food.id}, ${food.name},
        ${input.grams}, ${food.calories}, ${food.protein}, ${food.carbohydrates}, ${food.fat},
        ${input.clientEntryId ?? null}
      )
      on conflict (user_id, client_entry_id) where client_entry_id is not null
      do update set client_entry_id = excluded.client_entry_id
      returning id, user_id as "userId", entry_date::text as date, meal,
        food_id as "foodId", name, grams::float8,
        calories_per_100g::float8 as "caloriesPer100g",
        protein_per_100g::float8 as "proteinPer100g",
        carbohydrates_per_100g::float8 as "carbohydratesPer100g",
        fat_per_100g::float8 as "fatPer100g", client_entry_id as "clientEntryId"
    `;
    if (!row) throw new Error('Günlük kaydı oluşturulamadı.');
    return row;
  }

  async deleteDiaryEntry(userId: string, entryId: string): Promise<boolean> {
    const result = await this.sql`
      delete from diary_entries where id = ${entryId} and user_id = ${userId}
    `;
    return result.count > 0;
  }

  async listWeights(userId: string, from: string, to: string): Promise<WeightEntry[]> {
    return this.sql<WeightEntry[]>`
      select entry_date::text as date, value::float8
      from weight_entries
      where user_id = ${userId} and entry_date between ${from} and ${to}
      order by entry_date
    `;
  }

  async upsertWeight(userId: string, entry: WeightEntry): Promise<WeightEntry> {
    const [row] = await this.sql<WeightEntry[]>`
      insert into weight_entries (user_id, entry_date, value)
      values (${userId}, ${entry.date}, ${entry.value})
      on conflict (user_id, entry_date) do update set value = excluded.value
      returning entry_date::text as date, value::float8
    `;
    if (!row) throw new Error('Kilo kaydı oluşturulamadı.');
    return row;
  }

  async listWorkouts(userId: string, from: string, to: string): Promise<WorkoutEntry[]> {
    return this.sql<WorkoutEntry[]>`
      select id, user_id as "userId", entry_date::text as date, name,
             sets, reps, weight::float8
      from workout_entries
      where user_id = ${userId} and entry_date between ${from} and ${to}
      order by entry_date, created_at
    `;
  }

  async createWorkout(input: Omit<WorkoutEntry, 'id'>): Promise<WorkoutEntry> {
    const [row] = await this.sql<WorkoutEntry[]>`
      insert into workout_entries (user_id, entry_date, name, sets, reps, weight)
      values (${input.userId}, ${input.date}, ${input.name}, ${input.sets}, ${input.reps}, ${input.weight})
      returning id, user_id as "userId", entry_date::text as date, name,
                sets, reps, weight::float8
    `;
    if (!row) throw new Error('Antrenman kaydı oluşturulamadı.');
    return row;
  }

  async close(): Promise<void> {
    await this.sql.end();
  }
}
