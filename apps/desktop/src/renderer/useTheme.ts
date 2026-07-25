import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('streamerhub.theme') as Theme) || 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (currentTheme: Theme) => {
      let resolved = currentTheme;
      if (currentTheme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light';
      }
      root.dataset.theme = resolved;
    };

    applyTheme(theme);
    localStorage.setItem('streamerhub.theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme('system');
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  return { theme, setTheme };
}
