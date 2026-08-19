import { File, Paths } from 'expo-file-system';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';
import type { QrAppearance } from '../components/QrAppearanceSection';
import { QrShareSheet, type QrShareParts } from '../components/QrShareSheet';
import { StyledQrCode, type QrSvgRef } from '../components/StyledQrCode';
import { brandLogoFor } from '../utils/brandLogos';
import { classifyQrContent } from '../utils/classifyQrContent';
import type { QrContentType } from '../utils/classifyQrContent';
import { isQrEncodable } from '../utils/qrCapacity';

// Bigger than any QR the app displays: this one gets sent to other people
// and may be scanned off their screen, so it wants the resolution.
const SHARE_SIZE = 512;

interface ShareRequest {
  content: string;
  appearance?: QrAppearance;
  /** The type the caller already knows this code to be. Saved codes carry
   *  one; a scanned code is classified from its content. Passed in rather
   *  than re-derived so the shared picture uses the same brand mark the
   *  viewer drew — a code saved as "Instagram" whose address happens to
   *  read as a plain link would otherwise go out without its logo. */
  type?: QrContentType;
}

interface PendingCapture extends ShareRequest {
  parts: QrShareParts;
}

/**
 * Shares a QR code, after asking what should go with it.
 *
 * Sharing sends the picture, the value, or both — the choice is a sheet of
 * checkboxes, because a poster wants the code alone and a message usually
 * wants both.
 *
 * Turning a QR into a PNG means rendering it, and the places that share
 * one don't necessarily have a full-size QR on screen (My Codes shares
 * straight from the list). So this renders its own off-screen copy at
 * share resolution, captures that, and throws it away.
 *
 * Mount `qrRenderer` somewhere in the screen's tree and call `shareQr`.
 */
export function useQrShare(onUnavailable?: () => void) {
  const [asking, setAsking] = useState<ShareRequest | null>(null);
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const svgRef = useRef<QrSvgRef | null>(null);

  // Runs once the off-screen QR above has been through a render. React
  // attaches refs before effects, but the native view behind the ref is
  // laid out and drawn after this commit — asking it for a snapshot in the
  // same tick captures whatever it held before the logo and caption were
  // added to it. A frame later it is the finished picture.
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;

    const frame = requestAnimationFrame(() => {
      const svg = svgRef.current;
      if (cancelled) return;
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
          // message alone still goes out.
          await Share.share(
            pending.parts.text ? { message: pending.content, url: file.uri } : { url: file.uri }
          );
        } finally {
          if (!cancelled) setPending(null);
        }
      });
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [pending]);

  const shareQr = useCallback(
    (content: string, appearance?: QrAppearance, type?: QrContentType) => {
      setAsking({ content, appearance, type });
    },
    []
  );

  const handleConfirm = useCallback(
    (parts: QrShareParts) => {
      const request = asking;
      setAsking(null);
      if (!request) return;

      // Text alone needs no drawing, so it also can't be too long to draw.
      if (!parts.image) {
        if (parts.text) void Share.share({ message: request.content });
        return;
      }
      // Content too big to draw would otherwise mount a renderer that never
      // calls back, and the share would end as silence.
      if (!isQrEncodable(request.content)) {
        onUnavailable?.();
        return;
      }
      setPending({ ...request, parts });
    },
    [asking, onUnavailable]
  );

  // The shared PNG has to be the picture the user approved, so it is drawn
  // from the same component, appearance and brand as the preview.
  const logo = pending?.appearance?.logo
    ? brandLogoFor(pending.type ?? classifyQrContent(pending.content))
    : null;

  const qrRenderer = (
    <>
      <QrShareSheet visible={asking !== null} onClose={() => setAsking(null)} onConfirm={handleConfirm} />
      {pending ? (
        <View style={styles.offscreen} pointerEvents="none">
          <StyledQrCode
            value={pending.content}
            size={SHARE_SIZE}
            color={pending.appearance?.color}
            caption={pending.appearance?.caption}
            logo={logo}
            getRef={(instance) => {
              svgRef.current = instance;
            }}
          />
        </View>
      ) : null}
    </>
  );

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
