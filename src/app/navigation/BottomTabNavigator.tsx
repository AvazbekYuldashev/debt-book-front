import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  BottomTabBarHeightCallbackContext,
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProductsStack from './ProductsStack';
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
import { useBackground } from '../../shared/theme/BackgroundProvider';
import { photoBlur } from '../../shared/theme/backgroundSettings';
import { buildAttachUrl } from '../../shared/lib/attachUrl';
import { BackgroundPhoto } from '../../shared/ui/AmbientBackground';
import VoiceTabButton from '../../features/voice/components/VoiceTabButton';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TAB_ICONS: Record<string, React.ComponentProps<typeof Feather>['name']> = {
  [ROUTES.PRODUCTS]: 'tag',
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
 *
 * Fon rasmi qo'yilgan bo'lsa panel ham rasm USTIDA turadi: sahnalardagi
 * rasm panel tepasida kesiladi, shuning uchun panel rasmning o'zi yopib
 * turgan bo'lagini o'zi chizadi va ustiga kartalar bilan bir xil shisha
 * (glass.flush) qo'yadi. Aks holda shisha tekis rangni muzlatardi:
 * "Shaffoflik" panelga ta'sir qilmas, rasm panel chizig'ida keskin uzilib,
 * ovoz tugmasi ikki xil fon ustida qolardi.
 */
export const AppTabBar: React.FC<BottomTabBarProps & { labelOf: (routeName: string) => string }> = ({
  state,
  navigation,
  labelOf,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const { imageId, fit, dim } = useBackground();
  const hasPhoto = imageId.length > 0;

  // Maxsus tabBar balandligini navigatorga O'ZI aytishi shart: aks holda
  // sahnalar standart (~49px) qiymatni oladi va rasm qutisini panel
  // ostiga noto'g'ri uzaytiradi - panel bo'lagi bilan kesim mos kelmaydi.
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  // Panel pastki chetidan ramka tepasigacha: sahnalardagi rasm qutisi
  // (tepaga bog'langan, panel bilan birga) aynan shu balandlikda.
  const [frameHeight, setFrameHeight] = useState(0);
  const handleLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { y, height } = event.nativeEvent.layout;
      reportHeight?.(height);
      setFrameHeight(y + height);
    },
    [reportHeight],
  );

  return (
    <View
      style={[
        styles.bar,
        hasPhoto ? null : styles.barSurface,
        // Gesture/navigatsiya paneliga yopishib qolmasligi uchun pastki inset.
        { height: BAR_HEIGHT + insets.bottom, paddingBottom: insets.bottom },
      ]}
      onLayout={handleLayout}
    >
      {hasPhoto ? (
        <>
          {/* Rasmning panel ostidagi bo'lagi: quti pastga bog'langan va
              ramka balandligida - sahnadagi quti bilan AYNAN bir xil, shu
              sababli rasm chegarada uzilmay davom etadi. */}
          <View style={styles.photoSlice} pointerEvents="none">
            {frameHeight > 0 ? (
              <BackgroundPhoto
                uri={buildAttachUrl(imageId)}
                fit={fit}
                blur={photoBlur(dim)}
                style={[styles.photoBox, { height: frameHeight }]}
              />
            ) : null}
          </View>
          {/* Shisha alohida qatlam: backdrop-filter faqat element ORTIDAGINI
              muzlatadi, o'z bolalarini emas - ildizga qo'yilsa rasm bo'lagini
              ko'rmasdi. "Yo'q" da fon to'liq, rasm yopiladi. */}
          <View style={styles.photoGlass} pointerEvents="none" />
        </>
      ) : null}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        // Ovoz tugmasi O'RTADA: tablar soni juft (4 ta), shuning uchun
        // u ikkinchisidan keyin qo'yiladi va panel simmetrik qoladi.
        const middle = index === Math.floor(state.routes.length / 2);

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
          <React.Fragment key={route.key}>
            {middle ? (
              <View style={styles.voiceSlot}>
                <VoiceTabButton />
              </View>
            ) : null}
            <TabItem
              label={labelOf(route.name)}
              iconName={TAB_ICONS[route.name] ?? 'circle'}
              focused={focused}
              onPress={onPress}
              onLongPress={onLongPress}
              styles={styles}
              activeColor={colors.primary}
              inactiveColor={colors.textSecondary}
            />
          </React.Fragment>
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
  //
  // Mahsulotlar (narxnoma) — buning AKSI: faqat biznes bo'limi. Shu sababli
  // panelda har doim 4 ta tab turadi, shaxsiyda 2-o'rinda Gap, biznesda
  // 1-o'rinda Mahsulotlar.
  const { workspace } = useContext(WorkspaceContext);
  const gapAvailable = workspace.mode !== 'business';
  const productsAvailable = workspace.mode === 'business';

  const tabLabel = (routeName: string) => {
    if (routeName === ROUTES.PRODUCTS) return t('tab.products');
    if (routeName === ROUTES.DEBTS) return t('tab.debts');
    if (routeName === ROUTES.GAP) return t('tab.gap');
    if (routeName === ROUTES.EXPENSES) return t('tab.expenses');
    if (routeName === ROUTES.PROFILE) return t('tab.profile');
    return routeName;
  };

  return (
    <Tab.Navigator
      // Mahsulotlar panelda birinchi turadi, lekin ilova baribir Qarzlar
      // bilan ochiladi: bosh ekran o'zgarmasligi kerak.
      initialRouteName={ROUTES.DEBTS}
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <AppTabBar {...props} labelOf={tabLabel} />}
    >
      {productsAvailable ? <Tab.Screen name={ROUTES.PRODUCTS} component={ProductsStack} /> : null}
      <Tab.Screen name={ROUTES.DEBTS} component={DebtsStack} />
      {gapAvailable ? <Tab.Screen name={ROUTES.GAP} component={GapStack} /> : null}
      <Tab.Screen name={ROUTES.EXPENSES} component={ExpensesStack} />
      <Tab.Screen name={ROUTES.PROFILE} component={ProfileStack} />
    </Tab.Navigator>
  );
};

const createStyles = ({ colors, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    // Panel chetdan chetga TEKIS: yuqori burchaklar yumaloqlansa, kesilgan
    // uchburchaklarda panel ortidagi tekis navigator foni ochilib qolardi
    // (sahna foni panel tepasida tugaydi).
    //
    // Tepadagi ingichka chiziq SHART: "Shaffoflik: Yo'q" da kartalar ham,
    // panel ham to'liq sirt va bir xil rangda - chiziqsiz oxirgi karta
    // panelga qo'shilib ketardi, yuqoriga tushadigan soya esa to'q fonda
    // ko'rinmaydi. glass.flush'dagi "chegarasiz" sababi (yumaloq chetda
    // siniq) bu yerga tegishli emas - chet tekis.
    //
    // Sirt (glass.flush) rasmsiz holatda shu yerning o'zida; rasm bor
    // bo'lsa u alohida qatlamda (photoGlass), chunki ildizdagi
    // backdrop-filter o'z bolasi bo'lgan rasm bo'lagini muzlatmaydi.
    bar: {
      flexDirection: 'row',
      alignItems: 'stretch',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.glassBorder,
      ...shadows.nav,
    },
    barSurface: {
      ...glass.flush,
    },
    // Rasm bo'lagi ortida tema foni: "Sig'dirish" da rasm chetlaridagi bo'sh
    // joy sahnadagidek bo'yaladi.
    photoSlice: {
      ...StyleSheet.absoluteFill,
      overflow: 'hidden',
      backgroundColor: colors.background,
    },
    photoBox: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
    },
    photoGlass: {
      ...StyleSheet.absoluteFill,
      ...glass.flush,
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
    /**
     * Ovoz tugmasining o'rni.
     *
     * Kengligi QAT'IY, tablar kabi `flex: 1` emas: tugma doira va u
     * matnli tabdan tor. Teng bo'lingan joy unga ortiqcha bo'shliq
     * berib, qo'shni tablarni chetga siqib qo'yardi.
     */
    voiceSlot: {
      width: 76,
      alignItems: 'center',
    },
  });

export default BottomTabNavigator;
