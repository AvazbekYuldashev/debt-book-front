import React, { useCallback, useMemo } from 'react';
import { FlatList, SectionList, StyleSheet, View } from 'react-native';
import EmptyState from '../../../shared/ui/EmptyState';
import SectionHeader from '../../../shared/ui/SectionHeader';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import SwipePager, { type SwipePage } from '../../../shared/ui/SwipePager';
import { NestedGlass, useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import RentalRow from './RentalRow';
import RentalItemRow from './RentalItemRow';
import {
  useBusinessRentalItems,
  useMyRentals,
  useRentalItems,
  useRentalsWithBusiness,
} from '../hooks/useRentals';
import { groupRentalItems } from '../model/rentalStock';
import type { RentalResponseDTO } from '../types/rental';
import type { RentalItemResponseDTO } from '../types/rentalItem';

interface ClientRentalPaneProps {
  clientId: string;
  /** Sahifa ko'rilgunicha so'rov yuborilmaydi — katalog sahifasi bilan bir xil qoida. */
  active: boolean;
  allowWrite: boolean;
  /** Ombordan buyum tanlandi — ijara formasi shu buyum bilan ochiladi. */
  onGiveOut: (item: RentalItemResponseDTO | null) => void;
  /** Mijozdagi buyum qatori bosildi — ijara kartasi ochiladi. */
  onOpenRental: (rental: RentalResponseDTO) => void;
  /** Omborda buyum yo'q — ombor bo'limiga o'tib, qo'shish formasi ochiladi. */
  onAddItem?: () => void;
  /**
   * MIJOZ REJIMI: qarshi tomon biznes va ombor UNIKI.
   *
   * Berilsa sahifa teskari tomondan ko'rinadi — "ularning ombori" va
   * "mendagi buyumlar", amal esa berish emas, OLISH bo'ladi. Yozuvni
   * baribir do'kon tasdiqlaydi: ombor birovning mulki.
   */
  ownerBusinessId?: string | null;
}

/** Ombor sahifasidagi kategoriya bo'limi. */
interface StockSection {
  key: string;
  title: string;
  /** Birinchi bo'lim sarlavhasida "Ijaraga berish" tugmasi turadi. */
  action: boolean;
  data: { item: RentalItemResponseDTO; isLast: boolean }[];
}

/**
 * Mijoz kartasidagi IJARA sahifasi — ikkita surilib o'tiladigan sahifa.
 *
 * BIRINCHI: shu odamdagi buyumlar. IKKINCHI: ombor.
 *
 * Ilgari ikkalasi bitta uzun ro'yxatda, biri ikkinchisining ostida
 * turardi: ombordagi buyumni ko'rish uchun mijozdagi hamma yozuvdan
 * o'tib tushish kerak edi va "qaysi ro'yxatga qarayapman" degan savol
 * doim tug'ilardi. Endi ikkisi teng huquqli sahifa, tepadagi tugmalar
 * esa ayni paytda "qayerdaman" ko'rsatkichi.
 *
 * Tartib ataylab shunday: yangi buyum berishdan oldin odatda "bunda
 * nima bor edi" savoli tug'iladi, va qaytmagan buyum birinchi ko'zga
 * tashlanishi kerak.
 *
 * Ombor qatoriga bosilsa ijara formasi O'SHA buyum bilan ochiladi —
 * ro'yxatdan qayta qidirish shart emas. Sarlavhadagi tugma esa bo'sh
 * forma ochadi: bir mijozga bir nechta buyum birdaniga beriladi.
 */
const ClientRentalPane: React.FC<ClientRentalPaneProps> = ({
  clientId,
  active,
  allowWrite,
  onGiveOut,
  onOpenRental,
  onAddItem,
  ownerBusinessId,
}) => {
  const theme = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Mijoz rejimida ro'yxatlar BOSHQA endpointlardan keladi: ombor
  // do'konniki, ijaralar esa "men mijoz bo'lgan" yozuvlar.
  const clientMode = Boolean(ownerBusinessId);
  const filter = useMemo(() => ({ clientId }), [clientId]);

  const ownRentals = useMyRentals(filter, { enabled: active && !clientMode });
  const theirRentals = useRentalsWithBusiness(ownerBusinessId ?? '', {
    enabled: active && clientMode,
  });
  const ownItems = useRentalItems({ enabled: active && !clientMode });
  const theirItems = useBusinessRentalItems(ownerBusinessId ?? '', {
    enabled: active && clientMode,
  });

  const rentalsQuery = clientMode ? theirRentals : ownRentals;
  const itemsQuery = clientMode ? theirItems : ownItems;

  const rentals = useMemo(() => {
    const data = rentalsQuery.data;
    if (!data) return [];
    // Mijoz rejimida endpoint massiv, egasinikida sahifa qaytaradi.
    return Array.isArray(data) ? data : data.content ?? [];
  }, [rentalsQuery.data]);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  /*
   * Ombor KATEGORIYA bo'yicha bo'linadi — Ijara bo'limidagi ro'yxat
   * bilan bir xil. Tekis ro'yxat o'nta buyumdan keyin o'qib bo'lmas
   * bo'lib qoladi: "stul qaysi biri edi" degan savol tug'iladi.
   */
  const stockSections = useMemo<StockSection[]>(
    () =>
      groupRentalItems(items).map((group, index) => ({
        key: `stock:${group.category ?? ''}`,
        title: group.category ?? t('rentals.noCategory'),
        // Tugma faqat BIRINCHI sarlavhada: u butun bo'limga tegishli va
        // har guruhda takrorlanishi shovqin bo'lardi.
        action: allowWrite && !clientMode && index === 0,
        data: group.items.map((item, itemIndex) => ({
          item,
          isLast: itemIndex === group.items.length - 1,
        })),
      })),
    [items, allowWrite, clientMode, t],
  );

  const loading = rentalsQuery.isLoading || itemsQuery.isLoading;

  // ---------------------------------------------------------------- sahifalar

  const renderRentals = useCallback(() => {
    if (loading) return <SkeletonContactList count={4} />;
    if (rentals.length === 0) {
      return (
        <EmptyState
          icon="cube-outline"
          title={clientMode ? t('rentals.atMe') : t('rentals.atThisClient')}
          description={t('rentals.noRentalsHere')}
        />
      );
    }
    /*
     * Ro'yxat VIRTUALIZATSIYALANGAN va o'zi suriladi.
     *
     * Oddiy View bo'lsa: sahifa balandligi sahifalagich tomonidan
     * belgilangani uchun uzun ro'yxat pastdan KESILIB qolardi - tashqi
     * ScrollView gorizontal, ya'ni vertikal surilmaydi.
     */
    return (
      <FlatList
        data={rentals}
        keyExtractor={(rental) => rental.id}
        renderItem={({ item: rental, index }) => (
          <View style={styles.rowSlice}>
            <RentalRow
              item={rental}
              isLast={index === rentals.length - 1}
              showClient={false}
              onPress={onOpenRental}
            />
          </View>
        )}
        contentContainerStyle={styles.listCard}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [loading, rentals, clientMode, styles, onOpenRental, t]);

  const renderStock = useCallback(() => {
    if (loading) return <SkeletonContactList count={3} />;
    if (stockSections.length === 0) {
      /* Matn KIMGA ko'rinayotganiga qarab: egasiga "buyumlaringizni
         kiriting", mijozga esa "bu do'konda hozircha buyum yo'q" —
         mijoz u yerga buyum qo'sha olmaydi va unga ko'rsatma berish
         chalkashlik bo'lardi. */
      return (
        <EmptyState
          icon="albums-outline"
          title={clientMode ? t('rentals.theirStock') : t('rentals.stockEmptyTitle')}
          description={clientMode ? t('rentals.theirStockEmpty') : t('rentals.stockEmptyHint')}
          actionLabel={!clientMode && allowWrite && onAddItem ? t('rentals.addItem') : undefined}
          actionIcon="add"
          onAction={!clientMode && allowWrite ? onAddItem : undefined}
        />
      );
    }
    return (
      <SectionList
        sections={stockSections}
        keyExtractor={(row) => row.item.id}
        renderItem={({ item: row }) => (
          <View style={styles.rowSlice}>
            <RentalItemRow
              item={row.item}
              isLast={row.isLast}
              // Mijoz rejimida yozish huquqi biznesga emas, o'ziga tegishli:
              // u do'kondan olish uchun so'rov yuboradi, ombor esa
              // tasdiqlanmaguncha o'zgarmaydi.
              onPress={clientMode || allowWrite ? onGiveOut : undefined}
            />
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            icon="albums"
            iconBadge={false}
            title={(section as StockSection).title}
            actionLabel={(section as StockSection).action ? t('rentals.createSubmit') : undefined}
            actionIcon={(section as StockSection).action ? 'add' : undefined}
            actionVariant="solid"
            onAction={(section as StockSection).action ? () => onGiveOut(null) : undefined}
          />
        )}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listCard}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [loading, stockSections, clientMode, allowWrite, onAddItem, onGiveOut, styles, t]);

  /**
   * Sahifa nomlari TOMONGA qarab: mijozga "Mendagi buyumlar" va
   * "Ularning ombori", ombor egasiga esa "Shu mijozda" va "Ombor".
   */
  const pages = useMemo<SwipePage[]>(
    () => [
      {
        key: 'mine',
        label: clientMode ? t('rentals.atMe') : t('rentals.atThisClient'),
        icon: 'cube-outline',
        render: renderRentals,
      },
      {
        key: 'stock',
        label: clientMode ? t('rentals.theirStock') : t('rentals.tabStock'),
        icon: 'albums-outline',
        render: renderStock,
      },
    ],
    [clientMode, renderRentals, renderStock, t],
  );

  return (
    <NestedGlass>
      <SwipePager pages={pages} />
    </NestedGlass>
  );
};

const createStyles = ({ spacing, glass }: ThemeValue) =>
  StyleSheet.create({
    listCard: {
      paddingBottom: spacing.md,
    },
    // Qatorlar karta sirtida: ro'yxat tugagan joyda karta ham tugaydi.
    rowSlice: {
      backgroundColor: glass.surface.backgroundColor,
      marginHorizontal: spacing.md,
    },
  });

export default ClientRentalPane;
