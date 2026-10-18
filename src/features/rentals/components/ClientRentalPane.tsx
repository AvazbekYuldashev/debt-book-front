import React, { useCallback, useMemo } from 'react';
import { FlatList, SectionList, StyleSheet, Text, View } from 'react-native';
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
import { rentalStage } from '../model/rentalMath';
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
 * "IJARAGA BERISH" tugmasi BIRINCHI sahifada — ombor sahifasida emas.
 * Ombor bu yerda ma'lumotnoma: "menda nima bor, nechtasi bo'sh". Amal
 * esa shu odamga tegishli va uning yozuvlari yonida turishi kerak —
 * tugma ombor sarlavhasida turganda "qaysi buyumga bosyapman" degan
 * savol tug'ilardi, holbuki u bo'sh forma ochadi.
 *
 * Ombor qatoriga bosilsa ijara formasi baribir O'SHA buyum bilan
 * ochiladi — tez yo'l saqlanib qoldi.
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

  /**
   * Sahifa HOZIR turgan buyumlarni ko'rsatadi, tarixni emas.
   *
   * Sarlavhasi "Mendagi buyumlar" (yoki "Shu mijozda") — ya'ni savol
   * "ayni damda nima turibdi". Qaytgan ijara bu savolga javob emas:
   * ro'yxat o'sib boraverar va odam qaytargan narsasini har safar
   * ko'rib, "yana qaytarishim kerakmi" deb o'ylardi.
   *
   * Yozuv O'CHMAYDI — u Ijara bo'limidagi "Yopilgan" filtrida tarix
   * bo'lib qoladi.
   */
  const rentals = useMemo(() => {
    const data = rentalsQuery.data;
    if (!data) return [];
    // Mijoz rejimida endpoint massiv, egasinikida sahifa qaytaradi.
    const all = Array.isArray(data) ? data : data.content ?? [];
    return all.filter((rental) => rentalStage(rental) !== 'CLOSED');
  }, [rentalsQuery.data]);
  const items = useMemo(() => itemsQuery.data ?? [], [itemsQuery.data]);

  /*
   * Ombor KATEGORIYA bo'yicha bo'linadi — Ijara bo'limidagi ro'yxat
   * bilan bir xil. Tekis ro'yxat o'nta buyumdan keyin o'qib bo'lmas
   * bo'lib qoladi: "stul qaysi biri edi" degan savol tug'iladi.
   */
  const stockGroups = useMemo(() => groupRentalItems(items), [items]);

  const stockSections = useMemo<StockSection[]>(
    () =>
      stockGroups.map((group) => ({
        key: `stock:${group.category ?? ''}`,
        title: group.category ?? t('rentals.noCategory'),
        data: group.items.map((item, itemIndex) => ({
          item,
          isLast: itemIndex === group.items.length - 1,
        })),
      })),
    [stockGroups, t],
  );

  /**
   * Bitta guruh va u kategoriyasiz bo'lsa — sarlavha chizilmaydi.
   *
   * "Kategoriyasiz" degan yolg'iz sarlavha hech qanday ma'lumot bermaydi:
   * u faqat BOSHQA guruhlardan ajratish uchun kerak. Qoida Ijara
   * bo'limidagi ombor ro'yxati bilan bir xil.
   */
  const showStockHeaders = stockGroups.length > 1 || Boolean(stockGroups[0]?.category);

  /**
   * Amal tugmasi IKKALA tomonda ham bor — faqat nomi teskari.
   *
   * Egasi BERADI, mijoz esa OLADI. Ilgari tugma faqat egasida bor edi
   * va mijoz kartasi bo'sh ko'rinardi: ikki tomon bir xil sahifani
   * ochib, biri amalni topa olmasdi.
   */
  const canAct = clientMode || allowWrite;
  const actionLabel = clientMode ? t('rentals.takeFromStock') : t('rentals.createSubmit');

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
          // Bo'sh sahifada yagona ma'noli amal — shu.
          actionLabel={canAct ? actionLabel : undefined}
          actionIcon="add"
          onAction={canAct ? () => onGiveOut(null) : undefined}
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
      <View style={styles.page}>
        {/*
          Sarlavha KARTADAN TASHQARIDA turadi.
          Uning tabletkasi (`glass.surface`) fon rasmida o'qilishi uchun
          qo'yilgan va karta sirtida u ikkinchi, ortiqcha sirt bo'lib
          ko'rinardi - "karta ichida karta". Mahsulotlar va Tarix
          sahifalarida ham sarlavha kartadan tashqarida.
        */}
        {canAct ? (
          <SectionHeader
            icon="cube"
            iconBadge={false}
            title={clientMode ? t('rentals.atMe') : t('rentals.atThisClient')}
            actionLabel={actionLabel}
            actionIcon="add"
            actionVariant="solid"
            onAction={() => onGiveOut(null)}
          />
        ) : null}
        <FlatList
          data={rentals}
          keyExtractor={(rental) => rental.id}
          // Qator KARTA SIRTIDA: o'z foni va yon bo'shlig'i yo'q - aks
          // holda karta ichida ikkinchi karta bo'lib ko'rinardi.
          renderItem={({ item: rental, index }) => (
            <RentalRow
              item={rental}
              isLast={index === rentals.length - 1}
              showClient={false}
              onPress={onOpenRental}
            />
          )}
          contentContainerStyle={styles.listCard}
          showsVerticalScrollIndicator={false}
        />
      </View>
    );
  }, [loading, rentals, clientMode, canAct, actionLabel, styles, onGiveOut, onOpenRental, t]);

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
          <RentalItemRow
            item={row.item}
            isLast={row.isLast}
            // Mijoz rejimida yozish huquqi biznesga emas, o'ziga tegishli:
            // u do'kondan olish uchun so'rov yuboradi, ombor esa
            // tasdiqlanmaguncha o'zgarmaydi.
            onPress={clientMode || allowWrite ? onGiveOut : undefined}
          />
        )}
        /*
         * Kategoriya sarlavhasi KARTA ICHIDA, oddiy matn bo'lib turadi —
         * Mahsulotlar sahifasidagi aynan o'sha ko'rinish. Tabletkali
         * `SectionHeader` bu yerda kartaning o'z sirtida ikkinchi sirt
         * bo'lib ko'rinardi.
         *
         * Chiziq sarlavha USTIDA: u kategoriyalarni ajratadi, qatorlar
         * orasidagi ingichka chiziqlar esa kategoriya ichida qoladi.
         */
        renderSectionHeader={({ section }) => {
          if (!showStockHeaders) return null;
          const isFirst = stockSections[0]?.key === (section as StockSection).key;
          return (
            <View style={[styles.sectionHeader, !isFirst && styles.sectionDivider]}>
              <Text style={styles.sectionTitle}>{(section as StockSection).title}</Text>
              <Text style={styles.sectionCount}>{(section as StockSection).data.length}</Text>
            </View>
          );
        }}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listCard}
        showsVerticalScrollIndicator={false}
      />
    );
  }, [loading, stockSections, showStockHeaders, clientMode, allowWrite, onAddItem, onGiveOut, styles, t]);

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

// Karta ko'rinishi Mahsulotlar va Tarix sahifalari bilan AYNAN bir xil:
// uchalasi bitta sahifalagichda yonma-yon turadi va biri boshqasiga
// o'xshamasa, surilish "sakrash" bo'lib ko'rinardi.
const createStyles = ({ colors, spacing, glass, radius, shadows, typography }: ThemeValue) =>
  StyleSheet.create({
    // Sarlavha karta USTIDA turadi, shuning uchun sahifa ustun bo'ladi.
    page: {
      flex: 1,
    },
    listCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...shadows.card,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: spacing.xxs,
    },
    // Kategoriyalar orasidagi ajratgich — qator chiziqlaridan QALINROQ,
    // shunda "bo'lim tugadi" va "keyingi buyum" farqlanadi.
    sectionDivider: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: spacing.sm,
      paddingTop: spacing.md,
    },
    sectionTitle: {
      ...typography.caption,
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: colors.textSecondary,
      flexShrink: 1,
    },
    sectionCount: {
      ...typography.caption,
      fontSize: 12,
      fontWeight: '600',
      color: colors.textSecondary,
    },
  });

export default ClientRentalPane;
