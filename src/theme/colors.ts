/** The "Blippo" arcade palette — same accent hues (punch/citrus/mint/coral)
 * in both themes, since those are the brand; only the neutrals (cabinet
 * background, panel, text) flip between the dark and light variants. */
export interface ColorTheme {
  cabinet: string;
  cabinetGlow: string;
  panel: string;
  panelLine: string;
  /** Primary on-screen text — reactive (cream in dark mode, ink in light). */
  text: string;
  punch: string;
  citrus: string;
  /** Deepened citrus for AA contrast when used as text on a light panel;
   * equals `citrus` in dark mode where the bright hue already glows fine. */
  citrusText: string;
  mint: string;
  mintText: string;
  coral: string;
  coralText: string;
  /** Fixed, non-reactive: dark ink used as text on a bright accent fill
   * (citrus buttons) or as the QR code's foreground ink — identical in
   * both themes since the surfaces it sits on don't change either. */
  inkOnCream: string;
  /** Fixed, non-reactive: the near-white used as text on a saturated
   * accent fill (punch buttons) or as the QR code's paper background —
   * a QR needs a light card to read reliably regardless of app theme. */
  cream: string;
}

export const darkColors: ColorTheme = {
  cabinet: '#1b1330',
  cabinetGlow: '#2a1f4d',
  panel: '#241a3d',
  panelLine: 'rgba(255,255,255,0.09)',
  text: '#fff6e9',
  punch: '#ff3e7f',
  citrus: '#ffd23f',
  citrusText: '#ffd23f',
  mint: '#2fe6b8',
  mintText: '#2fe6b8',
  coral: '#ff5a5a',
  coralText: '#ff5a5a',
  inkOnCream: '#241933',
  cream: '#fff6e9',
};

export const lightColors: ColorTheme = {
  cabinet: '#fdf8f0',
  cabinetGlow: '#f3ecf9',
  panel: '#ffffff',
  panelLine: 'rgba(36,25,51,0.10)',
  text: '#241933',
  punch: '#ff3e7f',
  citrus: '#ffd23f',
  citrusText: '#b3860a',
  mint: '#2fe6b8',
  mintText: '#10a381',
  coral: '#ff5a5a',
  coralText: '#e13f3f',
  inkOnCream: '#241933',
  cream: '#fff6e9',
};
