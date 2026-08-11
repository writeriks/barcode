import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import { FormField } from './FormField';
import { createFieldStyles } from './formFieldStyles';

export interface LocationFields {
  latitude: string;
  longitude: string;
}

export const defaultLocationFields: LocationFields = { latitude: '', longitude: '' };

interface Props {
  value: LocationFields;
  onChange: (value: LocationFields) => void;
}

export function LocationForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <FormField
        style={styles.flexField}
        label={t('myCodes.latitudeLabel')}
        required
        placeholder={t('myCodes.latitudePlaceholder')}
        value={value.latitude}
        onChangeText={(latitude) => onChange({ ...value, latitude })}
        keyboardType="numbers-and-punctuation"
      />
      <FormField
        style={styles.flexField}
        label={t('myCodes.longitudeLabel')}
        required
        placeholder={t('myCodes.longitudePlaceholder')}
        value={value.longitude}
        onChangeText={(longitude) => onChange({ ...value, longitude })}
        keyboardType="numbers-and-punctuation"
      />
    </View>
  );
}
