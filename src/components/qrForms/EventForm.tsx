import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DateTimeField } from '../DateTimeField';
import { SelectField, type SelectOption } from '../SelectField';
import { FormField } from './FormField';

export interface EventFields {
  title: string;
  location: string;
  startTime: Date | null;
  endTime: Date | null;
  reminderMinutes: string;
  link: string;
  notes: string;
}

export const defaultEventFields: EventFields = {
  title: '',
  location: '',
  startTime: null,
  endTime: null,
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
  // Which date field has its picker unfolded, if any. Owned here rather
  // than inside each field so opening one collapses the other.
  const [openPicker, setOpenPicker] = useState<'start' | 'end' | null>(null);
  const togglePicker = (which: 'start' | 'end') =>
    setOpenPicker((current) => (current === which ? null : which));
  const set = <K extends keyof EventFields>(key: K, fieldValue: EventFields[K]) => onChange({ ...value, [key]: fieldValue });

  const reminderOptions: SelectOption<string>[] = REMINDER_OPTIONS.map((minutes) => ({
    value: minutes,
    label: t(`myCodes.reminderOption_${minutes}`),
  }));

  return (
    <>
      <FormField label={t('myCodes.eventTitleLabel')} required value={value.title} onChangeText={(v) => set('title', v)} />
      <FormField label={t('myCodes.locationLabel')} value={value.location} onChangeText={(v) => set('location', v)} />
      <DateTimeField
        label={t('myCodes.startTimeLabel')}
        required
        placeholder={t('myCodes.selectDateTime')}
        value={value.startTime}
        onChange={(startTime) => set('startTime', startTime)}
        isOpen={openPicker === 'start'}
        onToggle={() => togglePicker('start')}
      />
      <DateTimeField
        label={t('myCodes.endTimeLabel')}
        placeholder={t('myCodes.selectDateTime')}
        value={value.endTime}
        onChange={(endTime) => set('endTime', endTime)}
        isOpen={openPicker === 'end'}
        onToggle={() => togglePicker('end')}
      />
      <SelectField
        label={t('myCodes.reminderLabel')}
        value={value.reminderMinutes || null}
        options={reminderOptions}
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
