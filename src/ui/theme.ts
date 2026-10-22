type Theme = 'light' | 'dark';

const STORAGE_KEY = 'kalori-theme-v1';

function preferredTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme, button: HTMLButtonElement) {
  document.documentElement.dataset.theme = theme;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  button.setAttribute('aria-label', `${nextTheme === 'dark' ? 'Koyu' : 'Açık'} temayı aç`);
  button.title = `${nextTheme === 'dark' ? 'Koyu' : 'Açık'} temayı aç`;
}

export function initializeTheme(): void {
  const button = document.querySelector<HTMLButtonElement>('#theme-toggle');
  if (!button) return;
  let theme = preferredTheme();
  applyTheme(theme, button);
  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme, button);
  });
}
