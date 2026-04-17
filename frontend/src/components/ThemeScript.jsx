export default function ThemeScript() {
  const script = `
    (function() {
      try {
        var key = 'luxerent-theme';
        var stored = localStorage.getItem(key);
        var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        var theme = stored || (prefersDark ? 'dark' : 'light');
        document.documentElement.classList.toggle('dark', theme === 'dark');
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
