import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import type { CountryCallingCode } from '../../utils/countryCallingCodes';
import { CountryCodeField } from '../CountryCodeField';
import { FormField } from './FormField';
import { createFieldStyles } from './formFieldStyles';

export interface PhoneMessageFields {
  country: CountryCallingCode | null;
  number: string;
  message: string;
}

export function defaultPhoneMessageFields(country: CountryCallingCode | null): PhoneMessageFields {
  return { country, number: '', message: '' };
}

interface Props {
  value: PhoneMessageFields;
  onChange: (value: PhoneMessageFields) => void;
}

/** Country code + phone number + message — shared shape between the SMS
 * and WhatsApp generators, which only differ in how the content builder
 * turns this into a URI (sms: vs a wa.me link). */
export function PhoneMessageForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);

  return (
    <>
      <View style={styles.row}>
        <CountryCodeField
          label={t('myCodes.countryCodeLabel')}
          value={value.country}
          onChange={(country) => onChange({ ...value, country })}
        />
        <FormField
          style={styles.flexField}
          label={t('myCodes.phoneNumberLabel')}
          placeholder={t('myCodes.phoneNumberPlaceholder')}
          value={value.number}
          onChangeText={(number) => onChange({ ...value, number })}
          keyboardType="phone-pad"
        />
      </View>
      <FormField
        label={t('myCodes.messageLabel')}
        placeholder={t('myCodes.messagePlaceholder')}
        value={value.message}
        onChangeText={(message) => onChange({ ...value, message })}
        multiline
      />
    </>
  );
}
