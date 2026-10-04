import { titleOutline } from '../textOutline';

/**
 * Sarlavha konturi matnga QARAMA-QARSHI rangda.
 *
 * Shu sababli u har qanday fonda ishlaydi: bezakli naqsh bo'ladimi,
 * ixtiyoriy fotosuratmi - sarlavha chetlari bilan ajralib turadi.
 */
describe('titleOutline', () => {
  it('yorugda oq, qorongida qora', () => {
    expect(titleOutline(false).textShadowColor).toBe('#FFFFFF');
    expect(titleOutline(true).textShadowColor).toBe('#000000');
  });

  /** Kontur harf qirrasiga yopishadi - siljish yo'q, radius kichik. */
  it('tor va markazlashgan', () => {
    const outline = titleOutline(false);

    expect(outline.textShadowOffset).toEqual({ width: 0, height: 0 });
    expect(outline.textShadowRadius).toBeLessThanOrEqual(2);
    expect(outline.textShadowRadius).toBeGreaterThan(0);
  });
});
