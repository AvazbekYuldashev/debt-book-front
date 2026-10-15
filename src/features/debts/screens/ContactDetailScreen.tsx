import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, type ListRenderItem, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MoneyActionModal, { MoneyActionPayload } from '../components/MoneyActionModal';
import { Ionicons } from '@expo/vector-icons';
import AmbientBackground from '../../../shared/ui/AmbientBackground';
import EmptyState from '../../../shared/ui/EmptyState';
import EntranceView from '../../../shared/ui/EntranceView';
import { VOICE_BUTTON_CLEARANCE } from '../../../shared/ui/fabLayout';
import PressableScale from '../../../shared/ui/PressableScale';
import SectionHeader from '../../../shared/ui/SectionHeader';
import SurfaceLabel from '../../../shared/ui/SurfaceLabel';
import SwipePager, { type SwipePage } from '../../../shared/ui/SwipePager';
import StatusBanner from '../../../shared/ui/StatusBanner';
import { SkeletonContactList } from '../../../shared/ui/SkeletonShimmer';
import { AuthContext } from '../../auth/context/AuthContext';
import { ContactsContext } from '../context/ContactsContext';
import { WorkspaceContext } from '../../business/context/WorkspaceContext';
import { useMoney } from '../hooks/useMoney';
import { useNotifications, useMarkNotificationRead } from '../../notifications/hooks/useNotifications';
import { useAccountContext } from '../../../shared/hooks/useAccountContext';
import { normalizePhone } from '../../../shared/lib/phone';
import { NestedGlass, useAppTheme } from '../../../shared/theme';
import type { ThemeValue } from '../../../shared/theme/ThemeProvider';
import type { DebtsScreenProps } from '../../../app/navigation/types';
import { ROUTES } from '../../../app/navigation/routes';
import { MoneyActionType } from '../../../shared/types/money';
import { mergeAmounts, netByCurrency } from '../../../shared/lib/currency';
import { useContactRentalTotals } from '../../rentals/hooks/useContactRentalTotals';
import { useRequestRental } from '../../rentals/hooks/useRentals';
import type { Currency, MoneyItemCreateDTO } from '../../../shared/types/money';
import { canDelete, canWrite } from '../../../shared/lib/permissions';
import { useI18n } from '../../../shared/i18n';
import BusinessCatalogPane from '../../products/components/BusinessCatalogPane';
import ContactBalanceHeader from '../components/ContactBalanceHeader';
import TransactionRow from '../components/TransactionRow';
import TransactionDetailModal from '../components/TransactionDetailModal';
import ClientRentalPane from '../../rentals/components/ClientRentalPane';
import RentalFormModal from '../../rentals/components/RentalFormModal';
import RentalDetailModal from '../../rentals/components/RentalDetailModal';
import RentalRequestModal from '../../rentals/components/RentalRequestModal';
import type { RentalRequestDTO, RentalResponseDTO } from '../../rentals/types/rental';

/** Hali saqlanmagan ijara: so'rov + ko'rsatish uchun nom va summa. */
interface RentalDraft {
  id: string;
  draft: RentalRequestDTO;
  total: number;
  label: string;
}
import type { RentalItemResponseDTO } from '../../rentals/types/rentalItem';
import { mapTransaction, MappedTransaction } from '../model/transactionMapping';
import { counterpartyPerformerPhone } from '../model/resolveTransactionPerformer';
import type { VoiceCommandPrefill } from '../../voice/model/resolveVoiceCommand';
import { markVoiceTarget } from '../../voice/api/voice';
import { resolveVoiceCommand } from '../../voice/model/resolveVoiceCommand';
import { clearPendingIntent, takePendingIntent } from '../../voice/model/pendingVoice';

type ContactDetailProps = DebtsScreenProps<typeof ROUTES.CONTACT_DETAIL>;

/** Ovozdan kelgan, formaga qo'yiladigan qiymatlar. */
interface VoicePrefill {
  amount?: number;
  description?: string;
  currency?: Currency;
  items?: MoneyItemCreateDTO[];
  calcNote?: string;
  /** Qaysi ovozdan kelgani - saqlangach havola yozish uchun. */
  commandId?: string;
}

/** Navbatdagi valyuta: forma qiymatlari va qaysi tugma bilan ochilishi. */
interface QueuedSettlement {
  prefill: VoicePrefill;
  actionType: MoneyActionType;
}

const ContactDetailScreen: React.FC<ContactDetailProps> = ({ route, navigation }) => {
  const { t } = useI18n();
  const theme = useAppTheme();
  const { colors } = theme;
  const styles = useMemo(() => createStyles(theme), [theme]);

  const contactId = route.params.id;
  const { profile } = useContext(AuthContext);
  const { workspace } = useContext(WorkspaceContext);
  const { accountType, partyType, accountId } = useAccountContext();
  const { contacts } = useContext(ContactsContext);

  // Joriy hisob (shaxsiy profil yoki faol biznes) — tranzaksiya tomonlarini
  // shu bo'yicha aniqlaymiz. Yagona manba useAccountContext.
  const owner = useMemo(() => ({ partyType, partyId: accountId }), [partyType, accountId]);

  const [modalVisible, setModalVisible] = useState(false);
  const [actionType, setActionType] = useState<MoneyActionType>('TAKE');
  const [selectedTransaction, setSelectedTransaction] = useState<MappedTransaction | null>(null);
  const [voicePrefill, setVoicePrefill] = useState<VoicePrefill | undefined>();

  /**
   * "Barcha qarzimni qaytardim" bir nechta valyutaga tegsa, ular NAVBAT
   * bilan kiritiladi.
   *
   * Bitta yozuv bitta valyutada bo'ladi: so'm bilan dollarni qo'shish
   * kursni o'ylab topish bo'lardi, eng kattasini olib qolganini tashlash
   * esa pulni jimgina yo'qotardi. Shuning uchun har biri uchun forma
   * alohida ochiladi.
   *
   * Navbat faqat SAQLANGANDAN keyin suriladi. Bekor qilish "to'xta"
   * degani - aks holda odam ketma-ket ochilayotgan oynalarni yopib
   * chiqishga majbur bo'lardi.
   */
  const [settlementQueue, setSettlementQueue] = useState<QueuedSettlement[]>([]);

  /**
   * Ovozli buyruqdan kelgan qiymatlar bilan oldi-berdi oynasini ochish.
   *
   * Parametr DARHOL tozalanadi: aks holda foydalanuvchi orqaga qaytib shu
   * kontaktga kirganda oyna o'z-o'zidan yana ochilaverardi va eski summa
   * qayta paydo bo'lardi.
   */
  const applyVoicePrefill = useCallback((spoken: VoiceCommandPrefill) => {
    setActionType(spoken.direction === 'GAVE' ? 'GIVE' : 'TAKE');
    setVoicePrefill({
      amount: spoken.amount,
      description: spoken.note,
      currency: spoken.currency,
      items: spoken.items?.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      calcNote: spoken.calcNote,
      commandId: spoken.commandId,
    });
    // Birinchi valyuta yuqoridagi amount/currency'da keldi, qolganlari
    // navbatda kutadi.
    setSettlementQueue(
      (spoken.settlements ?? []).slice(1).map((line) => ({
        actionType: line.direction === 'GAVE' ? ('GIVE' as const) : ('TAKE' as const),
        prefill: {
          amount: line.amount,
          currency: line.currency,
          description: spoken.note,
          commandId: spoken.commandId,
        },
      })),
    );
    setMoneyFormKey((key) => key + 1);
    setRentalDrafts([]);
    setModalVisible(true);
  }, []);

  const voiceParam = route.params.voice as VoiceCommandPrefill | undefined;
  useEffect(() => {
    if (!voiceParam) return;
    navigation.setParams({ voice: undefined });
    applyVoicePrefill(voiceParam);
  }, [voiceParam, navigation, applyVoicePrefill]);

  /**
   * Dastur qayta ishga tushganda oxirgi tanilgan gap TIKLANADI.
   *
   * Ovozni yuborish pul turadi. Ilgari oyna ochiq turganda dasturdan
   * chiqib kirilsa, React holati yo'qolar va odam aynan shu gapni
   * qaytadan aytishga majbur bo'lardi - ya'ni bekorga to'lardi.
   *
   * Gap FAQAT shu kontaktniki bo'lsa tiklanadi: boshqa odamning summasi
   * bu yerda ochilib qolsa, e'tiborsizlikda noto'g'ri yozuv saqlanardi.
   */
  useEffect(() => {
    if (voiceParam) return;

    let alive = true;
    takePendingIntent().then((intent) => {
      if (!alive || !intent) return;
      const command = resolveVoiceCommand(intent);
      if (command.kind !== 'OPEN_CONTACT' || command.contactId !== contactId) return;
      applyVoicePrefill(command.prefill);
    });
    return () => {
      alive = false;
    };
  }, [voiceParam, contactId, applyVoicePrefill]);

  const { history, currencyTotals, selectedCounterparty, loading, creating, error, fetchData, createMoney } =
    useMoney({ token: profile?.jwt });

  const contact = useMemo(() => contacts.find((item) => item.id === contactId), [contacts, contactId]);


  // Telegram uslubida: kontakt ochilganda AYNAN SHU kontaktdan kelgan o'qilmagan
  // bildirishnomalar o'qilgan deb belgilanadi — ro'yxatdagi badge tozalanadi.
  const { data: notifData } = useNotifications();
  const { mutate: markNotificationRead } = useMarkNotificationRead();
  const markedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const phone = contact?.phone ? normalizePhone(contact.phone) : '';
    if (!phone) return;
    for (const item of notifData?.content ?? []) {
      if (item.read || markedIdsRef.current.has(item.id)) continue;
      if (!item.actorPhone || normalizePhone(item.actorPhone) !== phone) continue;
      markedIdsRef.current.add(item.id);
      markNotificationRead(item.id);
    }
  }, [contact?.phone, notifData, markNotificationRead]);

  // Biznes kontekstida MEMBER faqat ko'rishi mumkin — yozish tugmalari yashiriladi.
  const allowWrite = canWrite(workspace.activeBusinessRole);
  // Ijara — Mahsulotlar kabi BIZNES bo'limi: ombor biznesniki va uning
  // barcha adminlariga ko'rinadi. Shaxsiy hisobda bo'lim umuman yo'q.
  /**
   * Ijara sahifasi qachon chiqadi.
   *
   * BIZNESDA — har qanday mijoz uchun: ombor meniki, men beraman.
   * SHAXSIYDA — faqat qarshi tomon BIZNES bo'lganda: ombor uniki va u
   * narxnoma kabi mijozga ochiq, men esa undan olaman.
   *
   * Ikki holat bir sahifada, lekin yo'nalish teskari — `ownerBusinessId`
   * shuni ajratadi.
   */
  const counterpartyBusinessId =
    contact?.partyType === 'BUSINESS_ACCOUNT' ? contact?.partyId : undefined;
  const rentalsAvailable =
    workspace.mode === 'business' || Boolean(counterpartyBusinessId);

  /**
   * MIJOZ REJIMI: ombor meniki emas, qarshi tomonniki.
   *
   * Shaxsiy hisobda do'kon kartasini ochganda shunday bo'ladi — u yerda
   * men beruvchi emas, OLUVCHIMAN. Biznesda esa aksincha, shuning uchun
   * o'z ish maydonimda bu rejim yoqilmaydi.
   */
  const clientMode = workspace.mode !== 'business' && Boolean(counterpartyBusinessId);

  /*
   * Balansga IJARA ham kiradi.
   *
   * Sarlavhadagi raqam pul tarixidan chiqardi va ijarani ko'rmasdi:
   * odam darhol ostida "Qarz 23 333" deb turgan qatorni ko'rar, tepada
   * esa o'sha pul yo'q edi. Ro'yxatdagi balans ijarani allaqachon
   * qo'shardi, ya'ni bitta mijozning raqami ikki ekranda ikki xil
   * chiqardi.
   */
  const rentalTotals = useContactRentalTotals(
    contactId,
    rentalsAvailable && clientMode ? counterpartyBusinessId ?? null : null,
  );

  // Har valyuta balansi MUSTAQIL — so'm alohida, dollar alohida (kurs aralashmaydi).
  const balances = useMemo(
    () =>
      netByCurrency(
        mergeAmounts(currencyTotals.credit, rentalTotals.credit),
        mergeAmounts(currencyTotals.debt, rentalTotals.debt),
      ),
    [currencyTotals, rentalTotals],
  );

  const mappedHistory = useMemo(
    () => history.map((item) => mapTransaction(item, owner, selectedCounterparty || undefined)),
    [history, owner, selectedCounterparty],
  );

  // QARAMA-QARSHI tomon xodimi: men tanlagan odam menga, men esa ularga ko'rinaman.
  const performerPhone = useMemo(
    () => (selectedTransaction ? counterpartyPerformerPhone(selectedTransaction, owner, profile?.id) : ''),
    [selectedTransaction, owner, profile?.id],
  );

  const loadScreenData = useCallback(async () => {
    if (!contact?.partyType) return;
    await fetchData({
      partyType: contact.partyType,
      partyId: contact.partyId,
      phoneFallback: contact.partyType === 'PROFILE' ? contact.phone : undefined,
    });
  }, [contact?.partyId, contact?.partyType, contact?.phone, fetchData]);

  useFocusEffect(
    useCallback(() => {
      loadScreenData();
    }, [loadScreenData]),
  );

  /**
   * Hali SAQLANMAGAN ijara so'rovlari.
   *
   * "Qarz berish" bosilganda pul yozuvi bilan BIRGA yuboriladi -
   * narxnoma savati bilan bir xil. Ilgari so'rov darhol yaratilar va
   * qarz balansiga o'sha zahoti kirardi; summa esa Miqdorga ham
   * qo'shilgani uchun bitta pul ikki marta sanalardi.
   */
  const [rentalDrafts, setRentalDrafts] = useState<RentalDraft[]>([]);
  // Hook keshni o'zi yangilaydi: ijara sahifasi darhol to'g'ri ko'rinadi.
  const requestRentalMutation = useRequestRental();

  const handleCreate = useCallback(
    async (payload: MoneyActionPayload) => {
      if (!contact) return;
      /*
       * IJARA tarixda ham ko'rinsin.
       *
       * Yozuvning o'zi ijara bo'limida turadi, lekin qarz tarixida
       * summa izohsiz raqam bo'lib qolardi: "93 332 so'm" - nimaga
       * ekani ko'rinmasdi. Narxnomadan tanlanganda mahsulotlar yozuv
       * bilan ketadi, ijarada esa yozib qo'yish kerak.
       */
      const rentalNote = rentalDrafts.map((entry) => entry.label).join(', ');
      const description = rentalNote
        ? [payload.description.trim(), `${t('rentals.title')}: ${rentalNote}`]
            .filter(Boolean)
            .join(' · ')
        : payload.description;

      const ok = await createMoney(actionType, {
        ...payload,
        description,
        targetPartyType: contact.partyType,
        targetPartyId: contact.partyId,
        targetPhone: contact.partyType === 'PROFILE' ? contact.phone : undefined,
      });
      if (!ok) return;

      /*
       * Ijara so'rovlari pul yozuvi SAQLANGANDAN KEYIN yuboriladi.
       *
       * Tartib muhim: pul saqlanmasa (xato, bekor) ijara ham
       * yaratilmasligi kerak - aks holda odam ko'rmagan yozuv
       * daftarga tushib qolardi.
       */
      for (const draft of rentalDrafts) {
        try {
          await requestRentalMutation.mutateAsync(draft.draft);
        } catch {
          // Pul allaqachon saqlangan - butun amalni yiqitmaymiz.
          // Ijara sahifasida yo'qligi ko'rinadi va qayta yozilishi mumkin.
        }
      }
      if (rentalDrafts.length > 0) {
        setRentalDrafts([]);
        setRequestSent(true);
      }

      setModalVisible(false);

      /**
       * Ovozdan kelgan bo'lsa - tarixdagi qator shu KONTAKTGA olib
       * borishi uchun havola yoziladi. Tranzaksiyaning o'z ekrani yo'q:
       * u kontakt tarixining bir qatori.
       *
       * Xatosi yutiladi: yozuv allaqachon saqlangan, havola esa faqat
       * qulaylik - odamni xato bilan bezovta qilish noto'g'ri bo'lardi.
       */
      void markVoiceTarget(voicePrefill?.commandId, 'TRANSACTION', contactId);

      const [next, ...rest] = settlementQueue;
      if (!next) {
        setVoicePrefill(undefined);
        // Yozuv saqlandi - saqlangan gap endi kerak emas. Qoldirilsa,
        // keyingi kirishda o'sha summa yana ochilib, ikkinchi marta
        // saqlanib ketishi mumkin edi.
        void clearPendingIntent();
        return;
      }
      setSettlementQueue(rest);
      setActionType(next.actionType);
      setVoicePrefill(next.prefill);
      setMoneyFormKey((key) => key + 1);
          setRentalDrafts([]);
      setModalVisible(true);
    },
    [contact, contactId, voicePrefill?.commandId, createMoney, actionType, settlementQueue,
      rentalDrafts, requestRentalMutation, t],
  );

  /**
   * Forma tozalanadigan payt.
   *
   * Yangi oqim boshlanganda o'zgaradi; ijara oqimidan QAYTGANDA esa
   * tegilmaydi — aks holda odam yozgan summa va savatdagi mahsulotlar
   * yo'qolardi.
   */
  const [moneyFormKey, setMoneyFormKey] = useState(0);

  /**
   * SHU OQIMDA ijaraga olingan buyumlar soni.
   *
   * Narxnoma qatoridagi son kabi: u shu formada qilingan ishni
   * ko'rsatadi, tarixni emas. Ilgari bu yerda mijozdagi BARCHA
   * qaytarilmagan yozuvlar sanalardi va hech narsa olmagan odam
   * "7 ta buyum olingan" degan yozuvni ko'rardi.
   *
   * Har yangi oqimda noldan boshlanadi.
   */

  /**
   * Shu oqimda olingan ijaralarning summasi — faqat KO'RSATISH uchun.
   *
   * Qarz maydoniga qo'shilmaydi: ijara o'z yozuvini yaratadi va u
   * allaqachon balansga kiradi (rentalTotalsByContact). Qo'shilsa
   * bitta pul ikki marta sanalardi - narxnoma tanlovidan farqi shu:
   * u yerda yozuv hali yo'q, forma uni endi yaratadi.
   */
  /**
   * Savat qayta ochilganda shu tanlov bilan ochiladi.
   *
   * Loyihalar qatorlardan yig'ilgan, shuning uchun teskari aylantirish
   * ham shu yerda: har qatorning muddati o'z loyihasidan olinadi.
   */
  const rentInPicksForBasket = useMemo(
    () =>
      rentalDrafts.flatMap((entry) =>
        entry.draft.lines.map((line) => ({
          itemId: line.rentalItemId,
          quantity: line.quantity,
          duration: entry.draft.duration ?? null,
        })),
      ),
    [rentalDrafts],
  );

  const rentInSessionAmount = useMemo(
    () => rentalDrafts.reduce((sum, item) => sum + item.total, 0),
    [rentalDrafts],
  );

  const openModal = useCallback((type: MoneyActionType) => {
    setActionType(type);
    setMoneyFormKey((key) => key + 1);
    setRentalDrafts([]);
    setModalVisible(true);
  }, []);

  // Tarix virtualizatsiyalangan (FlatList) — bir kontaktda minglab yozuv bo'lishi
  // mumkin; avval ScrollView + .map() hammasini bir vaqtda render qilardi ("qotish").
  const lastIndex = mappedHistory.length - 1;
  const renderTransaction = useCallback<ListRenderItem<MappedTransaction>>(
    ({ item, index }) => (
      <TransactionRow tx={item} isLast={index === lastIndex} onPress={setSelectedTransaction} />
    ),
    [lastIndex],
  );

  const keyExtractor = useCallback((item: MappedTransaction) => item.id, []);

  /**
   * Narxnoma FAQAT biznes kontaktida bo'ladi.
   *
   * Shaxsiy kontaktda mahsulot tushunchasi yo'q — u yerda umuman sahifalagich
   * ko'rsatilmaydi, tarixning o'zi chiqadi.
   *
   * Biznes kontaktida narxnoma BIRINCHI sahifa: do'konni ochgan odam odatda
   * "nima bor va qancha turadi" deb qaraydi, oldi-berdi tarixini esa ataylab
   * izlaydi. Shu sababli katalog kech emas, DARHOL yuklanadi — ilgari u
   * ikkinchi sahifa bo'lgani uchun surilgandan keyin yuklanardi.
   */
  const showCatalog = contact?.partyType === 'BUSINESS_ACCOUNT' && Boolean(contact?.partyId);

  // ---- Ijara ----
  //
  // Oldi-berdi SAHIFADA bo'ladi (pastga qarang: `pages`), bu yerda faqat
  // oynalarning holati turadi. Ro'yxatlarni sahifaning o'zi yuklaydi —
  // u ko'rilmaguncha so'rov ham yubormaydi.
  const [rentalFormVisible, setRentalFormVisible] = useState(false);
  const [editingRental, setEditingRental] = useState<RentalResponseDTO | null>(null);
  const [openedRental, setOpenedRental] = useState<RentalResponseDTO | null>(null);
  /** Ombordan tanlangan buyum — forma shu buyum bilan ochiladi. */
  const [presetItem, setPresetItem] = useState<RentalItemResponseDTO | null>(null);
  /** Mijoz rejimida tanlangan buyum — "ijaraga olish" so'rovi oynasi. */
  const [requestItem, setRequestItem] = useState<RentalItemResponseDTO | null>(null);
  /**
   * So'rov oynasi buyumsiz ham ochiladi.
   *
   * Qarz oynasidagi "Ijaraga olish" bosilganda buyum hali tanlanmagan —
   * oyna o'zi ombor ro'yxatini ko'rsatadi.
   */
  const [requestOpen, setRequestOpen] = useState(false);

  /**
   * So'rov oynasi QARZ OYNASIDAN ochildimi.
   *
   * Bekor qilgan odam o'sha yerga qaytishi kerak: u pul summasini
   * yozib qo'ygan bo'lishi mumkin va oyna yopilib ketsa hammasini
   * boshqatdan kiritardi. (Qarz oynasi mount'da qoladi, shuning uchun
   * yozilgani joyida turadi.)
   */
  const [rentInFromMoney, setRentInFromMoney] = useState(false);

  /** "So'rov yuborildi" xabari — yuborilganini bildiradigan yagona belgi. */
  const [requestSent, setRequestSent] = useState(false);

  const openRentIn = useCallback(() => {
    setModalVisible(false);
    setRequestItem(null);
    setRentInFromMoney(true);
    setRequestOpen(true);
    setRequestSent(false);
  }, []);

  const closeRequest = useCallback(() => {
    setRequestOpen(false);
    setRequestItem(null);
    if (rentInFromMoney) {
      setRentInFromMoney(false);
      setModalVisible(true);
    }
  }, [rentInFromMoney]);

  /**
   * So'rov yuborildi.
   *
   * Navigatsiya bekor qilish bilan BIR XIL (bir qadam orqaga), farqi
   * faqat xabarda: ilgari yuborilgandan keyin hech qanday belgi yo'q
   * edi va odam yozuv yaratilganini bilmasdi.
   */
  /**
   * Tanlov savatdan keldi — avvalgisini ALMASHTIRADI.
   *
   * Narxnoma savati kabi: oyna butun tanlovni qaytaradi, shuning uchun
   * ustiga qo'shilsa takrorlanib ketardi.
   */
  const handleRentalPicked = useCallback(
    (picked: { draft: RentalRequestDTO; total: number; label: string }[]) => {
      closeRequest();
      setRentalDrafts(
        picked.map((entry, index) => ({ id: `rent-${index}`, ...entry })),
      );
    },
    [closeRequest],
  );

  /** Bitta tanlovni olib tashlash — qolganlari joyida qoladi. */
  const removeRentalDraft = useCallback((id: string) => {
    setRentalDrafts((drafts) => drafts.filter((item) => item.id !== id));
  }, []);

  /** Ombor qatori yoki sarlavhadagi tugma: buyum bilan yoki bo'sh forma. */
  const openRentalForm = useCallback((item: RentalItemResponseDTO | null = null) => {
    setEditingRental(null);
    setPresetItem(item);
    setRentalFormVisible(true);
  }, []);

  const handleEditRental = useCallback((rental: RentalResponseDTO) => {
    setOpenedRental(null);
    setPresetItem(null);
    setEditingRental(rental);
    setRentalFormVisible(true);
  }, []);

  const closeRentalForm = useCallback(() => {
    setRentalFormVisible(false);
    setEditingRental(null);
    setPresetItem(null);
  }, []);

  /**
   * Omborda kerakli buyum yo'q — ijara omboriga o'tib, buyum qo'shish
   * formasi darhol ochiladi. Shu yerda modal ustiga modal
   * qalashtirilmaydi: orqaga qaytish chalkashib ketardi.
   *
   * Ijara endi ALOHIDA TAB, shuning uchun o'tish ota navigator orqali:
   * mijoz kartasi Qarzlar stack'ida turadi va u boshqa tabning ekranini
   * o'zi ocha olmaydi.
   */
  const openStockForNewItem = useCallback(() => {
    closeRentalForm();
    navigation.getParent()?.navigate(ROUTES.RENTALS, {
      screen: ROUTES.RENTAL_LIST,
      params: { tab: 'stock', addItem: true },
    });
  }, [closeRentalForm, navigation]);

  if (!contact) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>{t('contact.notFound')}</Text>
      </View>
    );
  }

  const renderHistory = () => (
    <NestedGlass>
      <FlatList
        contentContainerStyle={styles.listCard}
        data={mappedHistory}
        renderItem={renderTransaction}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        initialNumToRender={14}
        windowSize={11}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={loadScreenData}
            tintColor={colors.primary}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        ListEmptyComponent={
          // Skeleton faqat BIRINCHI yuklashda: tarix allaqachon ekranda
          // bo'lsa, modal yopilgandan keyingi fon yangilanishi uni
          // kulrang chiziqlarga almashtirmaydi.
          loading && mappedHistory.length === 0 ? (
            <SkeletonContactList count={5} />
          ) : (
            <EmptyState
              icon="swap-horizontal-outline"
              title={t('debts.emptyAccount')}
              description={allowWrite ? t('contact.emptyHint') : undefined}
            />
          )
        }
      />
    </NestedGlass>
  );

  /**
   * Sahifa kalitlari — ro'yxatning O'ZIDAN oldin.
   *
   * Kech yuklash shuni talab qiladi: sahifa ochilmaguncha so'rov
   * yubormasligi kerak, buning uchun esa qaysi sahifa boshlang'ich
   * ekanini sahifalarni qurishdan oldin bilish kerak.
   */
  const pageKeys = useMemo(
    () => [
      ...(showCatalog ? ['catalog'] : []),
      ...(rentalsAvailable ? ['rental'] : []),
      'history',
    ],
    [showCatalog, rentalsAvailable],
  );
  const initialPageIndex = route.params.tab === 'history' ? pageKeys.length - 1 : 0;
  const [openedKeys, setOpenedKeys] = useState<string[]>([]);
  /** Sahifa ochilganmi: boshlang'ichi darhol, qolganlari surilgandan keyin. */
  const pageOpened = useCallback(
    (key: string) => pageKeys[initialPageIndex] === key || openedKeys.includes(key),
    [pageKeys, initialPageIndex, openedKeys],
  );

  const handlePageChange = useCallback(
    (index: number) => {
      const key = pageKeys[index];
      if (!key) return;
      setOpenedKeys((current) => (current.includes(key) ? current : [...current, key]));
    },
    [pageKeys],
  );

  /**
   * Kartaning sahifalari.
   *
   * Narxnoma — faqat qarshi tomon BIZNES bo'lganda (uning ochiq narxi).
   * Ijara — biznes hisobida har qanday mijoz uchun: oldi-berdi aynan shu
   * yerda bo'ladi, narxnoma bilan bir xil joyda.
   * Tarix — doim oxirgi sahifa.
   */
  const pages: SwipePage[] = [
    ...(showCatalog
      ? [
          {
            key: 'catalog',
            label: t('products.title'),
            icon: 'pricetags-outline' as const,
            // Birinchi sahifa bo'lgani uchun `active` doim rost: kechiktirishning
            // ma'nosi yo'q, u baribir darhol ko'rinadi.
            render: () => (
              <BusinessCatalogPane businessId={contact.partyId} token={profile?.jwt} active />
            ),
          },
        ]
      : []),
    ...(rentalsAvailable
      ? [
          {
            key: 'rental',
            label: t('rentals.title'),
            icon: 'cube-outline' as const,
            render: () => (
              <ClientRentalPane
                clientId={contactId}
                active={pageOpened('rental')}
                allowWrite={allowWrite}
                onGiveOut={
                  clientMode
                    ? (stockItem) => {
                        setRequestItem(stockItem);
                        setRequestOpen(true);
                      }
                    : openRentalForm
                }
                onOpenRental={setOpenedRental}
                onAddItem={allowWrite ? openStockForNewItem : undefined}
                ownerBusinessId={clientMode ? counterpartyBusinessId : null}
              />
            ),
          },
        ]
      : []),
    { key: 'history', label: t('debts.history'), icon: 'time-outline', render: renderHistory },
  ];

  return (
    <View style={styles.container}>
      {/* Dekorativ fon — Qarzlar ro'yxati bilan bir xil "imzo" qatlami. */}
      <AmbientBackground />

      <EntranceView duration={300} fromY={12}>
        <ContactBalanceHeader contact={contact} balances={balances} onBack={navigation.goBack} />

        {error ? (
          <View style={styles.banner}>
            <StatusBanner
              tone="error"
              message={error}
              actionLabel={t('common.retry')}
              onAction={loadScreenData}
            />
          </View>
        ) : null}

        {requestSent ? (
          <View style={styles.banner}>
            <StatusBanner
              tone="success"
              message={t('rentals.requestSent')}
              actionLabel={t('common.close')}
              onAction={() => setRequestSent(false)}
            />
          </View>
        ) : null}

        {/* Sahifalar bo'lmasa (shaxsiy hisob, oddiy kontakt) — tarix
            yolg'iz qoladi va unga sarlavha kerak. */}
        {pages.length > 1 ? null : (
          <SectionHeader icon="time" iconBadge={false} title={t('debts.history')} />
        )}
      </EntranceView>

      <EntranceView delay={90} duration={320} fromY={14} style={styles.listWrap}>
        {pages.length > 1 ? (
          <SwipePager
            pages={pages}
            initialPage={initialPageIndex}
            onPageChange={handlePageChange}
          />
        ) : (
          renderHistory()
        )}
      </EntranceView>

      {allowWrite ? (
        <EntranceView delay={180} duration={300} fromY={16} style={styles.bottomActions}>
          <PressableScale
            containerStyle={styles.actionSlot}
            style={[styles.actionBtn, styles.takeBtn]}
            onPress={() => openModal('TAKE')}
            accessibilityRole="button"
            accessibilityLabel={t('contact.took')}
          >
            <Ionicons name="arrow-down" size={18} color={colors.textOnPrimary} />
            <Text style={styles.actionText}>{t('contact.took')}</Text>
          </PressableScale>
          <PressableScale
            containerStyle={styles.actionSlot}
            style={[styles.actionBtn, styles.giveBtn]}
            onPress={() => openModal('GIVE')}
            accessibilityRole="button"
            accessibilityLabel={t('contact.gave')}
          >
            <Ionicons name="arrow-up" size={18} color={colors.textOnPrimary} />
            <Text style={styles.actionText}>{t('contact.gave')}</Text>
          </PressableScale>
        </EntranceView>
      ) : (
        // Tugmalar o'rnida, to'g'ridan-to'g'ri fonda - o'z sirtisiz fon
        // rasmiga qo'shilib ketardi. multiline: katta shriftda qirqilmasin
        // (tugmalar nega yo'qligining yagona izohi).
        <SurfaceLabel multiline style={styles.readOnlyNote} textStyle={styles.readOnlyText}>
          {t('contact.readOnly')}
        </SurfaceLabel>
      )}

      <RentalFormModal
        visible={rentalFormVisible}
        onClose={closeRentalForm}
        presetItem={presetItem}
        client={contact ? { id: contact.id, name: contact.fullName } : null}
        rental={editingRental}
        onAddItem={allowWrite ? openStockForNewItem : undefined}
      />

      {clientMode && counterpartyBusinessId ? (
        <RentalRequestModal
          businessId={counterpartyBusinessId}
          item={requestItem}
          visible={requestOpen}
          onClose={closeRequest}
          onPicked={handleRentalPicked}
          initialPicks={rentInPicksForBasket}
          // Qarz oynasidan kelgan bo'lsa — o'sha yerga qaytish yo'li.
          onBack={rentInFromMoney ? closeRequest : undefined}
        />
      ) : null}

      <RentalDetailModal
        rental={openedRental}
        onClose={() => setOpenedRental(null)}
        onEdit={handleEditRental}
        allowWrite={allowWrite}
        allowDelete={canDelete(workspace.activeBusinessRole)}
      />

      <MoneyActionModal
        onRentIn={clientMode && counterpartyBusinessId ? openRentIn : undefined}
        rentInPicks={rentalDrafts.map(({ id, label, total }) => ({ id, label, total }))}
        rentInAmount={rentInSessionAmount}
        onRemoveRentIn={removeRentalDraft}
        resetKey={moneyFormKey}
        visible={modalVisible}
        actionType={actionType}
        loading={creating}
        fixedCounterpartyId={contact.partyId}
        fixedCounterpartyType={contact.partyType}
        ownerAccountType={accountType}
        token={profile?.jwt}
        prefill={voicePrefill}
        onClose={() => {
          setModalVisible(false);
          setVoicePrefill(undefined);
          setSettlementQueue([]);
          // Bekor qilish "kerak emas" degani - qayta ochilmasin.
          void clearPendingIntent();
        }}
        onSubmit={handleCreate}
      />

      <TransactionDetailModal
        tx={selectedTransaction}
        performerPhone={performerPhone}
        onClose={() => setSelectedTransaction(null)}
      />
    </View>
  );
};

const createStyles = ({ colors, spacing, radius, typography, shadows, glass }: ThemeValue) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // Fon AmbientBackground'dan keladi — tekis rang berilmaydi.
      backgroundColor: 'transparent',
    },
    listWrap: {
      flex: 1,
    },
    banner: {
      marginBottom: spacing.sm,
    },
    listCard: {
      ...glass.pane,
      borderRadius: radius.xxl,
      marginHorizontal: spacing.md,
      marginBottom: spacing.md,
      overflow: 'hidden',
      ...shadows.card,
    },
    // Ikki asosiy amal — ekranning eng pastida, bosh barmoq yetadigan joyda.
    // Ustki "qattiq" chegara olib tashlandi: ajratishni soya va bo'shliq beradi.
    // Pastki bo'shliq ovoz doirasidan: u paneldan 29px chiqadi va 16px
    // bilan tugmalarning ichki burchaklarini yopib qo'yardi.
    bottomActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm,
      paddingBottom: VOICE_BUTTON_CLEARANCE,
    },
    // Ikkala tugma qatorni TENG ikkiga bo'ladi. `flex` animatsiya
    // konteyneriga beriladi — tugmaning o'ziga berilsa, uni o'rab turgan
    // konteyner kontent bo'yicha kichrayib qolardi.
    actionSlot: {
      flex: 1,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      minHeight: 52,
      borderRadius: radius.lg,
      ...shadows.card,
    },
    actionText: {
      ...typography.button,
      fontSize: 16,
      color: colors.textOnPrimary,
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
    },
    giveBtn: {
      backgroundColor: colors.positive,
    },
    // Sirt SurfaceLabel'dan; bu yerda faqat joylashuv - o'rtada, ovoz
    // doirasidan yuqorida (tugmalar qatori bilan bir xil sabab).
    readOnlyNote: {
      alignSelf: 'center',
      marginTop: spacing.md,
      marginBottom: VOICE_BUTTON_CLEARANCE,
      marginHorizontal: spacing.md,
    },
    readOnlyText: {
      ...typography.bodySmall,
      textAlign: 'center',
      color: colors.textSecondary,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    emptyText: {
      ...typography.body,
      textAlign: 'center',
      color: colors.textSecondary,
      paddingVertical: spacing.lg,
    },
  });

export default ContactDetailScreen;
