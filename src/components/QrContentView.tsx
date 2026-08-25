import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQrShare } from '../hooks/useQrShare';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { captureAnalyticsEvent } from '../services/analytics';
import { addContactToDevice, addEventToCalendar } from '../services/structuredQrHandoff';
import { classifyQrContent, parseOtpAuth, resolveQrOpenUri, type QrContentType } from '../utils/classifyQrContent';
import { findCountryByRegionCode } from '../utils/countryCallingCodes';
import { getDeviceRegionCode } from '../utils/locale';
import { describeQrContent } from '../utils/structuredQrDetails';
import { preferredMapUri } from '../utils/mapLinks';
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

/** Types iOS has a screen for, so the app can hand the payload over
 *  instead of only showing it. Wi-Fi is not one of them: iOS exposes no way
 *  to join a network from an app, so the most useful thing there is the
 *  password, which the card shows. */
const HANDOFF_LABEL_KEY: Partial<Record<QrContentType, string>> = {
  event: 'qr.addToCalendar',
  vcard: 'qr.addToContacts',
  mecard: 'qr.addToContacts',
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
  const { t, i18n } = useTranslation();
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
  // Structured payloads — an event, a contact, a network — read as a card
  // of fields rather than as the raw text they are encoded in.
  const deviceCountry = useMemo(() => findCountryByRegionCode(getDeviceRegionCode()) ?? null, []);
  const details = useMemo(
    () => describeQrContent(data, type, i18n.language, deviceCountry),
    [data, type, i18n.language, deviceCountry]
  );
  const [areSecretsRevealed, setSecretsRevealed] = useState(false);

  const handleOpen = async () => {
    if (!openUri) return;
    captureAnalyticsEvent('qr_action', { action: 'open', contentType: type });
    // A place opens in whichever map app this phone actually has, which
    // isn't something the link inside the code can know — see mapLinks.
    const target = type === 'location' ? await preferredMapUri(data, openUri) : openUri;
    const supported = await Linking.canOpenURL(target);
    if (supported) {
      Linking.openURL(target);
    }
  };

  const handleCopy = async () => {
    captureAnalyticsEvent('qr_action', { action: otpInfo ? 'copy_secret' : 'copy', contentType: type });
    await Clipboard.setStringAsync(otpInfo ? otpInfo.secret : data);
    onCopied?.();
  };

  // A refusal is the one outcome worth saying something about: the screen
  // simply not appearing looks like the button is broken. Everything else
  // the user has already seen happen in front of them.
  const showDenied = (titleKey: string, bodyKey: string) => {
    Alert.alert(t(titleKey), t(bodyKey), [
      { text: t('qr.permissionDeniedDismiss'), style: 'cancel' },
      { text: t('qr.permissionDeniedOpen'), onPress: () => Linking.openSettings() },
    ]);
  };

  // An event opens the calendar's own new-event screen, a contact opens
  // Contacts' own new-contact screen. Both are filled in and neither is
  // saved by the app — see services/structuredQrHandoff.
  const handleAddToDevice = async () => {
    captureAnalyticsEvent('qr_action', { action: 'add_to_device', contentType: type });
    if (type === 'event') {
      if ((await addEventToCalendar(data)) === 'denied') {
        showDenied('qr.calendarDeniedTitle', 'qr.calendarDeniedBody');
      }
      return;
    }
    if ((await addContactToDevice(data, type, deviceCountry)) === 'denied') {
      showDenied('qr.contactsDeniedTitle', 'qr.contactsDeniedBody');
    }
  };

  const handleShare = () => {
    captureAnalyticsEvent('qr_action', { action: 'share', contentType: type });
    // Same as My Codes: asks whether to send the scannable image, the
    // value, or both.
    shareQr(data, undefined, type);
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
      ) : details ? (
        <View style={styles.contentCard}>
          {details.title ? <Text style={styles.detailTitle}>{details.title}</Text> : null}
          {details.rows.map((detail) => {
            const [key, count] = detail.value.split('|');
            const isKey = detail.labelKey === 'qr.eventReminder' || detail.value.startsWith('qr.');
            const shown = isKey ? t(key, { count: Number(count) }) : detail.value;
            const hidden = detail.secret && !areSecretsRevealed;
            return (
              <View key={detail.labelKey} style={styles.detailRow}>
                <Text style={styles.contentLabel}>{t(detail.labelKey)}</Text>
                <View style={styles.detailValueRow}>
                  <Text style={styles.detailValue} selectable={!hidden}>
                    {hidden ? SECRET_MASK : shown}
                  </Text>
                  {detail.secret ? (
                    <Pressable onPress={() => setSecretsRevealed((prev) => !prev)} hitSlop={8}>
                      <Ionicons
                        name={areSecretsRevealed ? 'eye-off-outline' : 'eye-outline'}
                        size={17}
                        color={colors.text}
                        style={styles.otpRevealIcon}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })}
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
        {HANDOFF_LABEL_KEY[type] ? (
          <PillButton
            title={t(HANDOFF_LABEL_KEY[type] as string)}
            onPress={handleAddToDevice}
            variant="punch"
            icon={type === 'event' ? 'calendar-outline' : 'person-add-outline'}
          />
        ) : null}
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
    detailTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.text,
      marginBottom: 4,
    },
    detailRow: {
      gap: 2,
      marginTop: 10,
    },
    detailValueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailValue: {
      flex: 1,
      fontSize: 14.5,
      lineHeight: 20,
      color: colors.text,
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
