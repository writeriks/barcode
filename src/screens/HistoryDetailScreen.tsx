import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HistoryStackParamList } from '../navigation/types';
import { DocumentEntryScreen } from './DocumentEntryScreen';
import { FoundProductScreen } from './FoundProductScreen';
import { MissingProductScreen } from './MissingProductScreen';
import { QrResultScreen } from './QrResultScreen';

type Props = NativeStackScreenProps<HistoryStackParamList, 'HistoryDetail'>;

/** Re-renders the exact same screen the live scan flow would have shown —
 * a past scan should look identical to a fresh one, not a stripped-down
 * summary of it. Scan-again is omitted: there is no camera to return to,
 * and wiring the button to goBack made it look like a scan that wasn't. */
export function HistoryDetailScreen({ route, navigation }: Props) {
  const { entry } = route.params;
  const goBack = () => navigation.goBack();

  if (entry.kind === 'qr') {
    return <QrResultScreen data={entry.data} />;
  }

  if (entry.kind === 'document') {
    return (
      <DocumentEntryScreen
        timestamp={entry.timestamp}
        pageTexts={entry.pageTexts}
        imageUris={entry.imageUris}
        label={entry.label}
        onClose={goBack}
      />
    );
  }

  if (entry.product) {
    return <FoundProductScreen product={entry.product} source="cache" />;
  }

  return <MissingProductScreen barcode={entry.barcode} />;
}
