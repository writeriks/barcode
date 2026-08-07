import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';
import { useThemeColors } from '../../theme/ThemeContext';
import type { WifiNetworkType } from '../../utils/qrContentBuilders';
import { SelectField, type SelectOption } from '../SelectField';
import { FormField } from './FormField';
import { createFieldStyles } from './formFieldStyles';

export interface WifiFields {
  ssid: string;
  networkType: WifiNetworkType;
  password: string;
  hidden: boolean;
}

export const defaultWifiFields: WifiFields = { ssid: '', networkType: 'WPA', password: '', hidden: false };

interface Props {
  value: WifiFields;
  onChange: (value: WifiFields) => void;
}

export function WifiForm({ value, onChange }: Props) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = useMemo(() => createFieldStyles(colors), [colors]);

  const networkTypeOptions: SelectOption<WifiNetworkType>[] = [
    { value: 'WEP', label: t('myCodes.wifiTypeWep') },
    { value: 'WPA', label: t('myCodes.wifiTypeWpa') },
    { value: 'nopass', label: t('myCodes.wifiTypeOpen') },
  ];

  return (
    <>
      <FormField
        label={t('myCodes.networkNameLabel')}
        placeholder={t('myCodes.networkNamePlaceholder')}
        value={value.ssid}
        onChangeText={(ssid) => onChange({ ...value, ssid })}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <SelectField
        label={t('myCodes.networkTypeLabel')}
        placeholder={t('myCodes.countryCodePlaceholder')}
        value={value.networkType}
        options={networkTypeOptions}
        sheetTitle={t('myCodes.networkTypeLabel')}
        onChange={(networkType) => onChange({ ...value, networkType })}
      />
      {value.networkType !== 'nopass' ? (
        <FormField
          label={t('myCodes.passwordLabel')}
          value={value.password}
          onChangeText={(password) => onChange({ ...value, password })}
          autoCapitalize="none"
          secureTextEntry
        />
      ) : null}
      <Pressable style={styles.checkboxRow} onPress={() => onChange({ ...value, hidden: !value.hidden })}>
        <Ionicons name={value.hidden ? 'checkbox' : 'square-outline'} size={20} color={value.hidden ? colors.mint : colors.text} />
        <Text style={styles.checkboxLabel}>{t('myCodes.hiddenNetworkLabel')}</Text>
      </Pressable>
    </>
  );
}
