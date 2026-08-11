import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import type { CountryCallingCode } from '../../utils/countryCallingCodes';
import { CountryCodeField } from '../CountryCodeField';
import { FormField } from './FormField';
import { createFieldStyles } from './formFieldStyles';

export interface MeCardFields {
  name: string;
  country: CountryCallingCode | null;
  number: string;
  email: string;
  company: string;
  address: string;
  website: string;
}

export function defaultMeCardFields(country: CountryCallingCode | null): MeCardFields {
  return { name: '', country, number: '', email: '', company: '', address: '', website: '' };
}

interface Props {
  value: MeCardFields;
  onChange: (value: MeCardFields) => void;
}

/** A lighter alternative to VCardForm — MECARD only carries a handful of
 * flat fields (no title/versioned format/multiple phone kinds), so it gets
 * its own simpler form rather than reusing VCardForm's larger field set. */
export function MeCardForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);

  return (
    <>
      <FormField
        label={t('myCodes.nameLabel')}
        required
        placeholder={t('myCodes.namePlaceholder')}
        value={value.name}
        onChangeText={(name) => onChange({ ...value, name })}
      />
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
        label={t('myCodes.emailLabel')}
        placeholder={t('myCodes.emailPlaceholder')}
        value={value.email}
        onChangeText={(email) => onChange({ ...value, email })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <FormField
        label={t('myCodes.companyLabel')}
        value={value.company}
        onChangeText={(company) => onChange({ ...value, company })}
      />
      <FormField
        label={t('myCodes.addressLabel')}
        value={value.address}
        onChangeText={(address) => onChange({ ...value, address })}
      />
      <FormField
        label={t('myCodes.websiteLabel')}
        placeholder={t('myCodes.urlPlaceholder')}
        value={value.website}
        onChangeText={(website) => onChange({ ...value, website })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
    </>
  );
}
