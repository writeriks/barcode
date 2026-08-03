import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { PillButton } from '../components/PillButton';
import { QrContentView } from '../components/QrContentView';
import { colors } from '../theme/colors';

interface Props {
  data: string;
  onScanAgain: () => void;
}

export function QrResultScreen({ data, onScanAgain }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <View style={[styles.screen, { paddingBottom: tabBarHeight }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <QrContentView data={data} />
        <PillButton title={t('qr.scanAgain')} onPress={onScanAgain} variant="ghost" />
      </ScrollView>
      <BottomBannerAd />
    </View>
  );
}

const styles = StyleSheet.create({
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
