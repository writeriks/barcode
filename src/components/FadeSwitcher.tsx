import { useEffect, useRef, type ReactNode } from 'react';
import { Animated, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

interface Props {
  /** Changes whenever `children` should fade in as if it were a new
   * screen — e.g. a mode name like 'list' | 'creating' | 'viewing'. */
  activeKey: string;
  children: ReactNode;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fades content in whenever `activeKey` changes — a light "new screen"
 * feel for parts of the app that switch between local view states instead
 * of pushing a navigator route (My Codes' list/create/view modes, the
 * Scanner's camera/loading/result modes — real navigator screens already
 * get this via `animation: 'fade'` in their screenOptions). */
export function FadeSwitcher({ activeKey, children, duration = 180, style }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }).start();
  }, [activeKey, duration, opacity]);

  return <Animated.View style={[styles.flex, style, { opacity }]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
