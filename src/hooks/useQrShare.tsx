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
import { withSystemUi } from '../services/systemUiSession';

// How many frames to wait for the off-screen SVG to attach its ref. One
// is usually enough; a few more covers a layout that landed a frame late.
const CAPTURE_FRAMES = 12;

// Bigger than any QR the app displays: this one gets sent to other people
// and may be scanned off their screen, so it wants the resolution.
const SHARE_SIZE = 512;

function shareText(content: string) {
  void withSystemUi(() => Share.share({ message: content }));
}

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
  // QrShareSheet closes first (so this Modal is gone before the system
  // share sheet), which clears `asking`. The delayed onConfirm still
  // needs the request that was on screen when Continue was pressed.
  const askingRef = useRef<ShareRequest | null>(null);

  // Runs once the off-screen QR above has been through a render. React
  // attaches refs before effects, but the native view behind the ref is
  // laid out and drawn after this commit — asking it for a snapshot in the
  // same tick captures whatever it held before the logo and caption were
  // added to it. A frame later it is the finished picture.
  useEffect(() => {
    if (!pending) return;
    let cancelled = false;
    let frames = 0;
    let frame = 0;

    const capture = { content: pending.content, parts: pending.parts };

    const tryCapture = () => {
      if (cancelled) return;
      const svg = svgRef.current;
      // Wait at least one extra frame after the ref appears so the native
      // SVG has actually drawn. Keep retrying if the ref is late.
      if (!svg || frames < 1) {
        frames += 1;
        if (frames >= CAPTURE_FRAMES) {
          // Picture never appeared. Still share the value if they asked
          // for it, rather than closing the sheet into silence.
          if (capture.parts.text) shareText(capture.content);
          setPending(null);
          return;
        }
        frame = requestAnimationFrame(tryCapture);
        return;
      }

      svg.toDataURL(async (base64) => {
        if (cancelled) return;
        try {
          if (!base64) throw new Error('empty qr snapshot');
          const file = new File(Paths.cache, 'qr-code.png');
          file.create({ overwrite: true });
          file.write(base64, { encoding: 'base64' });
          // Attaching a file and a message to one share sheet is iOS-only
          // behaviour of Share.share's {message, url} — on Android the
          // message alone still goes out.
          await withSystemUi(() =>
            Share.share(
              capture.parts.text ? { message: capture.content, url: file.uri } : { url: file.uri }
            )
          );
        } catch {
          if (!cancelled && capture.parts.text) shareText(capture.content);
        } finally {
          if (!cancelled) setPending(null);
        }
      });
    };

    frame = requestAnimationFrame(tryCapture);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [pending]);

  const shareQr = useCallback(
    (content: string, appearance?: QrAppearance, type?: QrContentType) => {
      const request = { content, appearance, type };
      askingRef.current = request;
      setAsking(request);
    },
    []
  );

  const handleCloseSheet = useCallback(() => {
    setAsking(null);
  }, []);

  const handleConfirm = useCallback(
    (parts: QrShareParts) => {
      const request = askingRef.current;
      askingRef.current = null;
      setAsking(null);
      if (!request) return;

      // Text alone needs no drawing, so it also can't be too long to draw.
      if (!parts.image) {
        if (parts.text) shareText(request.content);
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
    [onUnavailable]
  );

  // The shared PNG has to be the picture the user approved, so it is drawn
  // from the same component, appearance and brand as the preview.
  const logo = pending?.appearance?.logo
    ? brandLogoFor(pending.type ?? classifyQrContent(pending.content))
    : null;

  const qrRenderer = (
    <>
      <QrShareSheet visible={asking !== null} onClose={handleCloseSheet} onConfirm={handleConfirm} />
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
