import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { BottomSheet } from './BottomSheet';
import { PillButton } from './PillButton';

export interface QrShareParts {
  image: boolean;
  text: boolean;
}

// Long enough for this sheet to be gone before the system share sheet is
// presented. Presenting one native modal while another is dismissing races
// them, and the second one loses.
const DISMISS_MS = 300;

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (parts: QrShareParts) => void;
}

/**
 * Asks what a shared code should carry: the picture, the value, or both.
 *
 * Sharing used to send both every time, which is right for a message to a
 * friend and wrong for a poster. Checkboxes rather than a row per
 * combination, because "both" is a pair of choices rather than a third
 * thing — and it's the pair people reach for most, so it starts ticked.
 */
export function QrShareSheet({ visible, onClose, onConfirm }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [parts, setParts] = useState<QrShareParts>({ image: true, text: true });

  // Back to both whenever the sheet is asked for again: last time's
  // choice is a poor guess at this time's, and an image-only sheet that
  // silently stayed image-only would look like the text went missing.
  useEffect(() => {
    if (visible) setParts({ image: true, text: true });
  }, [visible]);

  const toggle = (key: keyof QrShareParts) => setParts((current) => ({ ...current, [key]: !current[key] }));

  const confirm = () => {
    onClose();
    setTimeout(() => onConfirm(parts), DISMISS_MS);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('qr.sharePartsTitle')}
      footer={
        <PillButton
          title={t('qr.shareContinue')}
          onPress={confirm}
          disabled={!parts.image && !parts.text}
        />
      }
    >
      <View style={styles.list}>
        <Option
          checked={parts.image}
          icon="qr-code-outline"
          tint={colors.mintText}
          title={t('qr.sharePartImage')}
          body={t('qr.sharePartImageBody')}
          onPress={() => toggle('image')}
          styles={styles}
        />
        <Option
          checked={parts.text}
          icon="text-outline"
          tint={colors.citrusText}
          title={t('qr.sharePartText')}
          body={t('qr.sharePartTextBody')}
          onPress={() => toggle('text')}
          styles={styles}
        />
      </View>
    </BottomSheet>
  );
}

type Styles = ReturnType<typeof createStyles>;

function Option({
  checked,
  icon,
  tint,
  title,
  body,
  onPress,
  styles,
}: {
  checked: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  title: string;
  body: string;
  onPress: () => void;
  styles: Styles;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      style={({ pressed }) => [styles.row, checked && styles.rowChecked, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconBadge, { borderColor: tint }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowBody}>{body}</Text>
      </View>
      <Ionicons
        name={checked ? 'checkbox' : 'square-outline'}
        size={22}
        color={tint}
        style={[styles.check, !checked && styles.checkOff]}
      />
    </Pressable>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    list: {
      gap: 10,
      paddingBottom: 6,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    rowChecked: {
      borderColor: colors.mint,
    },
    rowPressed: {
      opacity: 0.75,
    },
    iconBadge: {
      width: 42,
      height: 42,
      borderRadius: 14,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 15,
      color: colors.text,
    },
    rowBody: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.6,
      marginTop: 2,
    },
    check: {
      marginLeft: 2,
    },
    checkOff: {
      color: colors.text,
      opacity: 0.35,
    },
  });
}
