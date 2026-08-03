import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HistoryStackParamList } from '../navigation/types';
import { FoundProductScreen } from './FoundProductScreen';
import { MissingProductScreen } from './MissingProductScreen';
import { QrResultScreen } from './QrResultScreen';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryDetail'>;

/** Re-renders the exact same screen the live scan flow would have shown —
 * a past scan should look identical to a fresh one, not a stripped-down
 * summary of it. "Scan again" just returns to this list instead of
 * resetting a scan flow that doesn't exist here. */
export function HistoryDetailScreen({ route, navigation }: Props) {
  const { entry } = route.params;
  const goBack = () => navigation.goBack();

  if (entry.kind === 'qr') {
    return <QrResultScreen data={entry.data} onScanAgain={goBack} />;
  }

  if (entry.product) {
    return <FoundProductScreen product={entry.product} source="cache" onScanAgain={goBack} />;
  }

  return <MissingProductScreen barcode={entry.barcode} onScanAgain={goBack} />;
}
