import React, { forwardRef, useCallback, useRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
type BlurEvent = Parameters<NonNullable<TextInputProps['onBlur']>>[0];
import { useAuthKeyboardScroll } from './AuthShell';
import { useFieldFocus } from './AuthField';

/**
 * Auth formalari uchun TextInput.
 *
 * Ikki narsani yuqoriga xabar qiladi: AuthShell'ga - klaviatura ustidagi
 * ko'rinadigan zonaga surilish uchun, AuthField'ga - butun qator chegarasi
 * yonishi uchun. Fokus hodisasi React Native'da yuqoriga ko'tarilmagani
 * uchun ikkovi ham kontekst orqali ishlaydi.
 */
const AuthTextInput = forwardRef<TextInput, TextInputProps>(
  ({ onFocus, onBlur, style, ...props }, ref) => {
    const notifyFocus = useAuthKeyboardScroll();
    const setFieldFocus = useFieldFocus();
    const inputRef = useRef<TextInput | null>(null);

    const setRefs = useCallback((node: TextInput | null) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    }, [ref]);

    const handleFocus = useCallback((event: FocusEvent) => {
      notifyFocus(inputRef.current);
      setFieldFocus(true);
      onFocus?.(event);
    }, [notifyFocus, setFieldFocus, onFocus]);

    const handleBlur = useCallback((event: BlurEvent) => {
      setFieldFocus(false);
      onBlur?.(event);
    }, [setFieldFocus, onBlur]);

    return (
      <TextInput
        {...props}
        ref={setRefs}
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={[style, styles.noOutline]}
      />
    );
  },
);

const styles = StyleSheet.create({
  /**
   * Brauzerning o'z fokus ramkasi o'chiriladi.
   *
   * U aynan `input` elementiga chizilardi - u esa "+998" yoki ko'z
   * tugmasidan keyin boshlanadi, natijada qora to'rtburchak maydonning
   * faqat bir qismini o'rab, kesilgandek ko'rinardi. Fokus endi butun
   * qatorga chiziladi (AuthField), ya'ni ko'rsatkich YO'QOLMAYDI -
   * joyi o'zgardi.
   *
   * `outlineStyle` faqat react-native-web'da bor, shuning uchun tur
   * tekshiruvidan o'tkazib yuboriladi; qurilmada e'tiborsiz qoladi.
   */
  noOutline: { outlineStyle: 'none' } as never,
});

AuthTextInput.displayName = 'AuthTextInput';

export default AuthTextInput;
