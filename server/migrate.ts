import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL tanımlı değil.');

const sql = postgres(databaseUrl, { max: 1 });
const migrationsDirectory = join(import.meta.dirname, 'migrations');

await sql`
  create table if not exists schema_migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  )
`;

const files = (await readdir(migrationsDirectory))
  .filter((file) => file.endsWith('.sql'))
  .sort();

for (const file of files) {
  const [existing] = await sql<{ name: string }[]>`
    select name from schema_migrations where name = ${file}
  `;
  if (existing) continue;
  const source = await readFile(join(migrationsDirectory, file), 'utf8');
  await sql.begin(async (transaction) => {
    await transaction.unsafe(source);
    await transaction`insert into schema_migrations (name) values (${file})`;
  });
  process.stdout.write(`Uygulandı: ${file}\n`);
}

await sql.end();
