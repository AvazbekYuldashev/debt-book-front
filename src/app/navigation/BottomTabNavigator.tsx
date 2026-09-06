import React, { useContext, useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DebtsStack from './DebtsStack';
import GapStack from './GapStack';
import ExpensesStack from './ExpensesStack';
import ProfileStack from './ProfileStack';
import { Feather } from '@expo/vector-icons';
import { ROUTES } from './routes';
import type { MainTabParamList } from './types';
import { useI18n } from '../../shared/i18n';
import { WorkspaceContext } from '../../features/business/context/WorkspaceContext';
import { useAppTheme } from '../../shared/theme';
import type { ThemeValue } from '../../shared/theme/ThemeProvider';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  [ROUTES.DEBTS]: 'list',
  [ROUTES.GAP]: 'users',
  [ROUTES.EXPENSES]: 'dollar-sign',
  [ROUTES.PROFILE]: 'user',
};

const ICON_SIZE = 22;
const DOT_SIZE = 5;
const BAR_HEIGHT = 70;

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface TabItemProps {
  label: string;
  iconName: React.ComponentProps<typeof Feather>['name'];
  focused: boolean;
  onPress: () => void;
  onLongPress: () => void;
  styles: ReturnType<typeof createStyles>;
  activeColor: string;
  inactiveColor: string;
}

/**
 * Bitta tab: ikonka yuqorida, matn ostida, eng pastda faol ko'rsatkich nuqtasi.
 *
 * Nuqta joyi DOIM band (nofaolda shaffof) — aks holda tab almashganda
 * ikonka va matn bir necha piksel sakrardi.
 */
const TabItem: React.FC<TabItemProps> = ({
  label,
  iconName,
  focused,
  onPress,
  onLongPress,
  styles,
  activeColor,
  inactiveColor,
}) => {
  const indicator = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(indicator, {
      toValue: focused ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: USE_NATIVE_DRIVER,
    }).start();
  }, [focused, indicator]);

  const color = focused ? activeColor : inactiveColor;

  return (
    <Pressable
      style={styles.item}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Feather name={iconName} size={ICON_SIZE} color={color} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {label}
      </Text>
      <Animated.View
        style={[
          styles.dot,
          {
            backgroundColor: activeColor,
            opacity: indicator,
            transform: [{ scale: indicator }],
          },
        ]}
      />
    </Pressable>
  );
};

/**
 * Maxsus tab bar.
 *
 * Standart `tabBarIcon` bilan bo'lmasdi: faol ko'rsatkich nuqtasi MATN
 * OSTIDA turishi kerak, navigator esa faqat ikonka joyini beradi (matn
 * doim eng oxirida chiziladi).
 */
const AppTabBar: React.FC<BottomTabBarProps & { labelOf: (routeName: string) => string }> = ({
  state,
  navigation,
  labelOf,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        // Gesture/navigatsiya paneliga yopishib qolmasligi uchun pastki inset.
        { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        return (
          <TabItem
            key={route.key}
            label={labelOf(route.name)}
            iconName={TAB_ICONS[route.name] ?? 'circle'}
            focused={focused}
            onPress={onPress}
            onLongPress={onLongPress}
            styles={styles}
            activeColor={colors.primary}
            inactiveColor={colors.textSecondary}
          />
        );
      })}
    </View>
  );
};

const BottomTabNavigator: React.FC = () => {
  const { t } = useI18n();
  // Gap to'yona — SHAXSIY bo'lim: odamlar o'rtasidagi oldi-berdi daftari.
  // Biznes hisobiga o'tilganda tab umuman ko'rinmaydi (backend ham
  // biznes konteksti bilan kelgan so'rovni rad etadi).
  const { workspace } = useContext(WorkspaceContext);
  const gapAvailable = workspace.mode !== 'business';

  const tabLabel = (routeName: string) => {
    if (routeName === ROUTES.DEBTS) return t('tab.debts');
    if (routeName === ROUTES.GAP) return t('tab.gap');
    if (routeName === ROUTES.EXPENSES) return t('tab.expenses');
    if (routeName === ROUTES.PROFILE) return t('tab.profile');
    return routeName;
  };

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} labelOf={tabLabel} />}
    >
      <Tab.Screen name={ROUTES.DEBTS} component={DebtsStack} />
      {gapAvailable ? <Tab.Screen name={ROUTES.GAP} component={GapStack} /> : null}
      <Tab.Screen name={ROUTES.EXPENSES} component={ExpensesStack} />
      <Tab.Screen name={ROUTES.PROFILE} component={ProfileStack} />
    </Tab.Navigator>
  );
};

const createStyles = ({ colors, radius, typography, shadows }: ThemeValue) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      ...shadows.nav,
    },
    // `justifyContent` ATAYIN 'center' emas: markazlashtirilganda pastdagi
    // nuqta panel chetiga tegib qirqilardi. Yuqoridan aniq bo'shliq beriladi.
    item: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 9,
      gap: 3,
    },
    label: {
      ...typography.caption,
      fontSize: 12,
      lineHeight: 15,
      fontWeight: '600',
    },
    dot: {
      width: DOT_SIZE,
      height: DOT_SIZE,
      borderRadius: DOT_SIZE / 2,
      marginTop: 1,
    },
  });

export default BottomTabNavigator;
