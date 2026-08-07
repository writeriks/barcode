import { useTranslation } from 'react-i18next';
import { FormField } from './FormField';

export interface EmailFields {
  to: string;
  subject: string;
  body: string;
}

export const defaultEmailFields: EmailFields = { to: '', subject: '', body: '' };

interface Props {
  value: EmailFields;
  onChange: (value: EmailFields) => void;
}

export function EmailForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <FormField
        label={t('myCodes.sendToLabel')}
        required
        placeholder={t('myCodes.emailPlaceholder')}
        value={value.to}
        onChangeText={(to) => onChange({ ...value, to })}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
      />
      <FormField label={t('myCodes.subjectLabel')} value={value.subject} onChangeText={(subject) => onChange({ ...value, subject })} />
      <FormField
        label={t('myCodes.textLabel')}
        value={value.body}
        onChangeText={(body) => onChange({ ...value, body })}
        multiline
      />
    </>
  );
}
