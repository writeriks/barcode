import { useTranslation } from 'react-i18next';
import { FormField } from './FormField';

export interface TextFields {
  message: string;
}

export const defaultTextFields: TextFields = { message: '' };

interface Props {
  value: TextFields;
  onChange: (value: TextFields) => void;
}

export function TextForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <FormField
      label={t('myCodes.messageLabel')}
      required
      placeholder={t('myCodes.messagePlaceholder')}
      value={value.message}
      onChangeText={(message) => onChange({ message })}
      multiline
    />
  );
}
