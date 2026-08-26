import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { usePremium } from '../premium/PremiumContext';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { brandLogoFor } from '../utils/brandLogos';
import type { QrContentType } from '../utils/classifyQrContent';
import { DEFAULT_QR_COLOR, hueToQrColor, qrColorToHue } from '../utils/qrColor';
import { HueSlider } from './HueSlider';

/** Long enough for "Bizi beğen" or "Menü için tara", short enough to sit
 *  on one line under the code without shrinking the type. */
export const MAX_CAPTION_LENGTH = 15;

export interface QrAppearance {
  color?: string;
  caption?: string;
  logo?: boolean;
}

interface Props {
  type: QrContentType;
  value: QrAppearance;
  onChange: (value: QrAppearance) => void;
  /** Open state is owned by the form, so opening this collapses whatever
   *  else was expanded — a sheet full of open accordions is unusable. */
  isOpen: boolean;
  onToggle: () => void;
  /** False once the content is long enough to have dropped the code below
   *  error-correction level H, where a logo would cover modules the code
   *  can no longer rebuild. */
  canCarryLogo: boolean;
  /** Free users. The generator form is itself a native Modal, so the
   *  parent has to dismiss that sheet before presenting the paywall or
   *  iOS swallows the second presentation. */
  onLockedPress?: () => void;
}

/**
 * The half of a code's editor that decides how it looks, rather than what
 * it says.
 *
 * Folded away by default. A vCard's form is already twenty-one fields, and
 * most codes never need any of this — the plain black code is a perfectly
 * good code.
 *
 * It is also the one part of the generator behind premium, and the reason
 * no content type is. What this section adds is additive — a free user
 * still gets a working, scannable code, just a plain one — and there is no
 * way to get a coloured code with a brand mark in it by picking some other
 * type instead. A locked social type taught people to use Link; a locked
 * palette has nothing to teach.
 */
export function QrAppearanceSection({ type, value, onChange, isOpen, onToggle, canCarryLogo, onLockedPress }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const { isPremium, openPaywall } = usePremium();

  const brand = brandLogoFor(type);
  const hue = qrColorToHue(value.color ?? DEFAULT_QR_COLOR);
  const isCustomized = Boolean(value.color || value.caption?.trim() || value.logo);
  // Shown rather than hidden: the row is the whole advert for what premium
  // does to a code, and a feature nobody can see is one nobody buys.
  const expanded = isOpen && isPremium;

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={isPremium ? onToggle : (onLockedPress ?? (() => openPaywall('customization')))}
        style={[styles.header, expanded && styles.headerOpen]}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <Ionicons name="color-palette-outline" size={17} color={expanded ? colors.mint : colors.text} />
        <Text style={styles.headerLabel}>{t('myCodes.appearance')}</Text>
        {isCustomized && !expanded ? (
          <View style={[styles.dot, { backgroundColor: value.color ?? colors.mint }]} />
        ) : null}
        {isPremium ? (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={colors.text}
            style={styles.chevron}
          />
        ) : (
          <View style={styles.lockBadge}>
            <Ionicons name="lock-closed" size={9} color={colors.inkOnCream} />
          </View>
        )}
      </Pressable>

      {expanded ? (
        <View style={styles.body}>
          <View style={styles.control}>
            <Text style={styles.label}>{t('myCodes.colorLabel')}</Text>
            <HueSlider hue={hue} onChange={(next) => onChange({ ...value, color: hueToQrColor(next) })} />
          </View>

          <View style={styles.control}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>{t('myCodes.captionLabel')}</Text>
              <Text style={styles.count}>
                {(value.caption ?? '').length} / {MAX_CAPTION_LENGTH}
              </Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('myCodes.captionPlaceholder')}
              placeholderTextColor={placeholderColor}
              value={value.caption ?? ''}
              onChangeText={(caption) => onChange({ ...value, caption })}
              maxLength={MAX_CAPTION_LENGTH}
            />
          </View>

          {brand ? (
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={styles.toggleLabel}>{t('myCodes.logoLabel')}</Text>
                <Text style={styles.toggleSub}>
                  {canCarryLogo ? t('myCodes.logoDescription') : t('myCodes.logoUnavailable')}
                </Text>
              </View>
              <Switch
                value={Boolean(value.logo) && canCarryLogo}
                onValueChange={(logo) => onChange({ ...value, logo })}
                disabled={!canCarryLogo}
                trackColor={{ false: colors.panelLine, true: colors.mint }}
                thumbColor={colors.cream}
              />
            </View>
          ) : null}

          {isCustomized ? (
            <Pressable
              onPress={() => onChange({})}
              style={({ pressed }) => [styles.reset, pressed && styles.resetPressed]}
            >
              <Ionicons name="refresh" size={14} color={colors.text} style={styles.resetIcon} />
              <Text style={styles.resetLabel}>{t('myCodes.resetAppearance')}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    headerOpen: {
      borderColor: colors.mint,
    },
    headerLabel: {
      flex: 1,
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    chevron: {
      opacity: 0.55,
    },
    // The same badge the type picker used to wear, in the one place a lock
    // now belongs. Citrus rather than muted: it is an offer, not a fault.
    lockBadge: {
      width: 15,
      height: 15,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.citrus,
    },
    body: {
      gap: 14,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      padding: 14,
    },
    control: {
      gap: 7,
    },
    labelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    label: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.65,
    },
    count: {
      fontFamily: fonts.mono,
      fontSize: 10.5,
      color: colors.text,
      opacity: 0.4,
    },
    input: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    toggleText: {
      flex: 1,
    },
    toggleLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 13.5,
      color: colors.text,
    },
    toggleSub: {
      fontSize: 11.5,
      color: colors.text,
      opacity: 0.5,
      marginTop: 2,
    },
    reset: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingVertical: 8,
    },
    resetPressed: {
      opacity: 0.6,
    },
    resetIcon: {
      opacity: 0.55,
    },
    resetLabel: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.65,
    },
  });
}
