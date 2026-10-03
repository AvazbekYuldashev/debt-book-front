import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Keyboard,
  Platform,
  TextInput,
  type KeyboardEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import { FOCUS_GAP, focusScrollTarget, keyboardOverlap } from '../model/keyboardScroll';
import { useAppTheme } from '../../../shared/theme';
import { ColorTokens } from '../../../shared/theme/colors';
import LanguageSwitcher from '../../../shared/ui/LanguageSwitcher';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
  /**
   * Ekran PASTIGA mixlanadigan qism — odatda asosiy tugma.
   *
   * Qisqa formalarda (parolni tiklash, tasdiqlash) maydon bittagina
   * bo'ladi va tugma uning ostida, ekran o'rtasida osilib qolardi.
   * Pastga mixlangani barmoqqa ham yaqin.
   */
  bottomAction?: ReactNode;
}

/**
 * Fokusdagi maydonni klaviatura ustiga surish uchun AuthShell beradigan callback.
 * AuthTextInput shu orqali o'zini ko'rinadigan zonaga chiqaradi.
 */
const AuthKeyboardContext = createContext<(input: TextInput | null) => void>(() => {});

export const useAuthKeyboardScroll = () => useContext(AuthKeyboardContext);

/**
 * Kirish ekranlarining umumiy qolipi.
 *
 * KARTA YO'Q: ilgari forma shisha kartaning ichida, hamma narsa markazga
 * tekislangan holda turardi. Endi mazmun sahifaning o'zida, chapga
 * tekislangan va sarlavha katta — ko'z birinchi navbatda "qayerdaman"
 * degan savolga javob topadi, keyin maydonlarga tushadi. Markazga
 * tekislangan matn qatorlari har safar turli joydan boshlanib, o'qishni
 * sekinlashtirardi.
 *
 * Dekorativ fon saqlanib qoldi: kirish ekrani ham ilovaning umumiy
 * "imzo" qatlamiga ega bo'ladi.
 */
const AuthShell: React.FC<AuthShellProps> = ({ title, subtitle, onBack, children, bottomAction }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const rootRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const focusedInputRef = useRef<TextInput | null>(null);
  const viewportHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const overlapRef = useRef(0);
  const [keyboardInset, setKeyboardInset] = useState(0);

  /**
   * Fokusdagi maydonni klaviatura ustidagi ko'rinadigan zonaga suradi.
   * Maydon o'rni ScrollView oynasiga nisbatan o'lchanadi — ya'ni joriy skroll
   * holati allaqachon hisobga olingan bo'ladi.
   */
  const scrollFocusedIntoView = useCallback(() => {
    const root = rootRef.current;
    const input = focusedInputRef.current;
    if (!root || !input) return;

    input.measureLayout(
      root,
      (_x, y, _width, height) => {
        const target = focusScrollTarget({
          offset: scrollOffsetRef.current,
          top: y,
          height,
          visibleHeight: viewportHeightRef.current - overlapRef.current,
        });
        if (target === null) return;
        scrollRef.current?.scrollTo({ y: target, animated: true });
      },
      () => {},
    );
  }, []);

  const handleInputFocus = useCallback((input: TextInput | null) => {
    focusedInputRef.current = input;
    scrollFocusedIntoView();
  }, [scrollFocusedIntoView]);

  /**
   * Android'da edge-to-edge yoqilgani uchun oyna klaviatura ochilganda
   * kichraymaydi — klaviatura kontentni yopib qo'yadi. Shuning uchun klaviatura
   * ekranning qancha qismini yopganini o'zimiz o'lchab, ro'yxat pastiga shuncha
   * bo'shliq qo'shamiz.
   */
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (event: KeyboardEvent) => {
      const root = rootRef.current;
      const keyboardTop = event.endCoordinates?.screenY;
      if (!root || typeof keyboardTop !== 'number') return;
      root.measureInWindow((_x, y, _width, height) => {
        const overlap = keyboardOverlap(y + height, keyboardTop);
        overlapRef.current = overlap;
        setKeyboardInset(overlap);
      });
    };

    const onHide = () => {
      overlapRef.current = 0;
      setKeyboardInset(0);
    };

    const subscriptions = [
      Keyboard.addListener(showEvent, onShow),
      Keyboard.addListener(hideEvent, onHide),
    ];
    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  // Bo'shliq qo'shilgach fokusdagi maydonni ko'rinadigan joyga suramiz
  // (native layout bir kadr kechikishi mumkin — shuning uchun kichik kutish).
  useEffect(() => {
    if (keyboardInset <= 0) return undefined;
    const timer = setTimeout(scrollFocusedIntoView, 60);
    return () => clearTimeout(timer);
  }, [keyboardInset, scrollFocusedIntoView]);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeightRef.current = event.nativeEvent.layout.height;
  }, []);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  }, []);

  return (
    <View ref={rootRef} style={styles.screen} collapsable={false} onLayout={handleLayout}>
      {/* Dekorativ fon — kirish ekranlari ham ilovaning umumiy "imzo"
          qatlamiga ega bo'ladi: birinchi taassurot bir xil boshlanadi. */}
      <AmbientBackground />
      <ScrollView
        ref={scrollRef}
        style={styles.screen}
        contentContainerStyle={[
          styles.content,
          keyboardInset > 0 ? { paddingBottom: keyboardInset + FOCUS_GAP } : null,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <AuthKeyboardContext.Provider value={handleInputFocus}>
          {/* Yuqori qator joyi DOIM band (orqaga tugmasi bo'lmasa ham):
              aks holda sarlavha ekrandan ekranga sakrab turardi. */}
          <View style={styles.topRow}>
            {onBack ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onBack}
                accessibilityRole="button"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}
            <LanguageSwitcher />
          </View>

          {/* Mazmun ekran bo'yi bo'ylab O'RTAGA tushadi.
              Qisqa formalar (bitta maydon) yuqoriga yopishib, ostida
              katta bo'sh maydon qolardi - ekran tugamagandek ko'rinardi.
              Mazmun uzun bo'lsa markazlash o'z-o'zidan bekor bo'ladi va
              oddiy skroll qoladi. */}
          <View style={styles.middle}>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

            <View style={styles.form}>{children}</View>
          </View>

          {/* Asosiy harakat ekran tagida: barmoqqa yaqin va o'rni
              ekrandan ekranga o'zgarmaydi. */}
          {bottomAction ? <View style={styles.bottomAction}>{bottomAction}</View> : null}
        </AuthKeyboardContext.Provider>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  screen: {
    flex: 1,
    // Fon AmbientBackground'dan keladi — tekis rang berilmaydi.
    backgroundColor: 'transparent',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 32,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 40,
    height: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textSecondary,
    marginTop: 10,
  },
  middle: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  form: {
    marginTop: 28,
  },
  bottomAction: {
    marginTop: 24,
  },
});

export default AuthShell;
