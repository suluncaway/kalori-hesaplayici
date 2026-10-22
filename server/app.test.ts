import { afterEach, describe, expect, it } from 'vitest';
import { buildApp } from './app';
import { MemoryRepository } from './memory-repository';

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

function testApp(options: Partial<Parameters<typeof buildApp>[0]> = {}) {
  const app = buildApp({
    repository: new MemoryRepository(),
    secureCookies: false,
    ...options,
  });
  apps.push(app);
  return app;
}

async function register(app: ReturnType<typeof buildApp>, email = 'test@example.com') {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { email, password: 'guclu-parola-123' },
  });
  const cookie = response.cookies.find((item) => item.name === 'kalori_session');
  if (!cookie) throw new Error('Oturum çerezi oluşturulmadı.');
  return { response, cookie: `${cookie.name}=${cookie.value}` };
}

describe('API', () => {
  it('sağlık kontrolü döndürür', async () => {
    const response = await testApp().inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('kayıt oluşturur ve HttpOnly oturum açar', async () => {
    const { response } = await register(testApp());
    expect(response.statusCode).toBe(201);
    expect(response.headers['set-cookie']).toContain('HttpOnly');
  });

  it('oturumsuz günlük erişimini reddeder', async () => {
    const response = await testApp().inject({
      method: 'GET',
      url: '/diary?date=2026-10-22',
    });
    expect(response.statusCode).toBe(401);
  });

  it('besin kaydını snapshot değerlerle oluşturur ve siler', async () => {
    const app = testApp();
    const { cookie } = await register(app);
    const created = await app.inject({
      method: 'POST',
      url: '/diary/entries',
      headers: { cookie },
      payload: {
        date: '2026-10-22',
        meal: 'Kahvaltı',
        foodId: 'yumurta',
        grams: 100,
      },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({ name: 'Yumurta', caloriesPer100g: 143 });

    const repeated = await app.inject({
      method: 'POST',
      url: '/diary/entries',
      headers: { cookie },
      payload: {
        date: '2026-10-22',
        meal: 'Kahvaltı',
        foodId: 'yumurta',
        grams: 100,
        clientEntryId: 'browser-entry-1',
      },
    });
    await app.inject({
      method: 'POST',
      url: '/diary/entries',
      headers: { cookie },
      payload: {
        date: '2026-10-22',
        meal: 'Kahvaltı',
        foodId: 'yumurta',
        grams: 100,
        clientEntryId: 'browser-entry-1',
      },
    });
    expect(repeated.statusCode).toBe(201);

    const listed = await app.inject({
      method: 'GET',
      url: '/diary?date=2026-10-22',
      headers: { cookie },
    });
    expect(listed.json().items).toHaveLength(2);

    const removed = await app.inject({
      method: 'DELETE',
      url: `/diary/entries/${created.json().id as string}`,
      headers: { cookie },
    });
    expect(removed.statusCode).toBe(204);
  });

  it('kilo ve antrenman ilerlemesini kullanıcıya özel döndürür', async () => {
    const app = testApp();
    const { cookie } = await register(app);
    await app.inject({
      method: 'POST', url: '/weights', headers: { cookie },
      payload: { date: '2026-10-22', value: 75.4 },
    });
    await app.inject({
      method: 'POST', url: '/workouts', headers: { cookie },
      payload: { date: '2026-10-22', name: 'Squat', sets: 3, reps: 12, weight: 20 },
    });
    const progress = await app.inject({
      method: 'GET',
      url: '/progress?from=2026-10-01&to=2026-10-31',
      headers: { cookie },
    });
    expect(progress.statusCode).toBe(200);
    expect(progress.json()).toMatchObject({
      weights: [{ date: '2026-10-22', value: 75.4 }],
      workouts: [{ name: 'Squat', sets: 3, reps: 12, weight: 20 }],
    });
  });

  it('barkod sağlayıcısının doğrulanmış alanlarını döndürür', async () => {
    const app = testApp({
      productLookup: async (barcode) => ({
        barcode, name: 'Test Yoğurt', calories: 60,
        protein: 4, carbohydrates: 5, fat: 2,
      }),
    });
    const { cookie } = await register(app);
    const response = await app.inject({
      method: 'GET', url: '/foods/barcode/8691234567890', headers: { cookie },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ name: 'Test Yoğurt', calories: 60 });
  });
});
