import { buildApp } from './app';
import { PostgresRepository } from './postgres-repository';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL tanımlı değil.');

const port = Number(process.env.PORT ?? 3000);
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = buildApp({
  repository: new PostgresRepository(databaseUrl),
  allowedOrigins,
  secureCookies: process.env.NODE_ENV !== 'development',
  logger: true,
});

await app.listen({ host: '0.0.0.0', port });
