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
import { FOCUS_GAP, focusScrollTarget, keyboardOverlap } from '../model/keyboardScroll';
import { useAppTheme } from '../../../shared/theme';
import { ColorTokens } from '../../../shared/theme/colors';
import LanguageSwitcher from '../../../shared/ui/LanguageSwitcher';

interface AuthShellProps {
  emoji?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: ReactNode;
}

/**
 * Fokusdagi maydonni klaviatura ustiga surish uchun AuthShell beradigan callback.
 * AuthTextInput shu orqali o'zini ko'rinadigan zonaga chiqaradi.
 */
const AuthKeyboardContext = createContext<(input: TextInput | null) => void>(() => {});

export const useAuthKeyboardScroll = () => useContext(AuthKeyboardContext);

const AuthShell: React.FC<AuthShellProps> = ({ emoji, icon, title, subtitle, onBack, children }) => {
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
          <View style={styles.card}>
            {onBack ? (
              <TouchableOpacity
                style={styles.backBtn}
                onPress={onBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : null}
            <View style={styles.langSwitch}>
              <LanguageSwitcher />
            </View>
            <View style={styles.iconBadge}>
              {icon ? (
                <Ionicons name={icon} size={30} color={colors.primary} />
              ) : (
                <Text style={styles.iconEmoji}>{emoji}</Text>
              )}
            </View>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            {children}
          </View>
        </AuthKeyboardContext.Provider>
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 28,
    elevation: 4,
  },
  langSwitch: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 18,
  },
  iconEmoji: {
    fontSize: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 26,
  },
});

export default AuthShell;
