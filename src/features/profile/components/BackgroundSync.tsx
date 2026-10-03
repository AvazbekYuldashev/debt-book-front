import { useContext, useEffect } from 'react';
import { AuthContext } from '../../auth/context/AuthContext';
import { useBackground } from '../../../shared/theme/BackgroundProvider';

/**
 * Hisobdagi fonni ilovaga ulaydi.
 *
 * NEGA ALOHIDA KOMPONENT: `BackgroundProvider` daraxtda `AuthProvider`
 * dan YUQORIDA turadi (fon rangi mavzuga tayanadi, mavzu esa eng
 * tashqarida), shuning uchun u profilni o'zi o'qiy olmaydi. Bu komponent
 * esa ikkala kontekst ichida turadi va ularni bir-biriga bog'laydi.
 *
 * Hech narsa chizmaydi.
 */
const BackgroundSync: React.FC = () => {
  const { profile } = useContext(AuthContext);
  const { adopt } = useBackground();

  const id = profile?.id ?? null;
  const background = profile?.background;

  useEffect(() => {
    // Maydonlar bo'yicha bog'lanish: obyektning o'zi har renderda yangi
    // havola bo'lib, cheksiz tsikl yasardi.
    adopt(id, background ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, background?.imageId, background?.fit, background?.dim, adopt]);

  return null;
};

export default BackgroundSync;
