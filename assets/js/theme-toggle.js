(() => {
  const root = document.documentElement;
  const header = document.querySelector('.site-header');
  if (!header || header.querySelector('.theme-toggle')) return;

  let theme = root.dataset.theme === 'light' ? 'light' : 'dark';
  const button = document.createElement('button');
  button.className = 'theme-toggle';
  button.type = 'button';

  const paint = () => {
    const isLight = theme === 'light';
    root.dataset.theme = theme;
    button.textContent = isLight ? '☾ Dark theme' : '☀ Light theme';
    button.setAttribute('aria-label', `Switch to ${isLight ? 'dark' : 'light'} theme`);
    button.setAttribute('aria-pressed', String(isLight));
    button.title = `Switch to ${isLight ? 'dark' : 'light'} theme`;
  };

  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    paint();
    try { localStorage.setItem('downgo-site-theme', theme); } catch (_) { /* Storage may be disabled. */ }
  });

  header.append(button);
  paint();
})();
