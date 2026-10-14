import React, { useCallback, useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import EmptyState from '../../../shared/ui/EmptyState';
import SectionHeader from '../../../shared/ui/SectionHeader';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
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

type Row =
  | { kind: 'rental'; key: string; rental: RentalResponseDTO; isLast: boolean }
  | { kind: 'item'; key: string; item: RentalItemResponseDTO; isLast: boolean };

interface Section {
  key: string;
  title: string;
  icon: 'cube' | 'albums';
  /** Ombor sarlavhasida "Ijaraga berish" tugmasi turadi. */
  action?: boolean;
  data: Row[];
}

/**
 * Mijoz kartasidagi IJARA sahifasi.
 *
 * Oldi-berdi shu yerda bo'ladi — narxnoma sahifasi bilan bir xil joyda:
 * odam mijozni ochadi va o'sha yerdayoq "nima berdim, nima qaytmadi" ni
 * ko'rib, ombordan yangisini beradi. Ilgari buning uchun boshqa
 * ekrandan qidirish kerak edi.
 *
 * Tepada SHU ODAMDAGI buyumlar, pastda OMBOR. Tartib ataylab shunday:
 * yangi buyum berishdan oldin odatda "bunda nima bor edi" savoli
 * tug'iladi, va qaytmagan buyum ko'z oldida turishi kerak.
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

  const sections = useMemo<Section[]>(() => {
    const result: Section[] = [];

    if (rentals.length > 0) {
      result.push({
        key: 'rentals',
        title: clientMode ? t('rentals.atMe') : t('rentals.atThisClient'),
        icon: 'cube',
        data: rentals.map((rental, index) => ({
          kind: 'rental' as const,
          key: rental.id,
          rental,
          isLast: index === rentals.length - 1,
        })),
      });
    }

    /*
     * Ombor KATEGORIYA bo'yicha bo'linadi — Ijara bo'limidagi ro'yxat
     * bilan bir xil. Tekis ro'yxat o'nta buyumdan keyin o'qib bo'lmas
     * bo'lib qoladi: "stul qaysi biri edi" degan savol tug'iladi.
     *
     * "Ijaraga berish" tugmasi BIRINCHI ombor guruhining sarlavhasida:
     * u butun bo'limga tegishli va har guruhda takrorlanishi shovqin
     * bo'lardi.
     */
    const groups = groupRentalItems(items);
    groups.forEach((group, index) => {
      result.push({
        key: `stock:${group.category ?? ''}`,
        title: group.category ?? (clientMode ? t('rentals.theirStock') : t('rentals.noCategory')),
        icon: 'albums',
        action: allowWrite && index === 0,
        data: group.items.map((item, itemIndex) => ({
          kind: 'item' as const,
          key: item.id,
          item,
          isLast: itemIndex === group.items.length - 1,
        })),
      });
    });

    // Ombor umuman bo'sh bo'lsa ham bitta sarlavha kerak: tugma va
    // "buyum yo'q" izohi o'sha yerda chiqadi.
    if (groups.length === 0) {
      result.push({
        key: 'stock',
        title: t('rentals.tabStock'),
        icon: 'albums',
        action: allowWrite,
        data: [],
      });
    }

    return result;
  }, [rentals, items, allowWrite, clientMode, t]);

  const renderItem = useCallback(
    ({ item: row }: { item: Row }) => (
      <View style={styles.rowSlice}>
        {row.kind === 'rental' ? (
          <RentalRow item={row.rental} isLast={row.isLast} showClient={false} onPress={onOpenRental} />
        ) : (
          <RentalItemRow
            item={row.item}
            isLast={row.isLast}
            // Mijoz rejimida yozish huquqi biznesga emas, o'ziga tegishli:
            // u do'kondan olish uchun so'rov yuboradi, ombor esa
            // tasdiqlanmaguncha o'zgarmaydi.
            onPress={clientMode || allowWrite ? onGiveOut : undefined}
          />
        )}
      </View>
    ),
    [styles, onOpenRental, onGiveOut, allowWrite, clientMode],
  );

  if (rentalsQuery.isLoading || itemsQuery.isLoading) {
    return (
      <NestedGlass>
        <SkeletonContactList count={4} />
      </NestedGlass>
    );
  }

  // Ombor bo'sh bo'lsa ijara berib ham bo'lmaydi — yagona ma'noli amal
  // buyum qo'shish, shuning uchun ro'yxat o'rniga o'sha taklif chiqadi.
  if (items.length === 0 && rentals.length === 0) {
    return (
      <NestedGlass>
        {/* Matn KIMGA ko'rinayotganiga qarab: egasiga "buyumlaringizni
            kiriting", mijozga esa "bu do'konda hozircha buyum yo'q" —
            mijoz u yerga buyum qo'sha olmaydi va unga ko'rsatma berish
            chalkashlik bo'lardi. */}
        <EmptyState
          icon="cube-outline"
          title={clientMode ? t('rentals.theirStock') : t('rentals.stockEmptyTitle')}
          description={clientMode ? t('rentals.theirStockEmpty') : t('rentals.stockEmptyHint')}
          actionLabel={!clientMode && allowWrite && onAddItem ? t('rentals.addItem') : undefined}
          actionIcon="add"
          onAction={!clientMode && allowWrite ? onAddItem : undefined}
        />
      </NestedGlass>
    );
  }

  return (
    <NestedGlass>
      <SectionList
        sections={sections}
        keyExtractor={(row) => row.key}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => (
          <SectionHeader
            icon={(section as Section).icon}
            iconBadge={false}
            title={(section as Section).title}
            actionLabel={
              (section as Section).action
                ? clientMode
                  ? undefined
                  : t('rentals.createSubmit')
                : undefined
            }
            actionIcon={(section as Section).action && !clientMode ? 'add' : undefined}
            actionVariant="solid"
            onAction={(section as Section).action && !clientMode ? () => onGiveOut(null) : undefined}
          />
        )}
        renderSectionFooter={({ section }) =>
          (section as Section).data.length === 0 ? (
            <Text style={styles.emptyNote}>{t('rentals.stockEmptyShort')}</Text>
          ) : null
        }
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listCard}
        showsVerticalScrollIndicator={false}
      />
    </NestedGlass>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    listCard: {
      paddingBottom: spacing.md,
    },
    // Qatorlar karta sirtida: ro'yxat tugagan joyda karta ham tugaydi.
    rowSlice: {
      backgroundColor: glass.surface.backgroundColor,
      marginHorizontal: spacing.md,
    },
    emptyNote: {
      ...typography.caption,
      fontSize: 12,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      marginHorizontal: spacing.md,
      padding: spacing.sm,
    },
  });

export default ClientRentalPane;
