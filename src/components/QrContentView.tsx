import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { classifyQrContent, parseOtpAuth, resolveQrOpenUri, type QrContentType } from '../utils/classifyQrContent';
import { fonts } from '../theme/fonts';
import { PillButton } from './PillButton';

const TYPE_ICON: Record<QrContentType, keyof typeof Ionicons.glyphMap> = {
  link: 'link-outline',
  email: 'mail-outline',
  phone: 'call-outline',
  otp: 'key-outline',
  text: 'document-text-outline',
};

function typeColor(colors: ColorTheme, type: QrContentType): string {
  switch (type) {
    case 'link':
    case 'email':
    case 'phone':
      return colors.mintText;
    case 'otp':
      return colors.punch;
    case 'text':
      return colors.citrusText;
  }
}

const TYPE_LABEL_KEY: Record<QrContentType, string> = {
  link: 'qr.typeLink',
  email: 'qr.typeEmail',
  phone: 'qr.typePhone',
  otp: 'qr.typeOtp',
  text: 'qr.typeText',
};

const OPEN_LABEL_KEY: Record<QrContentType, string> = {
  link: 'qr.openLink',
  email: 'qr.openEmail',
  phone: 'qr.callNumber',
  otp: 'qr.openLink',
  text: 'qr.openLink',
};

const SECRET_MASK = '•••• •••• •••• ••••';

interface Props {
  data: string;
}

/** Shared QR presentation: the code itself, a content-type chip, the raw
 * decoded value, and type-aware actions. Used both by the live scan result
 * and by the read-only History detail view. */
export function QrContentView({ data }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const type = classifyQrContent(data);
  const color = typeColor(colors, type);
  const openUri = resolveQrOpenUri(data, type);
  const otpInfo = type === 'otp' ? parseOtpAuth(data) : null;
  const [isSecretRevealed, setIsSecretRevealed] = useState(false);

  const handleOpen = async () => {
    if (!openUri) return;
    const supported = await Linking.canOpenURL(openUri);
    if (supported) {
      Linking.openURL(openUri);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(otpInfo ? otpInfo.secret : data);
    Alert.alert(t('qr.copied'));
  };

  const handleShare = () => {
    Share.share({ message: data });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.qrCard}>
        <QRCode value={data} size={62} color={colors.inkOnCream} backgroundColor={colors.cream} />
      </View>

      <View style={[styles.typeChip, { borderColor: color }]}>
        <Ionicons name={TYPE_ICON[type]} size={13} color={color} />
        <Text style={[styles.typeChipText, { color }]}>{t(TYPE_LABEL_KEY[type])}</Text>
      </View>

      {otpInfo ? (
        <View style={styles.contentCard}>
          <Text style={styles.contentLabel}>{t('qr.otpAccount')}</Text>
          <Text style={styles.otpAccountValue}>{otpInfo.accountName ?? t('qr.otpUnknownAccount')}</Text>
          {otpInfo.issuer ? <Text style={styles.otpIssuerValue}>{otpInfo.issuer}</Text> : null}

          <View style={styles.otpDivider} />

          <Text style={styles.contentLabel}>{t('qr.otpSecret')}</Text>
          <View style={styles.otpSecretRow}>
            <Text style={styles.otpSecretValue}>{isSecretRevealed ? otpInfo.secret : SECRET_MASK}</Text>
            <Pressable onPress={() => setIsSecretRevealed((prev) => !prev)} hitSlop={8}>
              <Ionicons
                name={isSecretRevealed ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.text}
                style={styles.otpRevealIcon}
              />
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.contentCard}>
          <Text style={styles.contentLabel}>{t('qr.decodedContent')}</Text>
          <Text style={[styles.contentValue, type !== 'text' && styles.contentValueLink]}>{data}</Text>
        </View>
      )}

      <View style={styles.actions}>
        {openUri ? <PillButton title={t(OPEN_LABEL_KEY[type])} onPress={handleOpen} variant="punch" /> : null}
        <View style={styles.actionRow}>
          <PillButton
            title={t(otpInfo ? 'qr.copySecret' : 'qr.copy')}
            onPress={handleCopy}
            variant="ghost"
            style={styles.flexButton}
          />
          <PillButton title={t('qr.share')} onPress={handleShare} variant="ghost" style={styles.flexButton} />
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      gap: 14,
    },
    qrCard: {
      alignSelf: 'center',
      backgroundColor: colors.cream,
      borderWidth: 2.5,
      borderColor: colors.mint,
      borderRadius: 14,
      padding: 8,
    },
    typeChip: {
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 13,
      paddingVertical: 6,
    },
    typeChipText: {
      fontFamily: fonts.mono,
      fontSize: 10,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    contentCard: {
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      padding: 14,
    },
    contentLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 10.5,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: colors.text,
      opacity: 0.55,
      marginBottom: 5,
    },
    contentValue: {
      fontSize: 13.5,
      lineHeight: 19,
      color: colors.text,
    },
    contentValueLink: {
      color: colors.mintText,
      textDecorationLine: 'underline',
    },
    otpAccountValue: {
      fontFamily: fonts.displayBold,
      fontSize: 15,
      color: colors.text,
    },
    otpIssuerValue: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.6,
      marginTop: 2,
    },
    otpDivider: {
      height: 1,
      backgroundColor: colors.panelLine,
      marginVertical: 12,
    },
    otpSecretRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    otpSecretValue: {
      fontFamily: fonts.mono,
      fontSize: 14,
      letterSpacing: 1,
      color: colors.text,
    },
    otpRevealIcon: {
      opacity: 0.7,
    },
    actions: {
      gap: 10,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    flexButton: {
      flex: 1,
    },
  });
}
