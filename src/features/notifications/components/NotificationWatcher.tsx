import { useNotificationWatcher } from '../hooks/useNotificationWatcher';

/**
 * Ko'rinmas komponent — login qilingan foydalanuvchi uchun yangi bildirishnomalarni
 * kuzatib, web'da brauzer popup'ini chiqaradi. Ilova ildizida mount qilinadi.
 */
const NotificationWatcher: React.FC = () => {
  useNotificationWatcher();
  return null;
};

export default NotificationWatcher;
