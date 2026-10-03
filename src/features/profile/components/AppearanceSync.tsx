import { useContext, useEffect } from 'react';
import { AuthContext } from '../../auth/context/AuthContext';
import { useBackground } from '../../../shared/theme/BackgroundProvider';
import { useAccent } from '../../../shared/theme/AccentProvider';

/**
 * Hisobdagi ko'rinish sozlamalarini ilovaga ulaydi: fon rasmi va
 * asosiy rang.
 *
 * NEGA ALOHIDA KOMPONENT: ikkala provayder ham daraxtda `AuthProvider`
 * dan YUQORIDA turadi (mavzu ularga tayanadi, o'zlari esa mavzuga
 * tayanmaydi), shuning uchun ular profilni o'zlari o'qiy olmaydi. Bu
 * komponent esa uchala kontekst ichida turadi va ularni bog'laydi.
 *
 * Hech narsa chizmaydi.
 */
const AppearanceSync: React.FC = () => {
  const { profile } = useContext(AuthContext);
  const { adopt } = useBackground();
  const { adoptAccent } = useAccent();

  const id = profile?.id ?? null;
  const background = profile?.background;
  const accent = profile?.accent;

  useEffect(() => {
    // Maydonlar bo'yicha bog'lanish: obyektning o'zi har renderda yangi
    // havola bo'lib, cheksiz tsikl yasardi.
    adopt(id, background ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, background?.imageId, background?.fit, background?.dim, adopt]);

  useEffect(() => {
    adoptAccent(id, accent ?? null);
  }, [id, accent, adoptAccent]);

  return null;
};

export default AppearanceSync;
