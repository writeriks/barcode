import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
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

/** A generic slide-up sheet anchored to the bottom of the screen, with a
 * tap-outside-to-dismiss backdrop and a drag-handle affordance. */
export function BottomSheet({ visible, onClose, title, children }: Props) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        {children}
      </View>
    </Modal>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
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
