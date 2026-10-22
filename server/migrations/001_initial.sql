create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_expires_at_idx on sessions(expires_at);

create table if not exists foods (
  id text primary key,
  name text not null,
  calories numeric(8,2) not null check (calories >= 0),
  protein numeric(8,2) not null check (protein >= 0),
  carbohydrates numeric(8,2) not null check (carbohydrates >= 0),
  fat numeric(8,2) not null check (fat >= 0),
  source text not null default 'local',
  updated_at timestamptz not null default now()
);
create index if not exists foods_name_idx on foods using gin (to_tsvector('simple', name));

create table if not exists diary_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  entry_date date not null,
  meal text not null check (meal in ('Kahvaltı', 'Öğle', 'Akşam', 'Ara öğün')),
  food_id text not null references foods(id),
  name text not null,
  grams numeric(10,2) not null check (grams > 0 and grams <= 10000),
  calories_per_100g numeric(8,2) not null check (calories_per_100g >= 0),
  protein_per_100g numeric(8,2) not null check (protein_per_100g >= 0),
  carbohydrates_per_100g numeric(8,2) not null check (carbohydrates_per_100g >= 0),
  fat_per_100g numeric(8,2) not null check (fat_per_100g >= 0),
  client_entry_id text,
  created_at timestamptz not null default now()
);
create index if not exists diary_entries_user_date_idx
  on diary_entries(user_id, entry_date, created_at);
create unique index if not exists diary_entries_user_client_id_idx
  on diary_entries(user_id, client_entry_id)
  where client_entry_id is not null;

create table if not exists weight_entries (
  user_id uuid not null references users(id) on delete cascade,
  entry_date date not null,
  value numeric(6,2) not null check (value between 20 and 400),
  created_at timestamptz not null default now(),
  primary key (user_id, entry_date)
);

create table if not exists workout_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  entry_date date not null,
  name text not null check (char_length(name) between 1 and 80),
  sets integer not null check (sets between 1 and 30),
  reps integer not null check (reps between 1 and 200),
  weight numeric(7,2) not null default 0 check (weight between 0 and 500),
  created_at timestamptz not null default now()
);
create index if not exists workout_entries_user_date_idx
  on workout_entries(user_id, entry_date, created_at);
