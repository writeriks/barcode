import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

// Comfortably taller than any sheet this app renders, so the slide-in
// always starts fully below the screen regardless of content height.
const OFFSCREEN_Y = 600;

/** A generic slide-up sheet anchored to the bottom of the screen, with a
 * tap-outside-to-dismiss backdrop and a drag-handle affordance.
 *
 * The backdrop fade and the sheet's slide are animated independently
 * (rather than relying on Modal's own animationType="slide", which drags
 * the backdrop up together with the sheet as one rigid block instead of
 * dimming in on its own) — the decoupled version is what makes it read as
 * an intentional bottom sheet instead of a slapped-together overlay.
 *
 * Wrapped in KeyboardAvoidingView so a focused text input inside it (e.g.
 * an autoFocus'd "name this folder" field) doesn't end up hidden behind
 * the keyboard, which sits on top of the sheet by default inside a Modal.
 */
export function BottomSheet({ visible, onClose, title, children }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(OFFSCREEN_Y)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 22,
          stiffness: 220,
          mass: 0.9,
        }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(OFFSCREEN_Y);
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdropTouchable} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    backdropTouchable: {
      flex: 1,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
      backgroundColor: colors.panel,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderBottomWidth: 0,
      paddingTop: 10,
      paddingHorizontal: 20,
    },
    handle: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.panelLine,
      marginBottom: 14,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.text,
      marginBottom: 12,
    },
  });
}
