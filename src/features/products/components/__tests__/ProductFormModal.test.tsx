import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppThemeProvider } from '../../../../shared/theme';
import { LanguageProvider } from '../../../../shared/i18n';
import ProductFormModal, { type ProductFormValues } from '../ProductFormModal';
import type { ProductResponseDTO } from '../../types/product';

const CATEGORIES = [
  { id: 'c1', name: 'Ichimlik' },
  { id: 'c2', name: 'Nonushta' },
];

const renderForm = (props: Partial<React.ComponentProps<typeof ProductFormModal>> = {}) => {
  const onSubmit = jest.fn<Promise<boolean>, [ProductFormValues]>().mockResolvedValue(true);
  render(
    <AppThemeProvider>
      <LanguageProvider>
        <ProductFormModal
          visible
          mode="create"
          submitting={false}
          categories={CATEGORIES}
          onClose={jest.fn()}
          onSubmit={onSubmit}
          {...props}
        />
      </LanguageProvider>
    </AppThemeProvider>,
  );
  return { onSubmit };
};

const settle = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 20));
  });

/** Formani to'ldirib saqlaydi — kategoriyaga TEGMAYDI. */
const fillAndSave = async () => {
  fireEvent.changeText(screen.getByPlaceholderText('Masalan: Tandir non'), 'Choy');
  fireEvent.changeText(screen.getByPlaceholderText('0'), '12000');
  await settle();
  // Yaratish rejimida tugma "Qo'shish", tahrirlashda "Saqlash".
  fireEvent.press(screen.getByText("Qo'shish"));
  await settle();
};

describe('ProductFormModal — kategoriya standart qiymati', () => {
  it("filtr kategoriyada tursa, yangi mahsulot O'SHA kategoriyaga tushadi", async () => {
    const { onSubmit } = renderForm({ defaultCategoryId: 'c1' });
    await settle();

    await fillAndSave();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'c1' }));
  });

  it('filtr "Hammasi"da bo\'lsa kategoriyasiz qoladi', async () => {
    const { onSubmit } = renderForm({ defaultCategoryId: '' });
    await settle();

    await fillAndSave();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: '' }));
  });

  it('standart qiymat majburiy emas — boshqasini tanlash mumkin', async () => {
    const { onSubmit } = renderForm({ defaultCategoryId: 'c1' });
    await settle();

    fireEvent.press(screen.getByText('Nonushta'));
    await settle();
    await fillAndSave();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'c2' }));
  });

  it('standart qiymat bo\'lsa ham "Kategoriyasiz" ga qaytarish mumkin', async () => {
    const { onSubmit } = renderForm({ defaultCategoryId: 'c1' });
    await settle();

    fireEvent.press(screen.getByText('Kategoriyasiz'));
    await settle();
    await fillAndSave();

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: '' }));
  });

  it("TAHRIRLASHDA standart qiymat emas, mahsulotning o'z kategoriyasi olinadi", async () => {
    const existing = {
      id: 'p1',
      businessId: 'b1',
      name: 'Non',
      price: 3500,
      categoryId: 'c2',
      categoryName: 'Nonushta',
    } as ProductResponseDTO;

    const { onSubmit } = renderForm({ mode: 'edit', initial: existing, defaultCategoryId: 'c1' });
    await settle();

    fireEvent.press(screen.getByText('Saqlash'));
    await settle();

    // Filtr 'c1' da tursa ham, mahsulot o'z kategoriyasida qoladi.
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ categoryId: 'c2' }));
  });
});
