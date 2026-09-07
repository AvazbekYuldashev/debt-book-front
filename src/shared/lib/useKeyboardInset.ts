import { useEffect, useState } from 'react';
import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

/**
 * Klaviatura ekranning necha piksel qismini yopib turgani.
 *
 * NEGA KERAK: modal oyna odatda MARKAZDA ochilishi kerak — bu eng tabiiy
 * joylashuv. Ilgari forma modallari `justifyContent: 'flex-start'` bilan
 * DOIM yuqoriga qadab qo'yilgandi, chunki klaviatura ochilganda maydonlarni
 * yopib qolardi. Natijada klaviatura yopiq bo'lganda ham — masalan foydalanuvchi
 * shunchaki summani ko'rayotganda — oyna ekranning tepasida osilib turardi.
 *
 * To'g'ri yechim: markazda qoldirib, klaviatura ochilganda uning balandligicha
 * pastdan bo'shliq qo'shish. Shunda "markaz" klaviatura USTIDAGI maydonning
 * markaziga suriladi, ya'ni oyna o'zi kerakli miqdorda yuqoriga chiqadi.
 * Kontent sig'masa — ScrollView aylantiradi.
 *
 * iOS'da 0 QAYTADI: u yerda `KeyboardAvoidingView` `behavior="padding"` bilan
 * konteynerni o'zi kichraytiradi. Bu yerda yana qo'shsak, oyna ikki barobar
 * yuqoriga sakrardi.
 *
 * Android'da esa ilova edge-to-edge rejimida va oyna klaviatura ochilganda
 * kichraymaydi — o'lchashning yagona yo'li shu.
 *
 * Web'da bu hodisalar umuman kelmaydi: qiymat 0 bo'lib qoladi va modal
 * markazda turaveradi — jismoniy klaviaturada aynan shu to'g'ri.
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    if (Platform.OS === 'ios') return undefined;

    const onShow = (event: KeyboardEvent) => setInset(event.endCoordinates?.height ?? 0);
    const onHide = () => setInset(0);

    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', onShow),
      Keyboard.addListener('keyboardDidHide', onHide),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  return inset;
}
