import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { BANNER_AD_RESERVED_HEIGHT } from '../components/BottomBannerAd';
import { Toast } from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { usePremium } from '../premium/PremiumContext';
import { getRemainingFreeScans } from '../services/documentScanQuota';
import { deleteHistoryEntry, removeDocumentPages } from '../services/scanHistory';
import { DocumentGalleryScreen } from './DocumentGalleryScreen';
import { DocumentResultScreen } from './DocumentResultScreen';

interface Props {
  /** Identifies the History entry these pages belong to — needed to
   * persist partial-page deletes and whole-entry deletes. */
  timestamp: number;
  imageUris: string[];
  pageTexts: string[];
  /** The name the user gave this entry, when reopened from History. A
   * fresh scan hasn't been named yet. */
  label?: string;
  /** Set for a document just captured by the scanner — shows a free user
   * how many scans they have left, once, on mount. Omitted when reopening
   * from History, where nothing was just spent. */
  isFreshScan?: boolean;
  /** Where this whole document exits to once there's nothing left to show
   * here — back to the scanner (fresh-scan flow) or back to History
   * (native stack's own back, called explicitly once the entry is gone). */
  onClose: () => void;
}

type ViewState =
  | { mode: 'gallery' }
  | {
      mode: 'detail';
      index: number;
      // 'gallery': this page was opened from the grid — back returns there.
      // 'standalone': this is the whole document (either it only ever had
      // one page, or bulk-delete collapsed it down to one) — no gallery
      // to go back to, so the exit action is the outer onClose instead.
      from: 'gallery' | 'standalone';
    };

/** Orchestrates a document History entry's two possible shapes: a single
 * page (straight to DocumentResultScreen) or several (DocumentGalleryScreen
 * first, individual pages nested under it). Owns the page-array state so
 * bulk/single-page deletes can update the view in place without needing a
 * fresh navigation — see the ViewState comment above for the exact rules. */
export function DocumentEntryScreen({
  timestamp,
  imageUris: initialImageUris,
  pageTexts: initialPageTexts,
  label,
  isFreshScan,
  onClose,
}: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const { isPremium } = usePremium();
  const { message: toastMessage, showToast } = useToast();
  const [imageUris, setImageUris] = useState(initialImageUris);
  const [pageTexts, setPageTexts] = useState(initialPageTexts);
  const [view, setView] = useState<ViewState>(() =>
    initialImageUris.length > 1 ? { mode: 'gallery' } : { mode: 'detail', index: 0, from: 'standalone' }
  );

  // The scanner has already spent one of the free scans by the time this
  // mounts, so the count read here is what's actually left. Premium users
  // aren't on a quota and get no toast at all.
  useEffect(() => {
    if (!isFreshScan || isPremium || initialImageUris.length === 0) return;
    getRemainingFreeScans().then((remaining) => showToast(t('document.freeScansLeft', { count: remaining })));
    // Only on mount — this is a one-time "you just used one" notice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenPage = (index: number) => setView({ mode: 'detail', index, from: 'gallery' });
  const handleBackToGallery = () => setView({ mode: 'gallery' });

  const handleBulkDeletePages = async (indexes: number[]) => {
    const remaining = await removeDocumentPages(timestamp, indexes);
    if (remaining === 0) {
      onClose();
      return;
    }
    const removeSet = new Set(indexes);
    setImageUris((prev) => prev.filter((_, i) => !removeSet.has(i)));
    setPageTexts((prev) => prev.filter((_, i) => !removeSet.has(i)));
    if (remaining === 1) setView({ mode: 'detail', index: 0, from: 'standalone' });
  };

  const handleDeleteSinglePage = async (index: number) => {
    if (imageUris.length <= 1) {
      // Standalone — the page being deleted is the whole document.
      await deleteHistoryEntry('document', timestamp);
      onClose();
      return;
    }
    const remaining = await removeDocumentPages(timestamp, [index]);
    if (remaining === 0) {
      onClose();
      return;
    }
    setImageUris((prev) => prev.filter((_, i) => i !== index));
    setPageTexts((prev) => prev.filter((_, i) => i !== index));
    setView(remaining === 1 ? { mode: 'detail', index: 0, from: 'standalone' } : { mode: 'gallery' });
  };

  return (
    <View style={{ flex: 1 }}>
      {view.mode === 'gallery' ? (
        <DocumentGalleryScreen
          imageUris={imageUris}
          onOpenPage={handleOpenPage}
          onDeletePages={handleBulkDeletePages}
          // Only offered right after a scan, where it really does return to
          // the camera. Reopened from History the same button would have
          // gone back to the list — a camera icon that scans nothing.
          onScanAgain={isFreshScan ? onClose : undefined}
        />
      ) : (
        <DocumentResultScreen
          imageUri={imageUris[view.index] ?? null}
          text={pageTexts[view.index] ?? ''}
          label={label}
          timestamp={timestamp}
          pageCount={imageUris.length}
          pageIndex={view.index}
          onDelete={() => handleDeleteSinglePage(view.index)}
          onBack={view.from === 'gallery' ? handleBackToGallery : undefined}
          onCopied={() => showToast(t('qr.copied'))}
        />
      )}
      <Toast message={toastMessage} bottom={tabBarHeight + BANNER_AD_RESERVED_HEIGHT + 16} />
    </View>
  );
}
