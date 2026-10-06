import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { act, render, screen } from '@testing-library/react-native';
import EntranceView from '../EntranceView';

/**
 * Kirish animatsiyasi tugagach web'da opacity/transform QOLMASLIGI kerak:
 * ular qolsa Chromium ichkaridagi scroller'dagi backdrop-filter'ni qayta
 * hisoblamaydi va muzli karta (ContactDetail tarixi) rasmni keskin
 * ko'rsatib qoladi.
 */
const wrapperStyle = () => {
  // Matnning eng yaqin uslubli ota tuguni - EntranceView'ning Animated.View'i.
  let node = screen.getByText('kontent').parent;
  while (node && !node.props.style) node = node.parent;
  return (StyleSheet.flatten(node?.props.style) ?? {}) as Record<string, unknown>;
};

const show = () =>
  render(
    <EntranceView style={{ flex: 1 }} duration={200} delay={50} fromY={12} fromScale={0.97}>
      <Text>kontent</Text>
    </EntranceView>,
  );

describe('EntranceView', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("web: animatsiya tugagach opacity va transform olib tashlanadi", () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    show();

    expect(wrapperStyle()).toHaveProperty('opacity');
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const style = wrapperStyle();
    expect(style.flex).toBe(1);
    expect(style).not.toHaveProperty('opacity');
    expect(style).not.toHaveProperty('transform');
    // Bolalar qayta mount bo'lmaydi - kontent joyida.
    expect(screen.getByText('kontent')).toBeTruthy();
  });

  it("web: animatsiya tugamay unmount bo'lsa xato yo'q", () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    const errors = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const view = show();

    view.unmount();
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(errors).not.toHaveBeenCalled();
  });

  it("native: animatsiya uslubi o'zgarmaydi (native driver)", () => {
    show();
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const style = wrapperStyle();
    expect(style).toHaveProperty('opacity');
    expect(style).toHaveProperty('transform');
  });
});
