import React, { forwardRef, useCallback, useRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';

type FocusEvent = Parameters<NonNullable<TextInputProps['onFocus']>>[0];
import { useAuthKeyboardScroll } from './AuthShell';

/**
 * Auth formalari uchun TextInput: fokuslanganda o'zini AuthShell orqali
 * klaviatura ustidagi ko'rinadigan zonaga suradi (maydon klaviatura tagida
 * qolib ketmasligi uchun).
 */
const AuthTextInput = forwardRef<TextInput, TextInputProps>(({ onFocus, ...props }, ref) => {
  const notifyFocus = useAuthKeyboardScroll();
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
    onFocus?.(event);
  }, [notifyFocus, onFocus]);

  return <TextInput {...props} ref={setRefs} onFocus={handleFocus} />;
});

AuthTextInput.displayName = 'AuthTextInput';

export default AuthTextInput;
