import { useEffect } from 'react';
import { useSettingsStore, applySettingsToDocument } from '@/stores/settingsStore';

/**
 * Keeps <html> in sync with appearance settings.
 *
 * index.html applies the same values inline before first paint; this hook owns
 * them from hydration onward and re-applies whenever a setting changes or —
 * when the preference is 'system' — when the OS theme flips underneath us.
 */
export function useAppearance(): void {
  const theme = useSettingsStore((s) => s.theme);
  const readingFamily = useSettingsStore((s) => s.readingFamily);
  const readingSize = useSettingsStore((s) => s.readingSize);
  const readingMeasure = useSettingsStore((s) => s.readingMeasure);

  useEffect(() => {
    applySettingsToDocument({ theme, readingFamily, readingSize, readingMeasure });
  }, [theme, readingFamily, readingSize, readingMeasure]);

  useEffect(() => {
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applySettingsToDocument({ theme, readingFamily, readingSize, readingMeasure });
    };

    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme, readingFamily, readingSize, readingMeasure]);
}
