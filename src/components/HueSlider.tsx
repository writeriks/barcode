import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { hueToQrColor } from '../utils/qrColor';

interface Props {
  /** 0–359. */
  hue: number;
  onChange: (hue: number) => void;
}

const TRACK_HEIGHT = 26;
const KNOB_SIZE = 24;

/** Enough stops that the band reads as continuous; the eye can't find the
 *  seams between twelve. */
const STOPS = Array.from({ length: 13 }, (_, index) => index * 30);

/**
 * Picks a hue, and only a hue.
 *
 * The band shows each hue as the colour a code drawn in it would actually
 * be — already darkened to stay scannable — rather than as a bright
 * rainbow that then produces something else. What you drag past is what
 * you get.
 *
 * Built from react-native-svg rather than a slider package: the app
 * already draws QR codes with it, and a gradient plus a knob is less code
 * than a dependency.
 */
export function HueSlider({ hue, onChange }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [width, setWidth] = useState(0);

  // The pan handlers are built once and would close over whatever these
  // were on first render, so they read them from refs instead.
  const widthRef = useRef(0);
  const originRef = useRef(0);
  const trackRef = useRef<View>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        // Only claim a drag that is going sideways. A vertical one belongs
        // to the sheet's scroll view, and stealing it would trap the form.
        onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > Math.abs(gesture.dy),
        // Once the drag is ours it stays ours: letting the scroll view take
        // it back mid-stroke is what made this feel like it seized up.
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => emit(event.nativeEvent.pageX),
        onPanResponderMove: (event) => emit(event.nativeEvent.pageX),
      }),
    []
  );

  /**
   * Measured from the screen's edge rather than from the touched view.
   *
   * `locationX` is relative to whatever element the touch landed on, so as
   * soon as a finger crossed the knob the readings were suddenly relative
   * to a 24pt circle — the value leapt, and dragging looked broken while
   * tapping worked. A page coordinate minus the track's own position on
   * screen means the same number wherever the finger is.
   */
  function emit(pageX: number) {
    const trackWidth = widthRef.current;
    if (trackWidth <= 0) return;
    const ratio = Math.min(1, Math.max(0, (pageX - originRef.current) / trackWidth));
    onChangeRef.current(Math.round(ratio * 359));
  }

  const knobLeft = width > 0 ? (hue / 359) * (width - KNOB_SIZE) : 0;

  return (
    <View
      ref={trackRef}
      style={styles.wrap}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        widthRef.current = next;
        setWidth(next);
        // Where the track sits on screen, for turning a touch's page
        // coordinate into a position along the band.
        trackRef.current?.measureInWindow((x) => {
          originRef.current = x;
        });
      }}
      {...responder.panHandlers}
    >
      <Svg width="100%" height={TRACK_HEIGHT}>
        <Defs>
          <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
            {STOPS.map((stop) => (
              <Stop key={stop} offset={`${(stop / 360) * 100}%`} stopColor={hueToQrColor(stop % 360)} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width="100%" height={TRACK_HEIGHT} rx={TRACK_HEIGHT / 2} fill="url(#hue)" />
      </Svg>
      {/* Never a touch target: if the knob could take the touch, the
          readings above would start measuring from its edge. */}
      <View
        pointerEvents="none"
        style={[styles.knob, { left: knobLeft, backgroundColor: hueToQrColor(hue) }]}
      />
    </View>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    wrap: {
      height: TRACK_HEIGHT,
      justifyContent: 'center',
    },
    knob: {
      position: 'absolute',
      width: KNOB_SIZE,
      height: KNOB_SIZE,
      borderRadius: KNOB_SIZE / 2,
      borderWidth: 3,
      borderColor: colors.cream,
    },
  });
}
