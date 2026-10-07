import React from 'react';
import { Modal as NativeModal, type ModalProps } from 'react-native';
import { NestedGlass } from '../theme';

/**
 * Ilovadagi BARCHA dialog va pastdan chiquvchi oynalar uchun `Modal`.
 *
 * react-native `Modal` ning o'zi, bitta farq bilan: ichidagi hamma narsa
 * dialog sirti (yoki qoraytirilgan qatlam) USTIDA turadi, fon rasmi
 * ustida emas. Shu sababli ichidagi tugma, chip va qidiruv maydoni
 * muzlatmaydi va oq xiralik qo'shmaydi (NestedGlass) - aks holda ular
 * dialogning o'z bo'yog'ini qayta muzlatib, kulrang plitaga aylanardi va
 * rangi shaffoflik sozlamasiga qarab o'zgarardi.
 */
const Modal: React.FC<ModalProps> = ({ children, ...props }) => (
  <NativeModal {...props}>
    <NestedGlass>{children}</NestedGlass>
  </NativeModal>
);

export default Modal;
