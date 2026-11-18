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
import { useRequestRental } from '../../rentals/hooks/useRentals';
import { useContactRentals } from '../../rentals/hooks/useContactRentalTotals';
import { rentalTotalsByContact } from '../../rentals/model/rentalBalance';
import {
  mergeHistoryRows,
  rentalHistoryRows,
  rentalIdOfRow,
} from '../model/rentalHistoryRows';
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
import type { RentalPeriod, RentalRequestDTO, RentalResponseDTO } from '../../rentals/types/rental';

import type { RentalItemResponseDTO } from '../../rentals/types/rentalItem';
import { mapTransaction, MappedTransaction } from '../model/transactionMapping';
import { getMoneyById } from '../services/moneyService';
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

  /**
   * IJARAGA OLISH yo'li qachon chiqadi.
   *
   * Qarshi tomon BIZNES bo'lsa — hisob shaxsiymi yoki biznesmi,
   * ahamiyatsiz: biznes ham boshqa do'kondan lesa ijaraga olishi mumkin
   * va buni daftariga yozishi kerak. Ilgari bu yo'l faqat shaxsiy
   * hisobda bor edi va biznes egasi o'zi olgan ijarani yoza olmasdi.
   *
   * O'Z omboridan "olish" esa yo'q: u oddiy berish va uning o'z yo'li
   * bor (server ham buni rad etadi).
   */
  const canRentIn =
    Boolean(counterpartyBusinessId) && counterpartyBusinessId !== workspace.activeBusinessId;

  /*
   * Balansga IJARA ham kiradi.
   *
   * Sarlavhadagi raqam pul tarixidan chiqardi va ijarani ko'rmasdi:
   * odam darhol ostida "Qarz 23 333" deb turgan qatorni ko'rar, tepada
   * esa o'sha pul yo'q edi. Qoldiq VAQT bilan o'sadi (muddat o'tgach
   * ham kunlik/soatlik qo'shilaveradi), shuning uchun u pul yozuviga
   * QOTIRIB yozilmaydi — har ko'rishda ijara yozuvidan qaytadan
   * hisoblanadi. To'lov esa ijara kartasida yoziladi va qoldiqni
   * kamaytiradi.
   */
  const contactRentals = useContactRentals(
    contactId,
    rentalsAvailable && clientMode ? counterpartyBusinessId ?? null : null,
    // Biznes rejimida men ham shu do'kondan olgan bo'lishim mumkin.
    !clientMode && canRentIn ? counterpartyBusinessId ?? null : null,
  );
  const rentalTotals = useMemo(
    () => rentalTotalsByContact(contactRentals)[contactId] ?? { credit: {}, debt: {} },
    [contactRentals, contactId],
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

  /**
   * BILDIRISHNOMADAN kelingan oldi-berdi — kartasi darhol ochiladi.
   *
   * Tarix sahifalangan va yozuv ko'pincha birinchi sahifada turadi,
   * lekin har doim emas: eski xabar bosilsa ro'yxatda topilmasdi.
   * Shuning uchun topilmasa id bo'yicha alohida so'raladi.
   *
   * Yozuv o'chirilgan yoki ruxsat yo'q bo'lsa jim o'tamiz — kontakt
   * kartasi ochiq qoladi, bo'sh oyna chiqmaydi.
   */
  const askedMoneyId = route.params.moneyId;
  useEffect(() => {
    if (!askedMoneyId) return;
    let cancelled = false;

    (async () => {
      const loaded = mappedHistory.find((item) => item.id === askedMoneyId);
      if (loaded) {
        setSelectedTransaction(loaded);
      } else {
        try {
          const fresh = await getMoneyById(askedMoneyId, profile?.jwt);
          if (cancelled) return;
          setSelectedTransaction(mapTransaction(fresh, owner, selectedCounterparty || undefined));
        } catch {
          if (cancelled) return;
        }
      }
      // Parametr ishlatilgach tozalanadi: orqaga qaytib kelganda karta
      // yana o'zidan-o'zi ochilib qolmasin.
      navigation.setParams({ moneyId: undefined });
    })();

    return () => {
      cancelled = true;
    };
  }, [askedMoneyId, mappedHistory, owner, selectedCounterparty, profile?.jwt, navigation]);

  /*
   * TARIX BALANSNI TUSHUNTIRADI.
   *
   * Sarlavhadagi raqam pul yozuvlari + ijara qoldig'idan yig'iladi,
   * demak ijara ham tarixda qator bo'lishi shart: haq va to'lovlar
   * alohida. Ilgari faqat to'lov ko'rinardi va qatorlarni qo'shib
   * chiqqan odam sarlavhadagi boshqa raqamni ko'rardi — qaytarilgan,
   * lekin puli to'lanmagan ijara esa hech qayerda ko'rinmasdi
   * (Ijara sahifasi "hozir nima turibdi" ni ko'rsatadi).
   */
  const rentalRows = useMemo(() => rentalHistoryRows(contactRentals), [contactRentals]);
  const historyRows = useMemo(
    () => mergeHistoryRows(mappedHistory, rentalRows),
    [mappedHistory, rentalRows],
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

  // Hook keshni o'zi yangilaydi: ijara sahifasi darhol to'g'ri ko'rinadi.
  const requestRentalMutation = useRequestRental();

  /*
   * Pul oynasi FAQAT PUL yozadi.
   *
   * Ilgari ijara tanlovi ham shu yozuvga qo'shilardi (summa Miqdorga,
   * qatorlari chekka) — lekin yozuv QOTIB qolar, muddat o'tgach o'sib
   * boruvchi ijara haqi esa unda ko'rinmasdi. Endi ijara o'z yozuvida
   * yashaydi va qoldig'i balansga o'zi qo'shiladi (`rentalBalance`),
   * to'lovi ijara kartasida yoziladi.
   */
  const handleCreate = useCallback(
    async (payload: MoneyActionPayload) => {
      if (!contact) return;
      const ok = await createMoney(actionType, {
        ...payload,
        targetPartyType: contact.partyType,
        targetPartyId: contact.partyId,
        targetPhone: contact.partyType === 'PROFILE' ? contact.phone : undefined,
      });
      if (!ok) return;

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
      setModalVisible(true);
    },
    [contact, contactId, voicePrefill?.commandId, createMoney, actionType, settlementQueue],
  );

  /**
   * Forma tozalanadigan payt.
   *
   * Yangi oqim boshlanganda o'zgaradi; ijara oqimidan QAYTGANDA esa
   * tegilmaydi — aks holda odam yozgan summa va savatdagi mahsulotlar
   * yo'qolardi.
   */
  const [moneyFormKey, setMoneyFormKey] = useState(0);

  const openModal = useCallback((type: MoneyActionType) => {
    setActionType(type);
    setMoneyFormKey((key) => key + 1);
    setModalVisible(true);
  }, []);

  /**
   * Qator bosildi: ijara to'lovi bo'lsa IJARA kartasi ochiladi —
   * sintetik qatorda pul kartasi ko'rsatadigan tomonlar yo'q.
   */
  const handleRowPress = useCallback(
    (tx: MappedTransaction) => {
      const rentalId = rentalIdOfRow(tx.id);
      if (!rentalId) {
        setSelectedTransaction(tx);
        return;
      }
      const rental = contactRentals.find((item) => item.id === rentalId);
      if (rental) setOpenedRental(rental);
    },
    [contactRentals],
  );

  // Tarix virtualizatsiyalangan (FlatList) — bir kontaktda minglab yozuv bo'lishi
  // mumkin; avval ScrollView + .map() hammasini bir vaqtda render qilardi ("qotish").
  const lastIndex = historyRows.length - 1;
  const renderTransaction = useCallback<ListRenderItem<MappedTransaction>>(
    ({ item, index }) => (
      <TransactionRow tx={item} isLast={index === lastIndex} onPress={handleRowPress} />
    ),
    [lastIndex, handleRowPress],
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

  /**
   * BILDIRISHNOMADAN kelingan ijara — kartasi darhol ochiladi.
   *
   * Mijoz tomoni uchun yagona yo'l shu: Ijara ro'yxati tabi faqat biznes
   * rejimida bor. Ilgari xabar bosilganda shunchaki kontakt kartasi
   * ochilar va odam qaysi ijara haqida gap ketayotganini bo'limdan
   * o'zi qidirardi.
   */
  const askedRentalId = route.params.rentalId;
  useEffect(() => {
    if (!askedRentalId) return;
    const found = contactRentals.find((item) => item.id === askedRentalId);
    if (!found) return;
    setOpenedRental(found);
    // Parametr ishlatilgach tozalanadi: orqaga qaytib kelganda karta
    // yana o'zidan-o'zi ochilib qolmasin.
    navigation.setParams({ rentalId: undefined });
  }, [askedRentalId, contactRentals, navigation]);
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

  /** "So'rov yuborildi" xabari — yuborilganini bildiradigan yagona belgi. */
  const [requestSent, setRequestSent] = useState(false);
  /** So'rov yuborilmay qoldi — sababi banner bo'lib chiqadi. */
  const [rentalError, setRentalError] = useState('');

  /** "Ijaraga olish" — buyumsiz ochilsa oyna o'zi ombor ro'yxatini ko'rsatadi. */
  const openRentIn = useCallback(() => {
    setRequestItem(null);
    setRequestOpen(true);
    setRequestSent(false);
    setRentalError('');
  }, []);

  const closeRequest = useCallback(() => {
    setRequestOpen(false);
    setRequestItem(null);
  }, []);

  /**
   * Tanlov savatdan keldi — so'rov DARHOL yuboriladi.
   *
   * Bir muddat tanlov pul oynasiga olib o'tilar va "Qarz berish" bilan
   * birga saqlanardi. U model bilan birga ketdi: endi ijara o'z yozuvini
   * yaratadi, qoldig'i balansga o'zi qo'shiladi (WAITING yozuv do'kon
   * tasdiqlagach kuchga kiradi), pul yozuvi esa shart emas.
   *
   * Muddati har xil buyumlar alohida so'rov bo'lib keladi (bitta yozuv
   * bitta muddat) — hammasi ketma-ket yuboriladi; bittasi yiqilsa
   * qolgani baribir yozilgan bo'ladi va xato banner aytadi.
   */
  const handleRentalPicked = useCallback(
    async (picked: { draft: RentalRequestDTO; total: number; label: string; period: RentalPeriod }[]) => {
      closeRequest();
      setRentalError('');
      try {
        for (const entry of picked) {
          await requestRentalMutation.mutateAsync(entry.draft);
        }
        setRequestSent(true);
      } catch (e) {
        setRentalError(e instanceof Error ? e.message : t('debts.saveFailed'));
      }
    },
    [closeRequest, requestRentalMutation, t],
  );

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
        data={historyRows}
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
          loading && historyRows.length === 0 ? (
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
  /*
   * Boshlang'ich sahifa SO'RALGANIGA qarab: bildirishnomadan ijara
   * yozuvi bilan kelinganda tarix emas, IJARA bo'limi ochilishi kerak.
   * Topilmasa birinchisi — eski xatti-harakat o'zgarmaydi.
   */
  const askedPageIndex = route.params.tab ? pageKeys.indexOf(route.params.tab) : -1;
  const initialPageIndex =
    askedPageIndex >= 0
      ? askedPageIndex
      : route.params.tab === 'history'
        ? pageKeys.length - 1
        : 0;
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
                        // Ijara sahifasidan kelganda yo'nalish OLISH:
                        // ombor do'konniki va tasdiq kutiladi.
                        setRequestItem(stockItem);
                        setRequestOpen(true);
                        setRequestSent(false);
                        setRentalError('');
                      }
                    : openRentalForm
                }
                onOpenRental={setOpenedRental}
                onAddItem={allowWrite ? openStockForNewItem : undefined}
                ownerBusinessId={clientMode ? counterpartyBusinessId : null}
                /* Biznes ham boshqa do'kondan oladi — o'sha yozuvlar
                   do'konning daftarida turadi va alohida sahifa
                   bo'lib keladi (shart `canRentIn` bilan bir xil). */
                takenFromBusinessId={canRentIn ? counterpartyBusinessId : null}
                onTakeFrom={!clientMode && canRentIn ? openRentIn : undefined}
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

        {rentalError ? (
          <View style={styles.banner}>
            <StatusBanner
              tone="error"
              message={rentalError}
              actionLabel={t('common.close')}
              onAction={() => setRentalError('')}
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

      {requestOpen ? (
        <RentalRequestModal
          businessId={counterpartyBusinessId ?? ''}
          item={requestItem}
          visible={requestOpen}
          onClose={closeRequest}
          onPicked={handleRentalPicked}
        />
      ) : null}

      <RentalDetailModal
        rental={openedRental}
        onClose={() => setOpenedRental(null)}
        onEdit={handleEditRental}
        /* Qarshi tomon do'kon bo'lsa to'lovda XODIM tanlanadi. */
        counterpartyBusinessId={counterpartyBusinessId ?? null}
        allowWrite={allowWrite}
        allowDelete={canDelete(workspace.activeBusinessRole)}
      />

      <MoneyActionModal
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
