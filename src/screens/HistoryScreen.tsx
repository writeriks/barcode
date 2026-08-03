import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HistoryStatusBadge } from '../components/HistoryStatusBadge';
import { getHistory } from '../services/scanHistory';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { HistoryStackParamList } from '../navigation/types';
import type { ScanHistoryEntry } from '../types/history';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryList'>;

export function HistoryScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const [entries, setEntries] = useState<ScanHistoryEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      getHistory().then(setEntries);
    }, [])
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <Text style={styles.title}>{t('history.title')}</Text>
      {entries.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t('history.empty')}</Text>
          <Text style={styles.emptyBody}>{t('history.emptyBody')}</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => `${item.barcode}-${item.timestamp}`}
          contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => navigation.navigate('HistoryDetail', { entry: item })}
            >
              <View style={styles.rowText}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.product?.productName ?? item.barcode}
                </Text>
                <Text style={styles.meta}>
                  {new Date(item.timestamp).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </Text>
              </View>
              <HistoryStatusBadge status={item.status} grade={item.product?.nutriscoreGrade} />
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cabinet,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.cream,
    padding: 20,
    paddingBottom: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 8,
  },
  emptyTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.cream,
  },
  emptyBody: {
    fontSize: 13.5,
    color: colors.cream,
    opacity: 0.6,
    textAlign: 'center',
    maxWidth: 260,
  },
  list: {
    paddingHorizontal: 20,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.panelLine,
    borderRadius: 16,
    padding: 14,
  },
  rowPressed: {
    opacity: 0.75,
  },
  rowText: {
    flex: 1,
  },
  name: {
    fontFamily: fonts.displayBold,
    fontSize: 14.5,
    color: colors.cream,
  },
  meta: {
    fontFamily: fonts.mono,
    fontSize: 10.5,
    color: colors.cream,
    opacity: 0.5,
    marginTop: 3,
  },
});
