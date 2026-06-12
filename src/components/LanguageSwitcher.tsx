import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { useI18n } from '../i18n';
import { useAppTheme } from '../theme';
import { ColorTokens } from '../theme/colors';

interface Props {
  /** 'pills' (default) — uchta kichik tugma; 'list' — profil sozlamalari uchun keng qatorlar. */
  variant?: 'pills' | 'list';
  style?: ViewStyle;
}

const LanguageSwitcher: React.FC<Props> = ({ variant = 'pills', style }) => {
  const { lang, setLang, langs } = useI18n();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (variant === 'list') {
    return (
      <View style={[styles.listWrap, style]}>
        {langs.map((item) => {
          const active = item.code === lang;
          return (
            <TouchableOpacity
              key={item.code}
              style={[styles.listRow, active && styles.listRowActive]}
              onPress={() => setLang(item.code)}
              activeOpacity={0.8}
            >
              <Text style={[styles.listLabel, active && styles.listLabelActive]}>{item.label}</Text>
              {active ? <View style={styles.dot} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  }

  return (
    <View style={[styles.pillsWrap, style]}>
      {langs.map((item) => {
        const active = item.code === lang;
        return (
          <TouchableOpacity
            key={item.code}
            style={[styles.pill, active && styles.pillActive]}
            onPress={() => setLang(item.code)}
            activeOpacity={0.8}
          >
            <Text style={[styles.pillText, active && styles.pillTextActive]}>{item.short}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const createStyles = (colors: ColorTokens) => StyleSheet.create({
  pillsWrap: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
  },
  pillActive: {
    backgroundColor: colors.surface,
    shadowColor: '#1E293B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.primary,
  },
  listWrap: {
    gap: 8,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  listLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  listLabelActive: {
    color: colors.primary,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});

export default LanguageSwitcher;
