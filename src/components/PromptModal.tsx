import { useMemo } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
 * rather than a full sliding sheet, which is overkill for one field. */
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.centerWrap} pointerEvents="box-none">
          <View style={styles.card}>
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
          </View>
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
