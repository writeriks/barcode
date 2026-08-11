import { useTranslation } from 'react-i18next';
import { FormField } from './FormField';

export interface UpiFields {
  vpa: string;
  payeeName: string;
  amount: string;
  note: string;
}

export const defaultUpiFields: UpiFields = { vpa: '', payeeName: '', amount: '', note: '' };

interface Props {
  value: UpiFields;
  onChange: (value: UpiFields) => void;
}

/** UPI (India's Unified Payments Interface) `upi://pay` deep link — see
 * buildUpiContent. Amount and note are optional; a bare VPA + payee name
 * still produces a valid pay request the receiving app prompts for the rest. */
export function UpiForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  return (
    <>
      <FormField
        label={t('myCodes.vpaLabel')}
        required
        placeholder={t('myCodes.vpaPlaceholder')}
        value={value.vpa}
        onChangeText={(vpa) => onChange({ ...value, vpa })}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormField
        label={t('myCodes.payeeNameLabel')}
        placeholder={t('myCodes.namePlaceholder')}
        value={value.payeeName}
        onChangeText={(payeeName) => onChange({ ...value, payeeName })}
      />
      <FormField
        label={t('myCodes.amountLabel')}
        placeholder={t('myCodes.amountPlaceholder')}
        value={value.amount}
        onChangeText={(amount) => onChange({ ...value, amount })}
        keyboardType="decimal-pad"
      />
      <FormField
        label={t('myCodes.noteLabel')}
        placeholder={t('myCodes.notePlaceholder')}
        value={value.note}
        onChangeText={(note) => onChange({ ...value, note })}
      />
    </>
  );
}
