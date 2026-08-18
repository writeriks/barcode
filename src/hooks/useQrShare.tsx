import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import { StyledQrCode, type QrSvgRef } from '../components/StyledQrCode';
import { isQrEncodable } from '../utils/qrCapacity';

// Bigger than any QR the app displays: this one gets sent to other people
// and may be scanned off their screen, so it wants the resolution.
const SHARE_SIZE = 512;

interface PendingShare {
  content: string;
}

/**
 * Shares a QR code as both the image and the text it encodes, so the
 * recipient can either scan it or copy the value out.
 *
 * The catch is that turning a QR into a PNG means rendering it — and the
 * places that share one don't necessarily have a full-size QR on screen
 * (the My Codes list only draws 40px thumbnails). So this renders its own
 * off-screen copy at share resolution, captures that, and throws it away.
 *
 * Mount `qrRenderer` somewhere in the screen's tree and call `shareQr`.
 */
export function useQrShare(onUnavailable?: () => void) {
  const [pending, setPending] = useState<PendingShare | null>(null);
  const svgRef = useRef<QrSvgRef | null>(null);

  // Runs once the off-screen QR above has rendered — React attaches refs
  // before effects, so getRef has already handed us the SVG by now.
  useEffect(() => {
    if (!pending) return;
    const svg = svgRef.current;
    if (!svg) {
      setPending(null);
      return;
    }

    svg.toDataURL(async (base64) => {
      try {
        const file = new File(Paths.cache, 'qr-code.png');
        file.create({ overwrite: true });
        file.write(base64, { encoding: 'base64' });
        // Attaching a file and a message to one share sheet is iOS-only
        // behaviour of Share.share's {message, url} — on Android the
        // message alone still goes out, which is what it did before.
        await Share.share({ message: pending.content, url: file.uri });
      } finally {
        setPending(null);
      }
    });
  }, [pending]);

  // Content too big to draw would otherwise mount a renderer that never
  // calls back, and the share would end as silence. Checked here so the
  // caller can say something instead.
  const shareQr = useCallback(
    (content: string) => {
      if (!isQrEncodable(content)) {
        onUnavailable?.();
        return;
      }
      setPending({ content });
    },
    [onUnavailable]
  );

  const qrRenderer = pending ? (
    <View style={styles.offscreen} pointerEvents="none">
      <StyledQrCode
        value={pending.content}
        size={SHARE_SIZE}
        getRef={(instance) => {
          svgRef.current = instance;
        }}
      />
    </View>
  ) : null;

  return { shareQr, qrRenderer };
}

const styles = StyleSheet.create({
  offscreen: {
    // Parked outside the viewport rather than hidden with opacity/display:
    // the view still has to be laid out for toDataURL to capture anything.
    position: 'absolute',
    left: -10000,
    top: 0,
  },
});
