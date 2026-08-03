import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { classifyQrContent, resolveQrOpenUri, type QrContentType } from '../utils/classifyQrContent';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import { PillButton } from './PillButton';

const TYPE_ICON: Record<QrContentType, keyof typeof Ionicons.glyphMap> = {
  link: 'link-outline',
  email: 'mail-outline',
  phone: 'call-outline',
  text: 'document-text-outline',
};

const TYPE_COLOR: Record<QrContentType, string> = {
  link: colors.mint,
  email: colors.mint,
  phone: colors.mint,
  text: colors.citrus,
};

const TYPE_LABEL_KEY: Record<QrContentType, string> = {
  link: 'qr.typeLink',
  email: 'qr.typeEmail',
  phone: 'qr.typePhone',
  text: 'qr.typeText',
};

const OPEN_LABEL_KEY: Record<QrContentType, string> = {
  link: 'qr.openLink',
  email: 'qr.openEmail',
  phone: 'qr.callNumber',
  text: 'qr.openLink',
};

interface Props {
  data: string;
}

/** Shared QR presentation: the code itself, a content-type chip, the raw
 * decoded value, and type-aware actions. Used both by the live scan result
 * and by the read-only History detail view. */
export function QrContentView({ data }: Props) {
  const { t } = useTranslation();
  const type = classifyQrContent(data);
  const color = TYPE_COLOR[type];
  const openUri = resolveQrOpenUri(data, type);

  const handleOpen = async () => {
    if (!openUri) return;
    const supported = await Linking.canOpenURL(openUri);
    if (supported) {
      Linking.openURL(openUri);
    }
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(data);
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

      <View style={styles.contentCard}>
        <Text style={styles.contentLabel}>{t('qr.decodedContent')}</Text>
        <Text style={[styles.contentValue, type !== 'text' && styles.contentValueLink]}>{data}</Text>
      </View>

      <View style={styles.actions}>
        {openUri ? <PillButton title={t(OPEN_LABEL_KEY[type])} onPress={handleOpen} variant="punch" /> : null}
        <View style={styles.actionRow}>
          <PillButton title={t('qr.copy')} onPress={handleCopy} variant="ghost" style={styles.flexButton} />
          <PillButton title={t('qr.share')} onPress={handleShare} variant="ghost" style={styles.flexButton} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.cream,
    opacity: 0.55,
    marginBottom: 5,
  },
  contentValue: {
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.cream,
  },
  contentValueLink: {
    color: colors.mint,
    textDecorationLine: 'underline',
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
