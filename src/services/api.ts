export interface Account {
  id: string;
  email: string;
}

interface ApiErrorBody { error?: string }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiErrorBody;
    throw new Error(body.error ?? `İstek başarısız (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const getCurrentAccount = () => request<Account>('/me');
export const register = (email: string, password: string) =>
  request<Account>('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
export const login = (email: string, password: string) =>
  request<Account>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
export const logout = () => request<void>('/auth/logout', { method: 'POST' });

export interface DiaryUpload {
  date: string;
  meal: 'Kahvaltı' | 'Öğle' | 'Akşam' | 'Ara öğün';
  foodId: string;
  grams: number;
  clientEntryId: string;
}

export const uploadDiaryEntry = (entry: DiaryUpload) =>
  request('/diary/entries', { method: 'POST', body: JSON.stringify(entry) });
