import { FormField } from './FormField';

export interface SocialFields {
  value: string;
}

export const defaultSocialFields: SocialFields = { value: '' };

interface Props {
  value: SocialFields;
  onChange: (value: SocialFields) => void;
  label: string;
  placeholder: string;
}

/** Shared by the Facebook/Instagram/Twitter/Spotify/Viber generators —
 * all five are just "username or profile link", so one field does it
 * instead of five near-identical form files (see buildSocialProfileContent
 * for how a bare username turns into the platform's URL). */
export function SocialProfileForm({ value, onChange, label, placeholder }: Props) {
  return (
    <FormField
      label={label}
      required
      placeholder={placeholder}
      value={value.value}
      onChangeText={(next) => onChange({ value: next })}
      autoCapitalize="none"
      autoCorrect={false}
      keyboardType="url"
    />
  );
}
