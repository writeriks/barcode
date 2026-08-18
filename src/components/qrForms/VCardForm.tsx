import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import type { CountryCallingCode } from '../../utils/countryCallingCodes';
import { CountryCodeField, CountryCodePanel } from '../CountryCodeField';
import { SelectField, type SelectOption } from '../SelectField';
import { FormField } from './FormField';
import { createFieldStyles } from './formFieldStyles';

export interface VCardFields {
  version: '2.1' | '3.0';
  title: string;
  firstName: string;
  lastName: string;
  homeCountry: CountryCallingCode | null;
  homeNumber: string;
  mobileCountry: CountryCallingCode | null;
  mobileNumber: string;
  email: string;
  website: string;
  company: string;
  jobTitle: string;
  officeCountry: CountryCallingCode | null;
  officeNumber: string;
  faxCountry: CountryCallingCode | null;
  faxNumber: string;
  address: string;
  postCode: string;
  city: string;
  state: string;
  country: string;
}

export function defaultVCardFields(defaultCountry: CountryCallingCode | null): VCardFields {
  return {
    version: '2.1',
    title: '',
    firstName: '',
    lastName: '',
    homeCountry: defaultCountry,
    homeNumber: '',
    mobileCountry: defaultCountry,
    mobileNumber: '',
    email: '',
    website: '',
    company: '',
    jobTitle: '',
    officeCountry: defaultCountry,
    officeNumber: '',
    faxCountry: defaultCountry,
    faxNumber: '',
    address: '',
    postCode: '',
    city: '',
    state: '',
    country: '',
  };
}

/** The four numbers a vCard can carry, each with its own country. */
type CountryKey = 'homeCountry' | 'mobileCountry' | 'officeCountry' | 'faxCountry';

interface Props {
  value: VCardFields;
  onChange: (value: VCardFields) => void;
}

export function VCardForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);
  // One country wheel open at a time — four unfolded at once would bury
  // the form they belong to.
  const [openCountry, setOpenCountry] = useState<CountryKey | null>(null);
  const toggleCountry = (which: CountryKey) =>
    setOpenCountry((current) => (current === which ? null : which));
  const set = <K extends keyof VCardFields>(key: K, fieldValue: VCardFields[K]) => onChange({ ...value, [key]: fieldValue });

  const versionOptions: SelectOption<'2.1' | '3.0'>[] = [
    { value: '2.1', label: '2.1' },
    { value: '3.0', label: '3.0' },
  ];

  return (
    <>
      <SelectField
        label={t('myCodes.versionLabel')}
        value={value.version}
        options={versionOptions}
        onChange={(version) => set('version', version)}
      />
      <FormField label={t('myCodes.titleLabel')} value={value.title} onChangeText={(v) => set('title', v)} />
      <FormField label={t('myCodes.firstNameLabel')} value={value.firstName} onChangeText={(v) => set('firstName', v)} />
      <FormField label={t('myCodes.lastNameLabel')} value={value.lastName} onChangeText={(v) => set('lastName', v)} />
      <Text style={styles.hint}>{t('myCodes.vcardRequiredHint')}</Text>

      <View style={styles.row}>
        <CountryCodeField
          label={t('myCodes.phoneHomeLabel')}
          value={value.homeCountry}
          isOpen={openCountry === 'homeCountry'}
          onToggle={() => toggleCountry('homeCountry')}
          onClear={() => set('homeCountry', null)}
        />
        <FormField
          style={styles.flexField}
          label={t('myCodes.phoneNumberLabel')}
          value={value.homeNumber}
          onChangeText={(v) => set('homeNumber', v)}
          keyboardType="phone-pad"
        />
      </View>
      {openCountry === 'homeCountry' ? (
        <CountryCodePanel value={value.homeCountry} onChange={(country) => set('homeCountry', country)} />
      ) : null}
      <View style={styles.row}>
        <CountryCodeField
          label={t('myCodes.phoneMobileLabel')}
          value={value.mobileCountry}
          isOpen={openCountry === 'mobileCountry'}
          onToggle={() => toggleCountry('mobileCountry')}
          onClear={() => set('mobileCountry', null)}
        />
        <FormField
          style={styles.flexField}
          label={t('myCodes.phoneNumberLabel')}
          value={value.mobileNumber}
          onChangeText={(v) => set('mobileNumber', v)}
          keyboardType="phone-pad"
        />
      </View>
      {openCountry === 'mobileCountry' ? (
        <CountryCodePanel value={value.mobileCountry} onChange={(country) => set('mobileCountry', country)} />
      ) : null}

      <FormField
        label={t('myCodes.emailPlaceholder')}
        value={value.email}
        onChangeText={(v) => set('email', v)}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <FormField
        label={t('myCodes.websiteLabel')}
        placeholder={t('myCodes.urlPlaceholder')}
        value={value.website}
        onChangeText={(v) => set('website', v)}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <FormField label={t('myCodes.companyLabel')} value={value.company} onChangeText={(v) => set('company', v)} />
      <FormField label={t('myCodes.jobTitleLabel')} value={value.jobTitle} onChangeText={(v) => set('jobTitle', v)} />

      <View style={styles.row}>
        <CountryCodeField
          label={t('myCodes.phoneOfficeLabel')}
          value={value.officeCountry}
          isOpen={openCountry === 'officeCountry'}
          onToggle={() => toggleCountry('officeCountry')}
          onClear={() => set('officeCountry', null)}
        />
        <FormField
          style={styles.flexField}
          label={t('myCodes.phoneNumberLabel')}
          value={value.officeNumber}
          onChangeText={(v) => set('officeNumber', v)}
          keyboardType="phone-pad"
        />
      </View>
      {openCountry === 'officeCountry' ? (
        <CountryCodePanel value={value.officeCountry} onChange={(country) => set('officeCountry', country)} />
      ) : null}
      <View style={styles.row}>
        <CountryCodeField
          label={t('myCodes.faxLabel')}
          value={value.faxCountry}
          isOpen={openCountry === 'faxCountry'}
          onToggle={() => toggleCountry('faxCountry')}
          onClear={() => set('faxCountry', null)}
        />
        <FormField
          style={styles.flexField}
          label={t('myCodes.phoneNumberLabel')}
          value={value.faxNumber}
          onChangeText={(v) => set('faxNumber', v)}
          keyboardType="phone-pad"
        />
      </View>
      {openCountry === 'faxCountry' ? (
        <CountryCodePanel value={value.faxCountry} onChange={(country) => set('faxCountry', country)} />
      ) : null}

      <FormField label={t('myCodes.addressLabel')} value={value.address} onChangeText={(v) => set('address', v)} multiline />
      <View style={styles.row}>
        <FormField style={styles.flexField} label={t('myCodes.postCodeLabel')} value={value.postCode} onChangeText={(v) => set('postCode', v)} />
        <FormField style={styles.flexField} label={t('myCodes.cityLabel')} value={value.city} onChangeText={(v) => set('city', v)} />
      </View>
      <View style={styles.row}>
        <FormField style={styles.flexField} label={t('myCodes.stateLabel')} value={value.state} onChangeText={(v) => set('state', v)} />
        <FormField style={styles.flexField} label={t('myCodes.countryLabel')} value={value.country} onChangeText={(v) => set('country', v)} />
      </View>
    </>
  );
}
