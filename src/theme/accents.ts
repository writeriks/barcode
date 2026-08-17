import type { ColorTheme } from './colors';

/** The four accent colors the app tints things with — filter pills, type
 * badges, anything that wants to read as its own category at a glance. */
export type PillAccent = 'punch' | 'citrus' | 'mint' | 'coral';

/** The readable, text-weight version of an accent. The raw `colors.punch`
 * family is tuned for fills; these are the variants that stay legible as
 * a foreground color in both themes. */
export function accentTextColor(colors: ColorTheme, accent: PillAccent): string {
  switch (accent) {
    case 'punch':
      return colors.punch;
    case 'citrus':
      return colors.citrusText;
    case 'mint':
      return colors.mintText;
    case 'coral':
      return colors.coralText;
  }
}
