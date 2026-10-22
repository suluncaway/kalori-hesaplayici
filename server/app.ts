import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  createSessionToken,
  hashPassword,
  hashSessionToken,
  verifyPassword,
} from './auth';
import type { Repository, User } from './types';

const SESSION_COOKIE = 'kalori_session';
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const diaryEntrySchema = z.object({
  date: dateSchema,
  meal: z.enum(['Kahvaltı', 'Öğle', 'Akşam', 'Ara öğün']),
  foodId: z.string().min(1).max(120),
  grams: z.number().positive().max(10_000),
  clientEntryId: z.string().min(1).max(200).optional(),
});
const rangeSchema = z.object({ from: dateSchema, to: dateSchema });
const weightSchema = z.object({ date: dateSchema, value: z.number().min(20).max(400) });
const workoutSchema = z.object({
  date: dateSchema,
  name: z.string().trim().min(1).max(80),
  sets: z.number().int().min(1).max(30),
  reps: z.number().int().min(1).max(200),
  weight: z.number().min(0).max(500).default(0),
});

interface BuildAppOptions {
  repository: Repository;
  allowedOrigins?: string[];
  secureCookies?: boolean;
  logger?: boolean;
  productLookup?: (barcode: string) => Promise<BarcodeProduct | null>;
}

interface BarcodeProduct {
  barcode: string;
  name: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
}

async function lookupOpenFoodFacts(barcode: string): Promise<BarcodeProduct | null> {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
    { signal: AbortSignal.timeout(10_000), headers: { 'User-Agent': 'kalori-hesaplayici/1.0' } },
  );
  if (!response.ok) throw new Error(`Open Food Facts yanıtı: ${response.status}`);
  const result = await response.json() as {
    status?: number;
    product?: { product_name_tr?: string; product_name?: string; nutriments?: Record<string, unknown> };
  };
  if (result.status !== 1 || !result.product) return null;
  const nutrients = result.product.nutriments ?? {};
  const values = [nutrients['energy-kcal_100g'], nutrients.proteins_100g,
    nutrients.carbohydrates_100g, nutrients.fat_100g].map(Number);
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  return {
    barcode,
    name: result.product.product_name_tr || result.product.product_name || 'İsimsiz ürün',
    calories: values[0] ?? 0,
    protein: values[1] ?? 0,
    carbohydrates: values[2] ?? 0,
    fat: values[3] ?? 0,
  };
}

export function buildApp({
  repository,
  allowedOrigins = [],
  secureCookies = true,
  logger = false,
  productLookup = lookupOpenFoodFacts,
}: BuildAppOptions) {
  const app = Fastify({ logger });
  const barcodeCache = new Map<string, { value: BarcodeProduct | null; expiresAt: number }>();

  void app.register(cookie);
  void app.register(rateLimit, { max: 120, timeWindow: '1 minute' });
  void app.register(cors, {
    credentials: true,
    origin: allowedOrigins.length === 0 ? false : allowedOrigins,
  });

  function setSessionCookie(reply: FastifyReply, token: string) {
    reply.setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: secureCookies,
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DURATION_MS / 1000,
    });
  }

  async function currentUser(request: FastifyRequest): Promise<User | null> {
    const token = request.cookies[SESSION_COOKIE];
    if (!token) return null;
    return repository.findUserBySession(hashSessionToken(token), new Date());
  }

  async function requireUser(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<User | null> {
    const user = await currentUser(request);
    if (!user) {
      await reply.code(401).send({ error: 'Oturum gerekli.' });
      return null;
    }
    return user;
  }

  async function startSession(user: User, reply: FastifyReply) {
    const token = createSessionToken();
    await repository.createSession(
      user.id,
      hashSessionToken(token),
      new Date(Date.now() + SESSION_DURATION_MS),
    );
    setSessionCookie(reply, token);
  }

  app.get('/health', async () => ({ status: 'ok' }));

  app.post('/auth/register', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz kayıt bilgileri.' });
    if (await repository.findUserByEmail(parsed.data.email)) {
      return reply.code(409).send({ error: 'Bu e-posta zaten kayıtlı.' });
    }
    const user = await repository.createUser(
      parsed.data.email,
      await hashPassword(parsed.data.password),
    );
    await startSession(user, reply);
    return reply.code(201).send({ id: user.id, email: user.email });
  });

  app.post('/auth/login', async (request, reply) => {
    const parsed = credentialsSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz giriş bilgileri.' });
    const user = await repository.findUserByEmail(parsed.data.email);
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'E-posta veya parola hatalı.' });
    }
    await startSession(user, reply);
    return { id: user.id, email: user.email };
  });

  app.post('/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE];
    if (token) await repository.deleteSession(hashSessionToken(token));
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    return reply.code(204).send();
  });

  app.get('/me', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    return { id: user.id, email: user.email };
  });

  app.get('/foods', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = z.object({ q: z.string().max(100).default('') }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz arama.' });
    return { items: await repository.searchFoods(parsed.data.q, 30) };
  });

  app.get('/foods/barcode/:barcode', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = z.object({ barcode: z.string().regex(/^\d{8,14}$/) }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz barkod.' });
    const cached = barcodeCache.get(parsed.data.barcode);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value ?? reply.code(404).send({ error: 'Ürün bulunamadı.' });
    }
    try {
      const product = await productLookup(parsed.data.barcode);
      barcodeCache.set(parsed.data.barcode, {
        value: product,
        expiresAt: Date.now() + 6 * 60 * 60 * 1000,
      });
      return product ?? reply.code(404).send({ error: 'Ürün bulunamadı.' });
    } catch {
      return reply.code(502).send({ error: 'Besin servisine şu anda ulaşılamıyor.' });
    }
  });

  app.get('/diary', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = z.object({ date: dateSchema }).safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz tarih.' });
    return { items: await repository.listDiaryEntries(user.id, parsed.data.date) };
  });

  app.post('/diary/entries', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = diaryEntrySchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz günlük kaydı.' });
    const food = await repository.findFoodById(parsed.data.foodId);
    if (!food) return reply.code(404).send({ error: 'Besin bulunamadı.' });
    const entry = await repository.createDiaryEntry(
      { userId: user.id, ...parsed.data },
      food,
    );
    return reply.code(201).send(entry);
  });

  app.delete('/diary/entries/:id', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = z.object({ id: z.string().uuid() }).safeParse(request.params);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz kayıt kimliği.' });
    const removed = await repository.deleteDiaryEntry(user.id, parsed.data.id);
    return removed
      ? reply.code(204).send()
      : reply.code(404).send({ error: 'Kayıt bulunamadı.' });
  });

  app.post('/weights', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = weightSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz kilo kaydı.' });
    return reply.code(201).send(await repository.upsertWeight(user.id, parsed.data));
  });

  app.post('/workouts', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = workoutSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'Geçersiz antrenman kaydı.' });
    return reply.code(201).send(
      await repository.createWorkout({ userId: user.id, ...parsed.data }),
    );
  });

  app.get('/progress', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = rangeSchema.safeParse(request.query);
    if (!parsed.success || parsed.data.from > parsed.data.to) {
      return reply.code(400).send({ error: 'Geçersiz tarih aralığı.' });
    }
    const [entries, weights, workouts] = await Promise.all([
      repository.listDiaryEntriesRange(user.id, parsed.data.from, parsed.data.to),
      repository.listWeights(user.id, parsed.data.from, parsed.data.to),
      repository.listWorkouts(user.id, parsed.data.from, parsed.data.to),
    ]);
    const dailyCalories = Object.entries(
      entries.reduce<Record<string, number>>((days, entry) => {
        days[entry.date] = (days[entry.date] ?? 0) + entry.caloriesPer100g * entry.grams / 100;
        return days;
      }, {}),
    ).map(([date, calories]) => ({ date, calories: Math.round(calories * 10) / 10 }));
    return { dailyCalories, weights, workouts };
  });

  app.get('/export/diary.csv', async (request, reply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const parsed = rangeSchema.safeParse(request.query);
    if (!parsed.success || parsed.data.from > parsed.data.to) {
      return reply.code(400).send({ error: 'Geçersiz tarih aralığı.' });
    }
    const entries = await repository.listDiaryEntriesRange(
      user.id,
      parsed.data.from,
      parsed.data.to,
    );
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const rows: (string | number)[][] = [
      ['Tarih', 'Öğün', 'Besin', 'Gram', 'Kalori', 'Protein', 'Karbonhidrat', 'Yağ'],
      ...entries.map((entry) => {
        const factor = entry.grams / 100;
        return [entry.date, entry.meal, entry.name, entry.grams,
          entry.caloriesPer100g * factor, entry.proteinPer100g * factor,
          entry.carbohydratesPer100g * factor, entry.fatPer100g * factor];
      }),
    ];
    const csv = `\ufeff${rows.map((row) => row.map(escape).join(';')).join('\r\n')}`;
    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', 'attachment; filename="besin-gunlugu.csv"')
      .send(csv);
  });

  app.addHook('onClose', async () => repository.close());
  return app;
}
