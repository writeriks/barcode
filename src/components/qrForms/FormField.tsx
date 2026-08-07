import { useMemo } from 'react';
import { Text, TextInput, View, type StyleProp, type TextInputProps, type ViewStyle } from 'react-native';
import { useThemeColors, useThemeMode } from '../../theme/ThemeContext';
import { createFieldStyles } from './formFieldStyles';

interface Props extends TextInputProps {
  label: string;
  style?: StyleProp<ViewStyle>;
  /** Marks the label with a "*" — this is the one field (or one of the
   * fields) that has to be filled in for the type to produce a QR code. */
  required?: boolean;
}

/** A labeled TextInput matching the app's form styling — the one piece
 * every generator form is built out of. */
export function FormField({ label, style, required, ...inputProps }: Props) {
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';

  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        style={[styles.input, inputProps.multiline && styles.inputMultiline]}
        placeholderTextColor={placeholderColor}
        {...inputProps}
      />
    </View>
  );
}
