import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { FormField } from './FormField';
import { createFieldStyles } from './formFieldStyles';

export interface ZoomFields {
  meetingId: string;
  password: string;
}

export const defaultZoomFields: ZoomFields = { meetingId: '', password: '' };

interface Props {
  value: ZoomFields;
  onChange: (value: ZoomFields) => void;
}

export function ZoomForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <FormField
        style={styles.flexField}
        label={t('myCodes.meetingIdLabel')}
        value={value.meetingId}
        onChangeText={(meetingId) => onChange({ ...value, meetingId })}
        keyboardType="number-pad"
      />
      <FormField
        style={styles.flexField}
        label={t('myCodes.passwordLabel')}
        value={value.password}
        onChangeText={(password) => onChange({ ...value, password })}
        autoCapitalize="none"
      />
    </View>
  );
}
