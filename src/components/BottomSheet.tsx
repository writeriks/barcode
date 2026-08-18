import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

/** A second screen shown inside a sheet that is already open, in place of
 *  its usual body — a long list of choices one of its fields needs. */
export interface SheetStep {
  title: string;
  /** Called on every render of the sheet rather than stored as an element,
   *  so whatever it returns keeps its own state (a search box's text, a
   *  list's scroll position) across the sheet's re-renders. */
  render: () => ReactNode;
  /** Leave off when the step brings its own scrolling — nesting a list
   *  inside the sheet's ScrollView breaks both. */
  scroll?: boolean;
}

interface SheetStepControls {
  open: (step: SheetStep) => void;
  close: () => void;
}

const SheetStepContext = createContext<SheetStepControls | null>(null);

/**
 * Lets a field deep inside a sheet take the sheet over for one step,
 * instead of opening a second sheet on top of the first.
 *
 * Returns null outside a sheet, which is the caller's cue to fall back to
 * presenting something of its own.
 */
export function useSheetStep(): SheetStepControls | null {
  return useContext(SheetStepContext);
}

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned below the body — a Save button on a tall form, so it stays
   *  reachable while the fields scroll. Hidden while a step is open: it
   *  belongs to the form, not to the list covering it. */
  footer?: ReactNode;
  /** Caps the body and scrolls it. Needed for generator forms that can
   *  be a vCard's worth of fields; short sheets should leave this off so
   *  a FlatList inside (country codes) isn't nested in a ScrollView. */
  scroll?: boolean;
}

// Comfortably taller than any sheet this app renders, so the slide-in
// always starts fully below the screen regardless of content height.
const OFFSCREEN_Y = 1200;

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
export function BottomSheet({ visible, onClose, title, children, footer, scroll }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(OFFSCREEN_Y)).current;
  const [step, setStep] = useState<SheetStep | null>(null);

  const stepControls = useMemo<SheetStepControls>(
    () => ({ open: setStep, close: () => setStep(null) }),
    []
  );

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
      // A sheet that reopens should start on its own content, never on
      // whatever step was showing when it was last dismissed.
      setStep(null);
    }
  }, [visible, backdropOpacity, sheetTranslateY]);

  // Back out of a step before out of the sheet — the step is what's on
  // top, so it's what a tap outside or a hardware back is aimed at.
  const handleDismiss = () => {
    if (step) setStep(null);
    else onClose();
  };

  const scrolled = (content: ReactNode) => (
    <ScrollView
      style={{ maxHeight: windowHeight * 0.62 }}
      contentContainerStyle={styles.scrollBody}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {content}
    </ScrollView>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      onRequestClose={handleDismiss}
    >
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdropTouchable} onPress={handleDismiss}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, transform: [{ translateY: sheetTranslateY }] },
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            {step ? (
              <Pressable onPress={() => setStep(null)} hitSlop={10} style={styles.backButton}>
                <Ionicons name="chevron-back" size={18} color={colors.text} />
              </Pressable>
            ) : null}
            <Text style={styles.title}>{step ? step.title : title}</Text>
          </View>
          <SheetStepContext.Provider value={stepControls}>
            {/* Hidden rather than unmounted: the field that opened the step
                lives in here, and so does everything the form has been
                typed into. Unmounting would hand back a blank form. */}
            <View style={step ? styles.hidden : undefined}>{scroll ? scrolled(children) : children}</View>
            {step ? (step.scroll ? scrolled(step.render()) : step.render()) : null}
          </SheetStepContext.Provider>
          {footer && !step ? <View style={styles.footer}>{footer}</View> : null}
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
    hidden: {
      display: 'none',
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
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 12,
    },
    backButton: {
      marginLeft: -4,
    },
    title: {
      flex: 1,
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.text,
    },
    scrollBody: {
      gap: 14,
      paddingBottom: 4,
    },
    footer: {
      marginTop: 14,
    },
  });
}
