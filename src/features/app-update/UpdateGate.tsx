import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../shared/theme';
import { ColorTokens } from '../../shared/theme/colors';
import { useI18n } from '../../shared/i18n';
import { APP_VERSION_CODE } from '../../shared/appVersion';
import { fetchMobileVersion } from './api/mobileVersion';

type UpdateState = 'ok' | 'required' | 'optional';

/**
 * Ilovani o'rab turadi. Ochilishда backenddagi eng kam talab qilinадиган
 * versiyани tekshiradi:
 *  - o'rnatilgan versiya < minVersionCode  -> MAJBURIY: to'liq ekran, yopib
 *    bo'lmaydi, faqat "Yangilash" (Play Store'ni ochadi).
 *  - o'rnatilgan versiya < latestVersionCode -> tavsiyaviy: yopiladigan oyna.
 *
 * Web'da force-update qo'llanmaydi (brauzer doim eng yangi). Tarmoq xatosida
 * ham bloklanmaydi (fail-open).
 */
const UpdateGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [state, setState] = useState<UpdateState>('ok');
  const [updateUrl, setUpdateUrl] = useState('');
  const [optionalDismissed, setOptionalDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined; // web'da yangilanish tekshirilmaydi
    const controller = new AbortController();
    fetchMobileVersion(controller.signal).then((info) => {
      if (!info) return;
      if (APP_VERSION_CODE < info.minVersionCode) {
        setUpdateUrl(info.updateUrl);
        setState('required');
      } else if (APP_VERSION_CODE < info.latestVersionCode) {
        setUpdateUrl(info.updateUrl);
        setState('optional');
      }
    });
    return () => controller.abort();
  }, []);

  const openStore = () => {
    if (updateUrl) Linking.openURL(updateUrl).catch(() => { /* store ochilmasa jimgina */ });
  };

  return (
    <View style={styles.root}>
      {children}

      {state === 'required' ? (
        // To'liq ekranli, yopib bo'lmaydigan qatlam.
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconBadge}>
              <Ionicons name="cloud-download-outline" size={34} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('update.required.title')}</Text>
            <Text style={styles.body}>{t('update.required.body')}</Text>
            <TouchableOpacity style={styles.button} onPress={openStore} activeOpacity={0.9}>
              <Text style={styles.buttonText}>{t('update.required.button')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {state === 'optional' && !optionalDismissed ? (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.iconBadge}>
              <Ionicons name="sparkles-outline" size={34} color={colors.primary} />
            </View>
            <Text style={styles.title}>{t('update.optional.title')}</Text>
            <Text style={styles.body}>{t('update.optional.body')}</Text>
            <TouchableOpacity style={styles.button} onPress={openStore} activeOpacity={0.9}>
              <Text style={styles.buttonText}>{t('update.required.button')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setOptionalDismissed(true)} activeOpacity={0.7}>
              <Text style={styles.laterText}>{t('update.optional.later')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    zIndex: 1000,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  laterText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },
});

export default UpdateGate;
