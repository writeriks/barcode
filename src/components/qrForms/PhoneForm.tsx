import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import type { CountryCallingCode } from '../../utils/countryCallingCodes';
import { CountryCodeField } from '../CountryCodeField';
import { FormField } from './FormField';
import { createFieldStyles } from './formFieldStyles';

export interface PhoneFields {
  country: CountryCallingCode | null;
  number: string;
}

export function defaultPhoneFields(country: CountryCallingCode | null): PhoneFields {
  return { country, number: '' };
}

interface Props {
  value: PhoneFields;
  onChange: (value: PhoneFields) => void;
}

export function PhoneForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <CountryCodeField
        label={t('myCodes.countryCodeLabel')}
        value={value.country}
        onChange={(country) => onChange({ ...value, country })}
      />
      <FormField
        style={styles.flexField}
        label={t('myCodes.phoneNumberLabel')}
        required
        placeholder={t('myCodes.phoneNumberPlaceholder')}
        value={value.number}
        onChangeText={(number) => onChange({ ...value, number })}
        keyboardType="phone-pad"
      />
    </View>
  );
}
