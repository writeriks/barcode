import { useTranslation } from 'react-i18next';
import { FormField } from './FormField';

export interface LinkFields {
  url: string;
}

export const defaultLinkFields: LinkFields = { url: '' };

interface Props {
  value: LinkFields;
  onChange: (value: LinkFields) => void;
}

export function LinkForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <FormField
      label={t('myCodes.urlLabel')}
      required
      placeholder={t('myCodes.urlPlaceholder')}
      value={value.url}
      onChangeText={(url) => onChange({ url })}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="url"
    />
  );
}
