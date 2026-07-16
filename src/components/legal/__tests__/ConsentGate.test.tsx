import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import { AppThemeProvider } from '../../../theme';
import { LanguageProvider } from '../../../i18n';
import ConsentGate from '../ConsentGate';
import { LEGAL_CONSENT_VERSION } from '../../../legal/consentStorage';

const renderGate = () =>
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <ConsentGate />
      </LanguageProvider>
    </AppThemeProvider>,
  );

// Provider'lar (theme hydratsiyasi, AsyncStorage o'qish) birinchi tikda hal bo'lishi uchun
// kichik "tick" beramiz — aks holda waitFor'ning birinchi tekshiruvi ba'zan holatni
// yangilanishidan oldin ishlab, flaky bo'lib qoladi.
const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 50)); });

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('ConsentGate', () => {
  it("rozilik berilmagan bo'lsa modalni ko'rsatadi va ikkala checkbox belgilanmaguncha davom ettirmaydi", async () => {
    renderGate();
    await settle();

    await waitFor(() => expect(screen.getByText('Shartlarga rozilik')).toBeTruthy());

    fireEvent.press(screen.getByText('Roziman va davom etish'));
    expect(screen.getByText('Davom etish uchun ikkala bandni ham tasdiqlang')).toBeTruthy();

    // Faqat bittasini belgilash yetarli emas.
    fireEvent.press(screen.getByText("Men Foydalanish shartlarini o'qidim va ularga roziman."));
    fireEvent.press(screen.getByText('Roziman va davom etish'));
    expect(screen.getByText('Davom etish uchun ikkala bandni ham tasdiqlang')).toBeTruthy();
  });

  it("ikkala checkbox belgilangach davom etish rozilikni saqlaydi va modalni yopadi", async () => {
    renderGate();
    await settle();
    await waitFor(() => expect(screen.getByText('Shartlarga rozilik')).toBeTruthy());

    fireEvent.press(screen.getByText("Men Foydalanish shartlarini o'qidim va ularga roziman."));
    fireEvent.press(screen.getByText('Men Maxfiylik siyosati bilan tanishdim va roziman.'));

    await act(async () => {
      fireEvent.press(screen.getByText('Roziman va davom etish'));
    });

    await waitFor(() => expect(screen.queryByText('Shartlarga rozilik')).toBeNull());
    expect(await AsyncStorage.getItem('legalConsentVersion')).toBe(LEGAL_CONSENT_VERSION);
  });

  it("avval rozilik berilgan bo'lsa modal umuman ko'rinmaydi", async () => {
    await AsyncStorage.setItem('legalConsentVersion', LEGAL_CONSENT_VERSION);
    renderGate();
    await settle();

    expect(screen.queryByText('Shartlarga rozilik')).toBeNull();
  });
});
