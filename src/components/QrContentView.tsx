import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQrShare } from '../hooks/useQrShare';
import { captureAnalyticsEvent } from '../services/analytics';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { classifyQrContent, parseOtpAuth, resolveQrOpenUri, type QrContentType } from '../utils/classifyQrContent';
import { QR_TYPE_ICON, QR_TYPE_LABEL_KEY } from '../utils/qrTypeMeta';
import { inspectUrl } from '../utils/urlSafety';
import { fonts } from '../theme/fonts';
import { PillButton } from './PillButton';
import { StyledQrCode } from './StyledQrCode';

function typeColor(colors: ColorTheme, type: QrContentType): string {
  switch (type) {
    case 'link':
    case 'email':
    case 'phone':
    case 'zoom':
    case 'facebook':
    case 'twitter':
    case 'location':
    case 'paypal':
    case 'telegram':
    case 'appstore':
    case 'dropbox':
      return colors.mintText;
    case 'sms':
    case 'whatsapp':
    case 'instagram':
    case 'viber':
    case 'upi':
    case 'tiktok':
    case 'youtube':
    case 'pinterest':
      return colors.coralText;
    case 'otp':
      return colors.punch;
    case 'text':
    case 'wifi':
    case 'vcard':
    case 'event':
    case 'spotify':
    case 'mecard':
    case 'linkedin':
    case 'drive':
      return colors.citrusText;
  }
}

const OPEN_LABEL_KEY: Record<QrContentType, string> = {
  link: 'qr.openLink',
  email: 'qr.openEmail',
  phone: 'qr.callNumber',
  sms: 'qr.sendSms',
  whatsapp: 'qr.openWhatsapp',
  zoom: 'qr.openZoom',
  wifi: 'qr.openLink',
  vcard: 'qr.openLink',
  event: 'qr.openLink',
  otp: 'qr.openLink',
  text: 'qr.openLink',
  facebook: 'qr.openLink',
  instagram: 'qr.openLink',
  twitter: 'qr.openLink',
  spotify: 'qr.openLink',
  viber: 'qr.openLink',
  location: 'qr.openLocation',
  mecard: 'qr.openLink',
  upi: 'qr.openUpi',
  paypal: 'qr.openLink',
  linkedin: 'qr.openLink',
  tiktok: 'qr.openLink',
  youtube: 'qr.openLink',
  telegram: 'qr.openLink',
  pinterest: 'qr.openLink',
  appstore: 'qr.openLink',
  drive: 'qr.openLink',
  dropbox: 'qr.openLink',
};

const SECRET_MASK = '•••• •••• •••• ••••';

interface Props {
  data: string;
  onCopied?: () => void;
}

/** Shared QR presentation: the code itself, a content-type chip, the raw
 * decoded value, and type-aware actions. Used both by the live scan result
 * and by the read-only History detail view. */
export function QrContentView({ data, onCopied }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const type = classifyQrContent(data);
  const color = typeColor(colors, type);
  const openUri = resolveQrOpenUri(data, type);
  const otpInfo = type === 'otp' ? parseOtpAuth(data) : null;
  const [isSecretRevealed, setIsSecretRevealed] = useState(false);
  // Worked out from the address itself — no lookup, nothing leaves the
  // device. See utils/urlSafety.ts for why it never says "safe".
  const urlWarnings = useMemo(() => inspectUrl(data), [data]);
  const { shareQr, qrRenderer } = useQrShare();

  const handleOpen = async () => {
    if (!openUri) return;
    captureAnalyticsEvent('qr_action', { action: 'open', contentType: type });
    const supported = await Linking.canOpenURL(openUri);
    if (supported) {
      Linking.openURL(openUri);
    }
  };

  const handleCopy = async () => {
    captureAnalyticsEvent('qr_action', { action: otpInfo ? 'copy_secret' : 'copy', contentType: type });
    await Clipboard.setStringAsync(otpInfo ? otpInfo.secret : data);
    onCopied?.();
  };

  const handleShare = () => {
    captureAnalyticsEvent('qr_action', { action: 'share', contentType: type });
    // Same as My Codes: send the scannable image along with the value, so
    // whoever receives it can point a camera at it instead of retyping.
    shareQr(data);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.qrCard}>
        <StyledQrCode value={data} size={190} />
      </View>

      <View style={[styles.typeChip, { borderColor: color }]}>
        <Ionicons name={QR_TYPE_ICON[type]} size={13} color={color} />
        <Text style={[styles.typeChipText, { color }]}>{t(QR_TYPE_LABEL_KEY[type])}</Text>
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
        <Pressable
          onPress={handleCopy}
          style={({ pressed }) => [styles.contentCard, pressed && styles.contentCardPressed]}
        >
          <View style={styles.contentLabelRow}>
            <Text style={styles.contentLabel}>{t('qr.decodedContent')}</Text>
            <Ionicons name="copy-outline" size={13} color={colors.text} style={styles.contentCopyIcon} />
          </View>
          <Text style={[styles.contentValue, type !== 'text' && styles.contentValueLink]}>{data}</Text>
        </Pressable>
      )}

      {urlWarnings.length > 0 ? (
        <View style={styles.warningCard}>
          <View style={styles.warningHeader}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.citrusText} />
            <Text style={styles.warningTitle}>{t('qr.linkCheckTitle')}</Text>
          </View>
          {urlWarnings.map((warning) => (
            <Text key={warning} style={styles.warningText}>
              {t(`qr.linkWarning.${warning}`)}
            </Text>
          ))}
        </View>
      ) : null}

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
      {qrRenderer}
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      width: '100%',
      alignItems: 'center',
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
    warningCard: {
      alignSelf: 'stretch',
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.citrusText,
      borderRadius: 16,
      padding: 14,
      gap: 7,
    },
    warningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    warningTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 13,
      color: colors.citrusText,
    },
    warningText: {
      fontSize: 12.5,
      lineHeight: 18,
      color: colors.text,
      opacity: 0.75,
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
      alignSelf: 'stretch',
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      padding: 14,
    },
    contentCardPressed: {
      opacity: 0.7,
    },
    contentLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    contentCopyIcon: {
      opacity: 0.55,
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
      alignSelf: 'stretch',
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
