import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import type { CountryCallingCode } from '../../utils/countryCallingCodes';
import { CountryCodeField, CountryCodePanel } from '../CountryCodeField';
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
  const [isCountryOpen, setIsCountryOpen] = useState(false);

  return (
    <>
      <View style={styles.row}>
        <CountryCodeField
          label={t('myCodes.countryCodeLabel')}
          value={value.country}
          isOpen={isCountryOpen}
          onToggle={() => setIsCountryOpen((open) => !open)}
          onClear={() => onChange({ ...value, country: null })}
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
      {/* Below the row rather than inside it: in the row the panel only
          gets the button's ninety points and the wheel is unreadable. */}
      {isCountryOpen ? (
        <CountryCodePanel value={value.country} onChange={(country) => onChange({ ...value, country })} />
      ) : null}
    </>
  );
}
