import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../../../shared/i18n';

/**
 * Profil amallari uchun umumiy holat: qaysi amal ketmoqda, natija xabari.
 *
 * Uchala profil ekrani ham bir xil yuritadi — muvaffaqiyat xabari o'zi
 * yo'qoladi, xato esa foydalanuvchi tuzatgunicha ko'rinib turadi.
 */
export function useProfileAction() {
  const { t } = useI18n();
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [statusError, setStatusError] = useState(false);

  const run = useCallback(
    async (key: string, action: () => Promise<void>) => {
      setLoadingKey(key);
      setStatus('');
      try {
        await action();
        setStatusError(false);
        setStatus(t('common.success'));
      } catch (e) {
        setStatusError(true);
        setStatus(e instanceof Error ? e.message : t('profile.genericError'));
      } finally {
        setLoadingKey(null);
      }
    },
    [t]
  );

  // Muvaffaqiyat xabari o'zi so'nadi; xato qoladi.
  useEffect(() => {
    if (!status || statusError) return;
    const timer = setTimeout(() => setStatus(''), 3000);
    return () => clearTimeout(timer);
  }, [status, statusError]);

  return { loadingKey, status, statusError, run };
}
