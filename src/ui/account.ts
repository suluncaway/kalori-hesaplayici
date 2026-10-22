import {
  getCurrentAccount,
  login,
  logout,
  register,
  uploadDiaryEntry,
  type Account,
  type DiaryUpload,
} from '../services/api';

interface LegacyEntry { id?: string; foodId?: string; grams?: number; meal?: string }
interface LegacyStore { days?: Record<string, LegacyEntry[]> }

const mealNames = new Set<DiaryUpload['meal']>(['Kahvaltı', 'Öğle', 'Akşam', 'Ara öğün']);
function element<T extends HTMLElement>(selector: string): T {
  const found = document.querySelector<T>(selector);
  if (!found) throw new Error(`Arayüz öğesi bulunamadı: ${selector}`);
  return found;
}

function localEntries(): DiaryUpload[] {
  let store: LegacyStore = {};
  try { store = JSON.parse(localStorage.getItem('kalori-gunluk-v1') ?? '{}') as LegacyStore; }
  catch { return []; }
  const result: DiaryUpload[] = [];
  for (const [date, entries] of Object.entries(store.days ?? {})) for (const entry of entries) {
    if (!entry.id || !entry.foodId || !entry.meal ||
        !mealNames.has(entry.meal as DiaryUpload['meal']) ||
        !Number.isFinite(entry.grams) || (entry.grams ?? 0) <= 0) continue;
    result.push({ date, meal: entry.meal as DiaryUpload['meal'], foodId: entry.foodId,
      grams: entry.grams as number, clientEntryId: entry.id });
  }
  return result;
}

export function initializeAccount(): void {
  const form = element<HTMLFormElement>('#account-form');
  const status = element<HTMLParagraphElement>('#account-status');
  const email = element<HTMLInputElement>('#account-email');
  const password = element<HTMLInputElement>('#account-password');
  const loginButton = element<HTMLButtonElement>('#account-login');
  const registerButton = element<HTMLButtonElement>('#account-register');
  const logoutButton = element<HTMLButtonElement>('#account-logout');
  const syncButton = element<HTMLButtonElement>('#account-sync');
  function render(account: Account | null) {
    form.hidden = account !== null;
    logoutButton.hidden = account === null;
    syncButton.hidden = account === null;
    status.textContent = account ? `${account.email} hesabıyla giriş yapıldı.` :
      'Verilerin şu anda yalnızca bu tarayıcıda. Hesap açarsan cihazların arasında eşitleyebilirsin.';
  }

  async function authenticate(mode: 'login' | 'register') {
    status.textContent = 'İşlem yapılıyor…';
    loginButton.disabled = registerButton.disabled = true;
    try {
      const account = await (mode === 'login' ? login : register)(email.value, password.value);
      password.value = '';
      render(account);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : 'İşlem tamamlanamadı.';
    } finally {
      loginButton.disabled = registerButton.disabled = false;
    }
  }

  form.addEventListener('submit', (event) => { event.preventDefault(); void authenticate('login'); });
  registerButton.addEventListener('click', () => void authenticate('register'));
  logoutButton.addEventListener('click', async () => { await logout(); render(null); });
  syncButton.addEventListener('click', async () => {
    const entries = localEntries();
    if (!entries.length) { status.textContent = 'Aktarılabilecek yerel günlük kaydı bulunamadı.'; return; }
    syncButton.disabled = true;
    status.textContent = `${entries.length} kayıt aktarılıyor…`;
    let uploaded = 0;
    for (const entry of entries) try { await uploadDiaryEntry(entry); uploaded += 1; } catch { /* devam et */ }
    status.textContent = `${uploaded}/${entries.length} kayıt hesaba aktarıldı. Barkod kayıtları şimdilik atlanır.`;
    syncButton.disabled = false;
  });
  void getCurrentAccount().then(render).catch(() => render(null));
}
