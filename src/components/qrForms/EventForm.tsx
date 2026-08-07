import { useTranslation } from 'react-i18next';
import { SelectField, type SelectOption } from '../SelectField';
import { FormField } from './FormField';

export interface EventFields {
  title: string;
  location: string;
  startTime: string;
  endTime: string;
  reminderMinutes: string;
  link: string;
  notes: string;
}

export const defaultEventFields: EventFields = {
  title: '',
  location: '',
  startTime: '',
  endTime: '',
  reminderMinutes: '',
  link: '',
  notes: '',
};

const REMINDER_OPTIONS = ['0', '5', '10', '15', '30', '60', '1440'] as const;

interface Props {
  value: EventFields;
  onChange: (value: EventFields) => void;
}

export function EventForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  const set = <K extends keyof EventFields>(key: K, fieldValue: EventFields[K]) => onChange({ ...value, [key]: fieldValue });

  const reminderOptions: SelectOption<string>[] = REMINDER_OPTIONS.map((minutes) => ({
    value: minutes,
    label: t(`myCodes.reminderOption_${minutes}`),
  }));

  return (
    <>
      <FormField label={t('myCodes.eventTitleLabel')} value={value.title} onChangeText={(v) => set('title', v)} />
      <FormField label={t('myCodes.locationLabel')} value={value.location} onChangeText={(v) => set('location', v)} />
      <FormField
        label={t('myCodes.startTimeLabel')}
        placeholder={t('myCodes.dateTimePlaceholder')}
        value={value.startTime}
        onChangeText={(v) => set('startTime', v)}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <FormField
        label={t('myCodes.endTimeLabel')}
        placeholder={t('myCodes.dateTimePlaceholder')}
        value={value.endTime}
        onChangeText={(v) => set('endTime', v)}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <SelectField
        label={t('myCodes.reminderLabel')}
        placeholder={t('myCodes.countryCodePlaceholder')}
        value={value.reminderMinutes || null}
        options={reminderOptions}
        sheetTitle={t('myCodes.reminderLabel')}
        onChange={(reminderMinutes) => set('reminderMinutes', reminderMinutes)}
      />
      <FormField
        label={t('myCodes.linkLabel')}
        placeholder={t('myCodes.urlPlaceholder')}
        value={value.link}
        onChangeText={(v) => set('link', v)}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <FormField label={t('myCodes.notesLabel')} value={value.notes} onChangeText={(v) => set('notes', v)} multiline />
    </>
  );
}
