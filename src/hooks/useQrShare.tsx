import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useThemeColors } from '../theme/ThemeContext';

// Bigger than any QR the app displays: this one gets sent to other people
// and may be scanned off their screen, so it wants the resolution.
const SHARE_SIZE = 512;
// A QR with no margin around it is unreliable to scan — readers need the
// quiet zone to find the code's edges in whatever the image is pasted into.
const QUIET_ZONE = 20;

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
export function useQrShare() {
  const colors = useThemeColors();
  const [pending, setPending] = useState<PendingShare | null>(null);
  const svgRef = useRef<{ toDataURL: (callback: (base64: string) => void) => void } | null>(null);

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

  const shareQr = useCallback((content: string) => setPending({ content }), []);

  const qrRenderer = pending ? (
    <View style={styles.offscreen} pointerEvents="none">
      <QRCode
        value={pending.content}
        size={SHARE_SIZE}
        quietZone={QUIET_ZONE}
        color={colors.inkOnCream}
        backgroundColor={colors.cream}
        getRef={(c) => {
          svgRef.current = c;
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
