import { useTranslation } from 'react-i18next';
import { FormField } from './FormField';

export interface LinkFields {
  url: string;
}

export const defaultLinkFields: LinkFields = { url: '' };

interface Props {
  value: LinkFields;
  onChange: (value: LinkFields) => void;
  /** Overridden by the branded link types (App Store, Drive, Dropbox),
   * which are this same field asking for one particular kind of URL. */
  label?: string;
  placeholder?: string;
}

export function LinkForm({ value, onChange, label, placeholder }: Props) {
  const { t } = useTranslation();
  return (
    <FormField
      label={label ?? t('myCodes.urlLabel')}
      required
      placeholder={placeholder ?? t('myCodes.urlPlaceholder')}
      value={value.url}
      onChangeText={(url) => onChange({ url })}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="url"
    />
  );
}
