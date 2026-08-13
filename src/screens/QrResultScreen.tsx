import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { PillButton } from '../components/PillButton';
import { QrContentView } from '../components/QrContentView';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';

interface Props {
  data: string;
  onScanAgain: () => void;
}

export function QrResultScreen({ data, onScanAgain }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { message: toastMessage, showToast } = useToast();

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <QrContentView data={data} onCopied={() => showToast(t('qr.copied'))} />
        <PillButton title={t('qr.scanAgain')} onPress={onScanAgain} variant="ghost" />
      </ScrollView>
      <BottomBannerAd />
      <Toast message={toastMessage} bottom={tabBarHeight + 80} />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    content: {
      padding: 20,
      paddingTop: 32,
      gap: 16,
    },
  });
}
