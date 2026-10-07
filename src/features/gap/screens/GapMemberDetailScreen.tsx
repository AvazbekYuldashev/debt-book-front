import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import { FlatList, type ListRenderItem, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SkeletonCardList } from '../../../shared/ui/SkeletonShimmer';
import { NestedGlass, useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import { useI18n } from '../../../shared/i18n';
import type { GapScreenProps } from '../../../app/navigation/types';
import type { ROUTES } from '../../../app/navigation/routes';
import { useConfirmGapTransfer, useCreateGapTransfer, useGapMemberDetail } from '../hooks/useGap';
import Button from '../../../shared/ui/Button';
import { VOICE_BUTTON_CLEARANCE } from '../../../shared/ui/fabLayout';
import StatusBanner from '../../../shared/ui/StatusBanner';
import SurfaceLabel from '../../../shared/ui/SurfaceLabel';
import GapTransferRow from '../components/GapTransferRow';
import GapMemberBalanceHeader from '../components/GapMemberBalanceHeader';
import GapTransferFormModal from '../components/GapTransferFormModal';
import GapTransferDetailModal from '../components/GapTransferDetailModal';
import { GapTransferDTO, GapTransferDirection, GapUnit } from '../types/gap';
import type { GapVoicePrefill } from '../../voice/model/resolveGapCommand';
import { clearPendingIntent } from '../../voice/model/pendingVoice';

/** Ro'yxat qatori: yozuv va uning men uchun yo'nalishi. */
interface LedgerItem {
  transfer: GapTransferDTO;
  direction: 'in' | 'out';
}

/**
 * Bitta a'zoning hisob-kitobi — Qarzlar bo'limidagi mijoz ekrani bilan bir
 * xil tuzilishda: tepada balans kartasi, o'rtada BITTA tekis tarix, pastda
 * ikkita to'la enli tugma.
 *
 * Tarix bo'limlarga bo'linmaydi: oldi ham, berdi ham bitta ro'yxatda, yangisi
 * birinchi. Yo'nalishni ikonka va rang bildiradi — undan olganim yashil,
 * unga berganim qizil. Vaqt tartibida o'qilgani hisobni tushunishni
 * osonlashtiradi: ikki ustunni solishtirib o'tirish shart emas.
 *
 * Ro'yxatda FAQAT men shu odam bilan qilgan oldi-berdi turadi — uning
 * boshqalar bilan hisobi menga aloqador emas.
 *
 * "Berdim" va "Oldim" istalgan paytda bosiladi: navbat ham, davr ham yo'q.
 * Yozuvni kiritgan odam uni o'zi tasdiqlamaydi — tasdiq qarama-qarshi
 * tomonda qoladi.
 *
 * Qatorga bosilsa tafsilot modali ochiladi va tasdiq ham o'sha yerdan
 * beriladi. Ilgari bosishning o'zi yozuvni tasdiqlab yuborardi: tasodifiy
 * tegib ketish ortga qaytmas edi va telefon, to'liq izoh kabi ma'lumotni
 * ko'rishning iloji yo'q edi.
 */
const GapMemberDetailScreen: React.FC<GapScreenProps<typeof ROUTES.GAP_MEMBER>> = ({
  navigation,
  route,
}) => {
  const theme = useAppTheme();
  const { colors } = theme;
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { memberId, groupId, memberName, unitCode, unitLabel, unitType } = route.params;
  const unit: GapUnit = useMemo(
    () => ({ code: unitCode, label: unitLabel, type: unitType }),
    [unitCode, unitLabel, unitType]
  );

  const detailQuery = useGapMemberDetail(memberId);
  const detail = detailQuery.data;

  const createMutation = useCreateGapTransfer(groupId);
  const confirmMutation = useConfirmGapTransfer();

  const [direction, setDirection] = useState<GapTransferDirection | null>(null);

  /**
   * Ovozdan kelgan qiymatlar.
   *
   * Yo'nalish aytilgan bo'lsa oyna DARHOL ochiladi. Aytilmagan bo'lsa
   * qiymatlar shu yerda kutadi: ekrandagi "Oldim" va "Berdim" tugmalari
   * tanlovni odamga qoldiradi va summa o'sha tugma bosilgach formaga
   * tushadi. Taxmin qilib bittasini tanlash pulni teskari tomonga
   * yozib yuborardi.
   */
  const [voicePrefill, setVoicePrefill] = useState<GapVoicePrefill | undefined>();

  const voiceParam = route.params.voice;
  useEffect(() => {
    if (!voiceParam) return;
    // Parametr DARHOL tozalanadi: aks holda orqaga qaytib kirilganda
    // oyna o'z-o'zidan yana ochilaverardi.
    navigation.setParams({ voice: undefined });

    setVoicePrefill(voiceParam);
    if (voiceParam.direction) {
      setDirection(voiceParam.direction === 'GAVE' ? 'GIVE' : 'TAKE');
    }
  }, [voiceParam, navigation]);
  /** Tafsilot modalida ochilgan yozuv. Nusxa emas, faqat ID saqlanadi. */
  const [selectedId, setSelectedId] = useState<string | null>(null);

  /** O'z hisobimda oldi-berdi tugmalari ma'nosiz — pul o'zimda qoladi. */
  const isSelf = detail?.me ?? false;

  const submitTransfer = useCallback(
    (amount: number, note: string | null, chosen: GapUnit, calcNote: string | null) => {
      createMutation.mutate(
        {
          counterpartyMemberId: memberId,
          amount,
          note: note ?? undefined,
          calcNote: calcNote ?? undefined,
          direction: direction ?? 'GIVE',
          unitType: chosen.type,
          unitCode: chosen.code,
          unitLabel: chosen.label,
        },
        {
          onSuccess: () => {
            setDirection(null);
            setVoicePrefill(undefined);
            // Yozuv saqlandi - saqlangan gap endi kerak emas.
            void clearPendingIntent();
          },
        }
      );
    },
    [createMutation, memberId, direction]
  );

  /**
   * Tasdiq tafsilot modalidan beriladi. Muvaffaqiyatli bo'lsa modal yopiladi:
   * ochiq qolsa ekrandagi yozuv eskirgan holatni ko'rsatib turardi.
   */
  const confirmTransfer = useCallback(
    (item: GapTransferDTO) =>
      confirmMutation.mutate(item.transferId, { onSuccess: () => setSelectedId(null) }),
    [confirmMutation]
  );

  /**
   * Ikki oqim bitta ro'yxatga qo'shilib, sana bo'yicha teskari saralanadi —
   * hisob-kitobni vaqt tartibida o'qish uchun shu tabiiy.
   */
  const items = useMemo<LedgerItem[]>(() => {
    if (!detail) return [];
    const merged: LedgerItem[] = [
      ...detail.incoming.map((transfer) => ({ transfer, direction: 'in' as const })),
      ...detail.outgoing.map((transfer) => ({ transfer, direction: 'out' as const })),
    ];
    return merged.sort((a, b) => {
      const left = a.transfer.date ? Date.parse(a.transfer.date) : 0;
      const right = b.transfer.date ? Date.parse(b.transfer.date) : 0;
      return right - left;
    });
  }, [detail]);

  /**
   * Modalga ko'rsatiladigan yozuv ro'yxatdan TOPIB olinadi, nusxasi
   * saqlanmaydi: ro'yxat yangilansa (masalan tortib yangilash) modal ham
   * yangi ma'lumotni ko'rsatadi, yozuv yo'qolsa o'zi yopiladi.
   *
   * Yo'nalish ham shu yerdan keladi — rang va "Oldim / Berdim" yozuvi
   * qator bilan bir xil bo'lishi uchun.
   */
  const selected = useMemo(
    () => items.find((it) => it.transfer.transferId === selectedId) ?? null,
    [items, selectedId]
  );

  const openDetail = useCallback((transfer: GapTransferDTO) => setSelectedId(transfer.transferId), []);

  const renderItem: ListRenderItem<LedgerItem> = useCallback(
    ({ item, index }) => (
      <GapTransferRow
        item={item.transfer}
        direction={item.direction}
        isLast={index === items.length - 1}
        onPress={openDetail}
      />
    ),
    [items.length, openDetail]
  );

  const keyExtractor = useCallback((item: LedgerItem) => item.transfer.transferId, []);


  // Tasdiq xatosi tafsilot modalining o'zida chiqadi — bu yerda faqat yangi
  // yozuv qo'shishdagi xato qoladi, aks holda bitta xabar ikki joyda turardi.
  const actionError = (createMutation.error as Error | null)?.message ?? null;

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — barcha ekranlarda bir xil "imzo" qatlami. */}
      <AmbientBackground />
      <GapMemberBalanceHeader
        memberName={detail?.memberName ?? memberName}
        memberPhone={detail?.memberPhone ?? null}
        unit={unit}
        received={detail?.totalReceived ?? []}
        given={detail?.totalGiven ?? []}
        onBack={navigation.goBack}
      />

      <NestedGlass>
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listCard}
          data={detailQuery.isLoading ? [] : items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          showsVerticalScrollIndicator={false}
          initialNumToRender={14}
          windowSize={11}
          refreshControl={
            <RefreshControl
              refreshing={detailQuery.isFetching && !detailQuery.isLoading}
              onRefresh={detailQuery.refetch}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            detailQuery.isLoading ? (
              <SkeletonCardList count={4} containerStyle={styles.skeleton} />
            ) : (
              <Text style={styles.emptyText}>{t('gap.noTransfers')}</Text>
            )
          }
        />
      </NestedGlass>

      {/* Xato fonda emas, o'z sirtida: to'q fon rasmida ham o'qiladi. */}
      {actionError ? <StatusBanner tone="error" message={actionError} /> : null}

      {/* Qarzlar bo'limidagi kabi: ikkita to'la enli tugma — "Oldim" qizil,
          "Berdim" yashil. O'z hisobimda amal yo'q. */}
      {isSelf ? (
        // Qarzlardagi "faqat ko'rish" izohi bilan AYNAN bir xil: tugmalar
        // o'rnida turgan izoh ikkala bo'limda bitta komponent.
        <SurfaceLabel multiline style={styles.actionHint} textStyle={styles.actionHintText}>
          {items.some((item) => item.transfer.canConfirm)
            ? t('gap.tapToConfirm')
            : t('gap.selfLedger')}
        </SurfaceLabel>
      ) : (
        <View style={styles.actionBar}>
          <Button
            title={t('gap.take')}
            onPress={() => setDirection('TAKE')}
            style={[styles.actionBtn, styles.takeBtn]}
          />
          <Button
            title={t('gap.give')}
            onPress={() => setDirection('GIVE')}
            style={[styles.actionBtn, styles.giveBtn]}
          />
        </View>
      )}

      <GapTransferFormModal
        visible={direction != null}
        direction={direction ?? 'GIVE'}
        memberName={memberName}
        unit={unit}
        loading={createMutation.isPending}
        error={(createMutation.error as Error | null)?.message ?? null}
        prefill={voicePrefill}
        onClose={() => {
          setDirection(null);
          setVoicePrefill(undefined);
          // Bekor qilish "kerak emas" degani.
          void clearPendingIntent();
        }}
        onSubmit={submitTransfer}
      />

      <GapTransferDetailModal
        transfer={selected?.transfer ?? null}
        direction={selected?.direction ?? 'in'}
        confirming={confirmMutation.isPending}
        error={(confirmMutation.error as Error | null)?.message ?? null}
        onConfirm={confirmTransfer}
        onClose={() => {
          setSelectedId(null);
          confirmMutation.reset();
        }}
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, glass }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    list: {
      flex: 1,
    },
    listCard: {
      ...glass.pane,
      borderRadius: radius.xl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },
    skeleton: {
      padding: spacing.md,
    },
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: spacing.lg,
    },
    actionBar: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      // Ovoz doirasi paneldan yuqoriga chiqadi - tugmalar undan yuqorida.
      paddingBottom: VOICE_BUTTON_CLEARANCE,
      // Fon va yuqori chegara YO'Q — Qarzlar bo'limidagi bilan bir xil.
      // Tekis fon berilganda tugmalar ostida shaffofmas oq chiziq qolardi.
    },
    actionBtn: {
      flex: 1,
    },
    /**
     * MA'NO RANGI, brend emas.
     *
     * "Oldim" qarzni, "Berdim" haqni bildiradi va ro'yxatdagi qizil/
     * yashil summalar bilan bir tilda bo'lishi kerak. Ilgari "Berdim"
     * brend rangidan olardi: foydalanuvchi ilova rangini binafsha
     * qilsa, tugma ham binafsha bo'lib, haq bilan bog'liqligi
     * yo'qolardi.
     */
    takeBtn: {
      backgroundColor: colors.negative,
      borderWidth: 0,
    },
    giveBtn: {
      backgroundColor: colors.positive,
      borderWidth: 0,
    },
    /**
     * O'z hisobimdagi izoh. Sirt SurfaceLabel'dan, bu yerda faqat
     * joylashuv - o'rtada, ovoz doirasidan yuqorida.
     *
     * Ilgari `glass.muted` li 11px matn edi va ekran enida to'g'ridan-
     * to'g'ri fon rasmida turardi: `muted` muzlatishsiz (faqat muzli sirt
     * ICHIDA yashaydi) - rasm ustida matn ortidan yoriq va nuqtalar
     * ko'rinardi, 11px esa o'qib bo'lmasdi.
     */
    actionHint: {
      alignSelf: 'center',
      marginTop: spacing.md,
      marginBottom: VOICE_BUTTON_CLEARANCE,
      marginHorizontal: spacing.md,
    },
    actionHintText: {
      ...typography.bodySmall,
      textAlign: 'center',
      color: colors.textSecondary,
    },
  });

export default GapMemberDetailScreen;
