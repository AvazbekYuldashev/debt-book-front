import React, { createContext, useContext, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../../../shared/theme';
import type { ColorTokens } from '../../../shared/theme/colors';

/**
 * Maydon ichidagi kiritish joyi fokusni shu yerga xabar qiladi.
 *
 * NEGA KONTEKST: fokus hodisasi React Native'da yuqoriga ko'tarilmaydi,
 * ya'ni o'rab turgan qator uni o'zi eshita olmaydi. AuthTextInput esa
 * allaqachon shu usulda (AuthShell'ning klaviatura konteksti orqali)
 * yuqoriga xabar beradi - bu ikkinchisi o'sha naqshni takrorlaydi.
 */
const FieldFocusContext = createContext<(focused: boolean) => void>(() => {});

export const useFieldFocus = () => useContext(FieldFocusContext);

interface AuthFieldProps {
  label: string;
  children: React.ReactNode;
}

/**
 * Kirish formasining bitta maydoni: yorliq va uning ostidagi qator.
 *
 * FOKUS BUTUN QATORGA chiziladi, ichidagi kiritish joyiga emas.
 * Brauzer o'z ramkasini aynan `input` elementiga chizardi - u esa
 * "+998" yoki ko'z tugmasidan keyin boshlanadi, natijada qora
 * to'rtburchak maydonning faqat bir qismini o'rab, kesilgandek
 * ko'rinardi. Ramka o'chirildi va uning o'rniga qator chegarasi
 * yonadi: odam uchun bosiladigan narsa butun qator edi.
 */
const AuthField: React.FC<AuthFieldProps> = ({ label, children }) => {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.row, focused && styles.rowFocused]}>
        <FieldFocusContext.Provider value={setFocused}>{children}</FieldFocusContext.Provider>
      </View>
    </View>
  );
};

const createStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    field: {
      marginBottom: 18,
    },
    // Yorliq maydon USTIDA: ichidagi placeholder yozila boshlashi bilan
    // yo'qolardi va odam "bu qaysi maydon edi" deb qolardi.
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.textPrimary,
      marginBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      height: 56,
    },
    // Chegara QALINLASHMAYDI, faqat rangi o'zgaradi: qalinlik o'zgarsa
    // ichidagi mazmun bir piksel siljib, qator "sakrab" turardi.
    rowFocused: {
      borderColor: colors.primary,
    },
  });

export default AuthField;
