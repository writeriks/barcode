import { useEffect, useMemo, useRef } from 'react';
import { Animated, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';

interface Props {
  visible: boolean;
  onClose: () => void;
  title: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  submitLabel: string;
  cancelLabel: string;
}

/** A small centered dialog for a single text input — "name this thing" —
 * rather than a full sliding sheet, which is overkill for one field.
 * The backdrop fades independently of the card, which fades and scales in
 * from slightly-below-full-size — the same "decoupled" animation approach
 * as BottomSheet, so the two dialog styles in the app feel consistent. */
export function PromptModal({
  visible,
  onClose,
  title,
  placeholder,
  value,
  onChangeText,
  onSubmit,
  submitLabel,
  cancelLabel,
}: Props) {
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.spring(cardScale, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 260 }),
      ]).start();
    } else {
      backdropOpacity.setValue(0);
      cardOpacity.setValue(0);
      cardScale.setValue(0.92);
    }
  }, [visible, backdropOpacity, cardOpacity, cardScale]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdropTouchable} onPress={onClose}>
          <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>
        <View style={styles.centerWrap} pointerEvents="box-none">
          <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
            <Text style={styles.title}>{title}</Text>
            <TextInput
              style={styles.input}
              placeholder={placeholder}
              placeholderTextColor={placeholderColor}
              value={value}
              onChangeText={onChangeText}
              autoFocus
              onSubmitEditing={onSubmit}
            />
            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.cancelButton}>
                <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
              </Pressable>
              <Pressable
                onPress={onSubmit}
                disabled={!value.trim()}
                style={[styles.submitButton, !value.trim() && styles.submitButtonDisabled]}
              >
                <Text style={styles.submitButtonText}>{submitLabel}</Text>
              </Pressable>
            </View>
          </Animated.View>
        </View>
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
      ...StyleSheet.absoluteFillObject,
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    centerWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 20,
      padding: 20,
      gap: 14,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.text,
    },
    input: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    cancelButton: {
      paddingHorizontal: 16,
      paddingVertical: 11,
      borderRadius: 999,
    },
    cancelButtonText: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.text,
      opacity: 0.65,
    },
    submitButton: {
      backgroundColor: colors.mint,
      paddingHorizontal: 20,
      paddingVertical: 11,
      borderRadius: 999,
    },
    submitButtonDisabled: {
      opacity: 0.4,
    },
    submitButtonText: {
      fontFamily: fonts.displayBold,
      fontSize: 14,
      color: colors.inkOnCream,
    },
  });
}
