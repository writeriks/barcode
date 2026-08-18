import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight, type BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  BackHandler,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BANNER_AD_RESERVED_HEIGHT, BottomBannerAd } from '../components/BottomBannerAd';
import { BottomSheet } from '../components/BottomSheet';
import { FadeSwitcher } from '../components/FadeSwitcher';
import { FilterPillRow, type PillOption } from '../components/FilterPillRow';
import { PillButton } from '../components/PillButton';
import { QrCode } from '../components/QrCode';
import { QrTypePicker } from '../components/QrTypePicker';
import { Toast } from '../components/Toast';
import { EmailForm, defaultEmailFields, type EmailFields } from '../components/qrForms/EmailForm';
import { EventForm, defaultEventFields, type EventFields } from '../components/qrForms/EventForm';
import { LinkForm, defaultLinkFields, type LinkFields } from '../components/qrForms/LinkForm';
import { LocationForm, defaultLocationFields, type LocationFields } from '../components/qrForms/LocationForm';
import { MeCardForm, defaultMeCardFields, type MeCardFields } from '../components/qrForms/MeCardForm';
import { PhoneForm, defaultPhoneFields, type PhoneFields } from '../components/qrForms/PhoneForm';
import { PhoneMessageForm, defaultPhoneMessageFields, type PhoneMessageFields } from '../components/qrForms/PhoneMessageForm';
import { SocialProfileForm, defaultSocialFields, type SocialFields } from '../components/qrForms/SocialProfileForm';
import { TextForm, defaultTextFields, type TextFields } from '../components/qrForms/TextForm';
import { UpiForm, defaultUpiFields, type UpiFields } from '../components/qrForms/UpiForm';
import { VCardForm, defaultVCardFields, type VCardFields } from '../components/qrForms/VCardForm';
import { WifiForm, defaultWifiFields, type WifiFields } from '../components/qrForms/WifiForm';
import { ZoomForm, defaultZoomFields, type ZoomFields } from '../components/qrForms/ZoomForm';
import { useQrShare } from '../hooks/useQrShare';
import { useToast } from '../hooks/useToast';
import type { RootTabParamList } from '../navigation/types';
import { captureAnalyticsEvent } from '../services/analytics';
import { deleteMyCode, getMyCodes, saveMyCode, updateMyCode } from '../services/myCodes';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import { accentTextColor } from '../theme/accents';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { MyCode } from '../types/myCode';
import { classifyQrContent, type QrContentType } from '../utils/classifyQrContent';
import { isQrEncodable } from '../utils/qrCapacity';
import { findCountryByRegionCode, type CountryCallingCode } from '../utils/countryCallingCodes';
import { getDeviceRegionCode } from '../utils/locale';
import {
  buildEmailContent,
  buildEventContent,
  buildLinkContent,
  buildLocationContent,
  buildMeCardContent,
  buildPhoneContent,
  buildSmsContent,
  buildSocialProfileContent,
  buildTextContent,
  buildUpiContent,
  buildVCardContent,
  buildWhatsAppContent,
  buildWifiContent,
  buildZoomContent,
} from '../utils/qrContentBuilders';
import {
  parseEmailFields,
  parseEventFields,
  parseLinkFields,
  parseLocationFields,
  parseMeCardFields,
  parsePhoneFields,
  parseSmsFields,
  parseSocialProfileFields,
  parseTextFields,
  parseUpiFields,
  parseVCardFields,
  parseWhatsappFields,
  parseWifiFields,
  parseZoomFields,
} from '../utils/qrContentParsers';
import { QR_GENERATE_TYPES, QR_SOCIAL_BASE_URL, QR_TYPE_ACCENT, QR_TYPE_ICON, QR_TYPE_LABEL_KEY } from '../utils/qrTypeMeta';

interface FormState {
  link: LinkFields;
  text: TextFields;
  email: EmailFields;
  phone: PhoneFields;
  sms: PhoneMessageFields;
  whatsapp: PhoneMessageFields;
  zoom: ZoomFields;
  wifi: WifiFields;
  vcard: VCardFields;
  mecard: MeCardFields;
  event: EventFields;
  location: LocationFields;
  upi: UpiFields;
  facebook: SocialFields;
  instagram: SocialFields;
  twitter: SocialFields;
  spotify: SocialFields;
  viber: SocialFields;
  paypal: SocialFields;
  linkedin: SocialFields;
  tiktok: SocialFields;
  youtube: SocialFields;
  telegram: SocialFields;
  pinterest: SocialFields;
  appstore: LinkFields;
  drive: LinkFields;
  dropbox: LinkFields;
}

function makeDefaultFormState(defaultCountry: CountryCallingCode | null): FormState {
  return {
    link: defaultLinkFields,
    text: defaultTextFields,
    email: defaultEmailFields,
    phone: defaultPhoneFields(defaultCountry),
    sms: defaultPhoneMessageFields(defaultCountry),
    whatsapp: defaultPhoneMessageFields(defaultCountry),
    zoom: defaultZoomFields,
    wifi: defaultWifiFields,
    vcard: defaultVCardFields(defaultCountry),
    mecard: defaultMeCardFields(defaultCountry),
    event: defaultEventFields,
    location: defaultLocationFields,
    upi: defaultUpiFields,
    facebook: defaultSocialFields,
    instagram: defaultSocialFields,
    twitter: defaultSocialFields,
    spotify: defaultSocialFields,
    viber: defaultSocialFields,
    paypal: defaultSocialFields,
    linkedin: defaultSocialFields,
    tiktok: defaultSocialFields,
    youtube: defaultSocialFields,
    telegram: defaultSocialFields,
    pinterest: defaultSocialFields,
    appstore: defaultLinkFields,
    drive: defaultLinkFields,
    dropbox: defaultLinkFields,
  };
}

function buildContent(type: QrContentType, fields: FormState): string | null {
  switch (type) {
    case 'link':
      return buildLinkContent(fields.link.url);
    case 'text':
      return buildTextContent(fields.text.message);
    case 'email':
      return buildEmailContent(fields.email);
    case 'phone':
      return buildPhoneContent({ dialCode: fields.phone.country?.dialCode ?? '', number: fields.phone.number });
    case 'sms':
      return buildSmsContent({
        dialCode: fields.sms.country?.dialCode ?? '',
        number: fields.sms.number,
        message: fields.sms.message,
      });
    case 'whatsapp':
      return buildWhatsAppContent({
        dialCode: fields.whatsapp.country?.dialCode ?? '',
        number: fields.whatsapp.number,
        message: fields.whatsapp.message,
      });
    case 'zoom':
      return buildZoomContent(fields.zoom);
    case 'wifi':
      return buildWifiContent(fields.wifi);
    case 'vcard':
      return buildVCardContent({
        version: fields.vcard.version,
        title: fields.vcard.title,
        firstName: fields.vcard.firstName,
        lastName: fields.vcard.lastName,
        homeDialCode: fields.vcard.homeCountry?.dialCode ?? '',
        homeNumber: fields.vcard.homeNumber,
        mobileDialCode: fields.vcard.mobileCountry?.dialCode ?? '',
        mobileNumber: fields.vcard.mobileNumber,
        email: fields.vcard.email,
        website: fields.vcard.website,
        company: fields.vcard.company,
        jobTitle: fields.vcard.jobTitle,
        officeDialCode: fields.vcard.officeCountry?.dialCode ?? '',
        officeNumber: fields.vcard.officeNumber,
        faxDialCode: fields.vcard.faxCountry?.dialCode ?? '',
        faxNumber: fields.vcard.faxNumber,
        address: fields.vcard.address,
        postCode: fields.vcard.postCode,
        city: fields.vcard.city,
        state: fields.vcard.state,
        country: fields.vcard.country,
      });
    case 'event':
      return buildEventContent(fields.event);
    case 'mecard':
      return buildMeCardContent({
        name: fields.mecard.name,
        dialCode: fields.mecard.country?.dialCode ?? '',
        number: fields.mecard.number,
        email: fields.mecard.email,
        company: fields.mecard.company,
        address: fields.mecard.address,
        website: fields.mecard.website,
      });
    case 'location':
      return buildLocationContent(fields.location);
    case 'upi':
      return buildUpiContent(fields.upi);
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'spotify':
    case 'viber':
    case 'paypal':
    case 'linkedin':
    case 'tiktok':
    case 'youtube':
    case 'telegram':
    case 'pinterest':
      return buildSocialProfileContent(QR_SOCIAL_BASE_URL[type], fields[type].value);
    // A share link is pasted whole — there's no handle to prefix, so these
    // are the link builder wearing a brand's name and icon.
    case 'appstore':
    case 'drive':
    case 'dropbox':
      return buildLinkContent(fields[type].url);
    case 'otp':
      return null;
  }
}

function codeTypeOf(code: MyCode): QrContentType {
  return code.type ?? classifyQrContent(code.content);
}

function matchesCodeSearch(code: MyCode, query: string): boolean {
  return code.label.toLowerCase().includes(query) || code.content.toLowerCase().includes(query);
}

function defaultLabelFor(type: QrContentType, content: string, fields: FormState): string {
  switch (type) {
    case 'email':
      return fields.email.to || content;
    case 'phone':
      return `${fields.phone.country?.dialCode ?? ''}${fields.phone.number}` || content;
    case 'sms':
      return `${fields.sms.country?.dialCode ?? ''}${fields.sms.number}` || content;
    case 'whatsapp':
      return `${fields.whatsapp.country?.dialCode ?? ''}${fields.whatsapp.number}` || content;
    case 'zoom':
      return fields.zoom.meetingId || content;
    case 'wifi':
      return fields.wifi.ssid || content;
    case 'vcard':
      return [fields.vcard.firstName, fields.vcard.lastName].filter(Boolean).join(' ') || fields.vcard.company || content;
    case 'event':
      return fields.event.title || content;
    case 'mecard':
      return fields.mecard.name || content;
    case 'location':
      return fields.location.latitude && fields.location.longitude
        ? `${fields.location.latitude}, ${fields.location.longitude}`
        : content;
    case 'upi':
      return fields.upi.payeeName || fields.upi.vpa || content;
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'spotify':
    case 'viber':
    case 'paypal':
    case 'linkedin':
    case 'tiktok':
    case 'youtube':
    case 'telegram':
    case 'pinterest':
      return fields[type].value || content;
    case 'appstore':
    case 'drive':
    case 'dropbox':
      return fields[type].url || content;
    default:
      return content;
  }
}

/** The inverse of buildContent — reopens an existing code in the same
 * structured form it was created with, pre-filled from its saved content.
 * 'otp' isn't a generator type (scan-only), so an OTP-classified legacy
 * entry edits as freeform text instead. */
function fieldsFromCode(
  code: MyCode,
  defaultCountry: CountryCallingCode | null
): { type: QrContentType; fields: FormState } {
  const detectedType = codeTypeOf(code);
  const type = detectedType === 'otp' ? 'text' : detectedType;
  const fields = makeDefaultFormState(defaultCountry);

  switch (type) {
    case 'link':
      fields.link = parseLinkFields(code.content);
      break;
    case 'text':
      fields.text = detectedType === 'otp' ? { message: code.content } : parseTextFields(code.content);
      break;
    case 'email':
      fields.email = parseEmailFields(code.content);
      break;
    case 'phone':
      fields.phone = parsePhoneFields(code.content, defaultCountry);
      break;
    case 'sms':
      fields.sms = parseSmsFields(code.content, defaultCountry);
      break;
    case 'whatsapp':
      fields.whatsapp = parseWhatsappFields(code.content, defaultCountry);
      break;
    case 'zoom':
      fields.zoom = parseZoomFields(code.content);
      break;
    case 'wifi':
      fields.wifi = parseWifiFields(code.content);
      break;
    case 'vcard':
      fields.vcard = parseVCardFields(code.content, defaultCountry);
      break;
    case 'event':
      fields.event = parseEventFields(code.content);
      break;
    case 'mecard':
      fields.mecard = parseMeCardFields(code.content, defaultCountry);
      break;
    case 'location':
      fields.location = parseLocationFields(code.content);
      break;
    case 'upi':
      fields.upi = parseUpiFields(code.content);
      break;
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'spotify':
    case 'viber':
    case 'paypal':
    case 'linkedin':
    case 'tiktok':
    case 'youtube':
    case 'telegram':
    case 'pinterest':
      fields[type] = parseSocialProfileFields(code.content);
      break;
    case 'appstore':
    case 'drive':
    case 'dropbox':
      fields[type] = parseLinkFields(code.content);
      break;
  }

  return { type, fields };
}

type Props = BottomTabScreenProps<RootTabParamList, 'MyCodes'>;

export function MyCodesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const [codes, setCodes] = useState<MyCode[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<MyCode | null>(null);
  const [menuCode, setMenuCode] = useState<MyCode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<QrContentType>>(new Set());
  const { message: toastMessage, showToast } = useToast();
  // Saving now rejects unencodable content, but codes saved before that
  // guard existed are still in the list and can't be drawn to share.
  const { shareQr, qrRenderer } = useQrShare(() => showToast(t('myCodes.tooLongTitle')));

  const defaultCountry = useMemo(() => findCountryByRegionCode(getDeviceRegionCode()) ?? null, []);
  const [type, setType] = useState<QrContentType>('link');
  const [label, setLabel] = useState('');
  const [fields, setFields] = useState<FormState>(() => makeDefaultFormState(defaultCountry));

  const reload = useCallback(() => {
    getMyCodes().then(setCodes);
  }, []);

  useFocusEffect(reload);

  const resetForm = useCallback(() => {
    setType('link');
    setLabel('');
    setFields(makeDefaultFormState(defaultCountry));
  }, [defaultCountry]);

  const handleCancel = useCallback(() => {
    setIsCreating(false);
    setFormSheetOpen(false);
    setEditingId(null);
    resetForm();
  }, [resetForm]);

  /**
   * Closing the form means different things in the two flows it serves.
   *
   * Creating, the type grid is still mounted behind the sheet, so closing
   * is "pick a different type" and the draft stays. Editing, there is no
   * grid — the code's type was decided when it was saved — so closing is
   * the end of the edit, and leaving `editingId` set would arm a trap:
   * the next type tapped would save over the original code as a different
   * type, with the fields of neither.
   */
  const handleCloseFormSheet = useCallback(() => {
    setFormSheetOpen(false);
    if (editingId) {
      setEditingId(null);
      resetForm();
    }
  }, [editingId, resetForm]);

  // Re-tapping the already-active My Codes tab while viewing a code or
  // creating one should pop back to the list, not do nothing.
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (!navigation.isFocused()) return;
      if (formSheetOpen) handleCloseFormSheet();
      else if (viewing) setViewing(null);
      else if (isCreating) handleCancel();
    });
  }, [navigation, viewing, isCreating, formSheetOpen, handleCloseFormSheet, handleCancel]);

  // This tab shows three things without a navigator between them, so
  // Android's back gesture had nothing to act on and the viewer and the
  // form were both dead ends. Handled only while one of them is open, so
  // back still leaves the app from the list itself.
  useEffect(() => {
    if (!viewing && !isCreating && !formSheetOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (formSheetOpen) handleCloseFormSheet();
      else if (viewing) setViewing(null);
      else handleCancel();
      return true;
    });
    return () => subscription.remove();
  }, [viewing, isCreating, formSheetOpen, handleCloseFormSheet, handleCancel]);

  const content = useMemo(() => buildContent(type, fields), [type, fields]);

  // Only offer a type as a filter once you've actually saved one of that
  // kind — matches how History's type filters work.
  const availableTypes = useMemo(() => {
    const set = new Set<QrContentType>();
    codes.forEach((code) => set.add(codeTypeOf(code)));
    return set;
  }, [codes]);

  const typeOptions: PillOption<QrContentType>[] = useMemo(
    () =>
      QR_GENERATE_TYPES.filter((codeType) => availableTypes.has(codeType)).map((codeType) => ({
        value: codeType,
        label: t(QR_TYPE_LABEL_KEY[codeType]),
        accent: QR_TYPE_ACCENT[codeType],
      })),
    [t, availableTypes]
  );

  useEffect(() => {
    setActiveTypes((prev) => {
      const next = new Set([...prev].filter((value) => availableTypes.has(value)));
      return next.size === prev.size ? prev : next;
    });
  }, [availableTypes]);

  const handleToggleType = (value: QrContentType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  const filteredCodes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return codes.filter((code) => {
      if (activeTypes.size > 0 && !activeTypes.has(codeTypeOf(code))) return false;
      if (query && !matchesCodeSearch(code, query)) return false;
      return true;
    });
  }, [codes, searchQuery, activeTypes]);

  const handleSave = async () => {
    if (!content) return;
    // A code that can't be drawn can't be saved: nothing would render it
    // later, and the list would be carrying an entry that does nothing.
    if (!isQrEncodable(content)) {
      Alert.alert(t('myCodes.tooLongTitle'), t('myCodes.tooLongBody'));
      return;
    }
    const resolvedLabel = label.trim() || defaultLabelFor(type, content, fields);
    if (editingId) {
      const original = codes.find((c) => c.id === editingId);
      await updateMyCode({ id: editingId, label: resolvedLabel, content, createdAt: original?.createdAt ?? Date.now(), type });
      captureAnalyticsEvent('my_code_updated', { type });
    } else {
      await saveMyCode({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: resolvedLabel,
        content,
        createdAt: Date.now(),
        type,
      });
      captureAnalyticsEvent('my_code_created', { type });
    }
    setIsCreating(false);
    setFormSheetOpen(false);
    setEditingId(null);
    // The viewer, if it's behind this sheet, is still drawing the code as
    // it was before the edit. Back to the list, where the change shows.
    setViewing(null);
    resetForm();
    reload();
  };

  const handleSelectType = (next: QrContentType) => {
    setType(next);
    setFormSheetOpen(true);
  };

  const handleEdit = (code: MyCode) => {
    const { type: parsedType, fields: parsedFields } = fieldsFromCode(code, defaultCountry);
    setEditingId(code.id);
    setType(parsedType);
    setLabel(code.label);
    setFields(parsedFields);
    // Deliberately leaves `isCreating` and `viewing` alone. The type grid
    // has nothing to offer an existing code, and keeping the viewer
    // mounted underneath is what makes closing the sheet land back where
    // the edit was started from.
    setFormSheetOpen(true);
  };

  const handleShare = (code: MyCode) => {
    captureAnalyticsEvent('my_code_shared', { type: codeTypeOf(code) });
    // Sends the code as a scannable image alongside its text — sharing a
    // QR as bare text makes the recipient rebuild it to actually use it.
    shareQr(code.content);
  };

  const handleCopyContent = async (code: MyCode) => {
    await Clipboard.setStringAsync(code.content);
    showToast(t('qr.copied'));
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('myCodes.deleteTitle'), t('myCodes.deleteBody'), [
      { text: t('myCodes.cancel'), style: 'cancel' },
      {
        text: t('myCodes.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteMyCode(id);
          setViewing(null);
          reload();
        },
      },
    ]);
  };

  const screenMode = viewing ? 'viewing' : isCreating ? 'creating' : 'list';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FadeSwitcher activeKey={screenMode}>
        {viewing ? (
          <View style={styles.viewerScreen}>
            <Pressable
              onPress={() => setViewing(null)}
              hitSlop={10}
              style={styles.backRow}
              accessibilityLabel={t('myCodes.title')}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
              <Text style={styles.backLabel}>{t('myCodes.title')}</Text>
            </Pressable>
            <View style={styles.viewer}>
            <View style={styles.qrCard}>
              <QrCode value={viewing.content} size={220} color={colors.inkOnCream} backgroundColor={colors.cream} />
            </View>
            <Text style={styles.viewerLabel}>{viewing.label}</Text>
            <Pressable
              onPress={() => handleCopyContent(viewing)}
              style={({ pressed }) => [styles.viewerContentRow, pressed && styles.viewerContentPressed]}
              hitSlop={6}
            >
              <Text style={styles.viewerContent} numberOfLines={2}>
                {viewing.content}
              </Text>
              <Ionicons name="copy-outline" size={13} color={colors.text} style={styles.viewerCopyIcon} />
            </Pressable>
            {/* Three, not four: "Close" was only there because there was
                no way back, and the header now is that way back. */}
            <View style={styles.viewerActions}>
              <PillButton
                title={t('myCodes.share')}
                onPress={() => handleShare(viewing)}
                variant="ghost"
                style={styles.flexButton}
              />
              <PillButton
                title={t('myCodes.edit')}
                onPress={() => handleEdit(viewing)}
                variant="ghost"
                style={styles.flexButton}
              />
              <PillButton
                title={t('myCodes.delete')}
                onPress={() => handleDelete(viewing.id)}
                variant="ghost"
                style={styles.flexButton}
              />
            </View>
            </View>
          </View>
        ) : (
          <>
            {isCreating ? (
              <>
                <Pressable
                  onPress={handleCancel}
                  hitSlop={10}
                  style={styles.backRow}
                  accessibilityLabel={t('myCodes.title')}
                >
                  <Ionicons name="chevron-back" size={18} color={colors.text} />
                  <Text style={styles.backLabel}>{t('myCodes.title')}</Text>
                </Pressable>
                {/* The back row names where it goes, not where you are —
                    without this the type grid arrived unlabelled. */}
                <Text style={styles.screenTitle}>{t('myCodes.chooseType')}</Text>
              </>
            ) : (
              <View style={styles.header}>
                <Text style={styles.title}>{t('myCodes.title')}</Text>
                <Pressable
                  onPress={() => setIsCreating(true)}
                  style={styles.addButton}
                  hitSlop={10}
                  accessibilityLabel={t('a11y.add')}
                >
                  <Text style={styles.addGlyph}>+</Text>
                </Pressable>
              </View>
            )}

            {isCreating ? (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={[styles.form, { paddingBottom: tabBarHeight + 20 }]}
                keyboardShouldPersistTaps="handled"
              >
                <QrTypePicker value={type} onChange={handleSelectType} />
              </ScrollView>
            ) : (
              <View style={[styles.flex, { paddingBottom: tabBarHeight }]}>
                {codes.length === 0 ? (
                  <View style={styles.empty}>
                    <Text style={styles.emptyTitle}>{t('myCodes.empty')}</Text>
                    <Text style={styles.emptyBody}>{t('myCodes.emptyBody')}</Text>
                    <PillButton title={t('myCodes.create')} onPress={() => setIsCreating(true)} variant="citrus" />
                  </View>
                ) : (
                  <>
                    <View style={styles.filters}>
                      <View style={styles.searchBar}>
                        <Ionicons name="search" size={16} color={colors.text} style={styles.searchIcon} />
                        <TextInput
                          style={styles.searchInput}
                          placeholder={t('myCodes.searchPlaceholder')}
                          placeholderTextColor={placeholderColor}
                          value={searchQuery}
                          onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 ? (
                          <Pressable onPress={() => setSearchQuery('')} hitSlop={8} accessibilityLabel={t('a11y.clearSearch')}>
                            <Ionicons name="close-circle" size={16} color={colors.text} style={styles.searchClear} />
                          </Pressable>
                        ) : null}
                      </View>

                      {typeOptions.length > 0 ? (
                        <FilterPillRow
                          options={typeOptions}
                          isSelected={(value) => activeTypes.has(value)}
                          onPress={handleToggleType}
                        />
                      ) : null}
                    </View>

                    {filteredCodes.length === 0 ? (
                      <View style={styles.empty}>
                        <Text style={styles.emptyTitle}>{t('history.noResults')}</Text>
                        <Text style={styles.emptyBody}>{t('history.noResultsBody')}</Text>
                      </View>
                    ) : (
                      <FlatList
                        data={filteredCodes}
                        keyExtractor={(item) => item.id}
                        style={styles.flex}
                        contentContainerStyle={[styles.list, { paddingBottom: 20 }]}
                        renderItem={({ item }) => {
                          const itemType = codeTypeOf(item);
                          const accent = accentTextColor(colors, QR_TYPE_ACCENT[itemType]);
                          return (
                            <Pressable
                              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                              onPress={() => setViewing(item)}
                            >
                              {/* A 40px QR is too small to scan off the
                                  list anyway, and drawing one per row meant
                                  building a whole matrix per row. The type
                                  icon says the same thing for free. */}
                              <View style={[styles.rowIconBadge, { borderColor: accent }]}>
                                <Ionicons name={QR_TYPE_ICON[itemType]} size={18} color={accent} />
                              </View>
                              <View style={styles.rowText}>
                                <Text style={styles.rowLabel} numberOfLines={1}>
                                  {item.label}
                                </Text>
                                <Text style={styles.rowMeta} numberOfLines={1}>
                                  {t(QR_TYPE_LABEL_KEY[itemType])}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => setMenuCode(item)}
                                hitSlop={10}
                                style={styles.rowMenuButton}
                                accessibilityLabel={t('a11y.moreOptions')}
                              >
                                <Ionicons name="ellipsis-vertical" size={16} color={colors.text} style={styles.rowMenuIcon} />
                              </Pressable>
                            </Pressable>
                          );
                        }}
                      />
                    )}
                  </>
                )}

                <BottomBannerAd />
              </View>
            )}
          </>
        )}
      </FadeSwitcher>

      {/* Generator fields used to sit under the type grid and push a
          vCard's worth of inputs onto the same screen. Tapping a type
          now opens them here instead. */}
      <BottomSheet
        visible={formSheetOpen}
        onClose={handleCloseFormSheet}
        title={t(QR_TYPE_LABEL_KEY[type])}
        scroll
        footer={
          <PillButton
            title={t(editingId ? 'myCodes.update' : 'myCodes.save')}
            onPress={handleSave}
            variant="citrus"
            style={!content && styles.saveDisabled}
          />
        }
      >
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>{t('myCodes.labelLabel')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('myCodes.labelPlaceholder')}
            placeholderTextColor={placeholderColor}
            value={label}
            onChangeText={setLabel}
          />
        </View>
        {type === 'link' && <LinkForm value={fields.link} onChange={(link) => setFields({ ...fields, link })} />}
        {type === 'text' && <TextForm value={fields.text} onChange={(text) => setFields({ ...fields, text })} />}
        {type === 'email' && <EmailForm value={fields.email} onChange={(email) => setFields({ ...fields, email })} />}
        {type === 'phone' && <PhoneForm value={fields.phone} onChange={(phone) => setFields({ ...fields, phone })} />}
        {type === 'sms' && <PhoneMessageForm value={fields.sms} onChange={(sms) => setFields({ ...fields, sms })} />}
        {type === 'whatsapp' && (
          <PhoneMessageForm value={fields.whatsapp} onChange={(whatsapp) => setFields({ ...fields, whatsapp })} />
        )}
        {type === 'zoom' && <ZoomForm value={fields.zoom} onChange={(zoom) => setFields({ ...fields, zoom })} />}
        {type === 'wifi' && <WifiForm value={fields.wifi} onChange={(wifi) => setFields({ ...fields, wifi })} />}
        {type === 'vcard' && <VCardForm value={fields.vcard} onChange={(vcard) => setFields({ ...fields, vcard })} />}
        {type === 'event' && <EventForm value={fields.event} onChange={(event) => setFields({ ...fields, event })} />}
        {type === 'mecard' && <MeCardForm value={fields.mecard} onChange={(mecard) => setFields({ ...fields, mecard })} />}
        {type === 'location' && (
          <LocationForm value={fields.location} onChange={(location) => setFields({ ...fields, location })} />
        )}
        {type === 'upi' && <UpiForm value={fields.upi} onChange={(upi) => setFields({ ...fields, upi })} />}
        {type === 'facebook' && (
          <SocialProfileForm
            value={fields.facebook}
            onChange={(facebook) => setFields({ ...fields, facebook })}
            label={t('myCodes.facebookLabel')}
            placeholder={t('myCodes.facebookPlaceholder')}
          />
        )}
        {type === 'instagram' && (
          <SocialProfileForm
            value={fields.instagram}
            onChange={(instagram) => setFields({ ...fields, instagram })}
            label={t('myCodes.instagramLabel')}
            placeholder={t('myCodes.instagramPlaceholder')}
          />
        )}
        {type === 'twitter' && (
          <SocialProfileForm
            value={fields.twitter}
            onChange={(twitter) => setFields({ ...fields, twitter })}
            label={t('myCodes.twitterLabel')}
            placeholder={t('myCodes.twitterPlaceholder')}
          />
        )}
        {type === 'spotify' && (
          <SocialProfileForm
            value={fields.spotify}
            onChange={(spotify) => setFields({ ...fields, spotify })}
            label={t('myCodes.spotifyLabel')}
            placeholder={t('myCodes.spotifyPlaceholder')}
          />
        )}
        {type === 'viber' && (
          <SocialProfileForm
            value={fields.viber}
            onChange={(viber) => setFields({ ...fields, viber })}
            label={t('myCodes.viberLabel')}
            placeholder={t('myCodes.viberPlaceholder')}
          />
        )}
        {type === 'paypal' && (
          <SocialProfileForm
            value={fields.paypal}
            onChange={(paypal) => setFields({ ...fields, paypal })}
            label={t('myCodes.paypalLabel')}
            placeholder={t('myCodes.paypalPlaceholder')}
          />
        )}
        {type === 'linkedin' && (
          <SocialProfileForm
            value={fields.linkedin}
            onChange={(linkedin) => setFields({ ...fields, linkedin })}
            label={t('myCodes.linkedinLabel')}
            placeholder={t('myCodes.linkedinPlaceholder')}
          />
        )}
        {type === 'tiktok' && (
          <SocialProfileForm
            value={fields.tiktok}
            onChange={(tiktok) => setFields({ ...fields, tiktok })}
            label={t('myCodes.tiktokLabel')}
            placeholder={t('myCodes.tiktokPlaceholder')}
          />
        )}
        {type === 'youtube' && (
          <SocialProfileForm
            value={fields.youtube}
            onChange={(youtube) => setFields({ ...fields, youtube })}
            label={t('myCodes.youtubeLabel')}
            placeholder={t('myCodes.youtubePlaceholder')}
          />
        )}
        {type === 'telegram' && (
          <SocialProfileForm
            value={fields.telegram}
            onChange={(telegram) => setFields({ ...fields, telegram })}
            label={t('myCodes.telegramLabel')}
            placeholder={t('myCodes.telegramPlaceholder')}
          />
        )}
        {type === 'pinterest' && (
          <SocialProfileForm
            value={fields.pinterest}
            onChange={(pinterest) => setFields({ ...fields, pinterest })}
            label={t('myCodes.pinterestLabel')}
            placeholder={t('myCodes.pinterestPlaceholder')}
          />
        )}
        {type === 'appstore' && (
          <LinkForm
            value={fields.appstore}
            onChange={(appstore) => setFields({ ...fields, appstore })}
            label={t('myCodes.appstoreLabel')}
            placeholder={t('myCodes.appstorePlaceholder')}
          />
        )}
        {type === 'drive' && (
          <LinkForm
            value={fields.drive}
            onChange={(drive) => setFields({ ...fields, drive })}
            label={t('myCodes.driveLabel')}
            placeholder={t('myCodes.drivePlaceholder')}
          />
        )}
        {type === 'dropbox' && (
          <LinkForm
            value={fields.dropbox}
            onChange={(dropbox) => setFields({ ...fields, dropbox })}
            label={t('myCodes.dropboxLabel')}
            placeholder={t('myCodes.dropboxPlaceholder')}
          />
        )}
      </BottomSheet>

      <BottomSheet visible={menuCode !== null} onClose={() => setMenuCode(null)} title={t('myCodes.codeOptionsTitle')}>
        <View style={styles.sheetList}>
          <Pressable
            onPress={() => {
              const code = menuCode;
              setMenuCode(null);
              // Same Modal-on-Modal race as share/delete below: the
              // generator form is itself a BottomSheet, so opening it in
              // the same tick as dismissing this menu would swallow it.
              if (code) setTimeout(() => handleEdit(code), 300);
            }}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="create-outline" size={18} color={colors.mint} />
            <Text style={styles.menuRowText}>{t('myCodes.edit')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const code = menuCode;
              setMenuCode(null);
              // BottomSheet is a native Modal — presenting the share sheet
              // in the same tick as dismissing it races the two native
              // presentations and the share sheet silently never appears.
              // Deferring past the dismissal fixes it (see the identical
              // fix/comment in HistoryScreen.tsx's handleShareMenuEntry).
              if (code) setTimeout(() => handleShare(code), 300);
            }}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="share-outline" size={18} color={colors.citrusText} />
            <Text style={styles.menuRowText}>{t('myCodes.share')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const code = menuCode;
              setMenuCode(null);
              // The confirmation is a native alert and the sheet is a
              // native Modal — same race as the share row above, and the
              // alert would silently never appear. Defer past the dismissal.
              if (code) setTimeout(() => handleDelete(code.id), 300);
            }}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.coralText} />
            <Text style={[styles.menuRowText, styles.menuRowTextDestructive]}>{t('myCodes.delete')}</Text>
          </Pressable>
        </View>
      </BottomSheet>

      <Toast message={toastMessage} bottom={tabBarHeight + BANNER_AD_RESERVED_HEIGHT + 16} />
      {qrRenderer}
    </SafeAreaView>
  );
}

function createStyles(colors: ColorTheme) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.cabinet,
    },
    flex: {
      flex: 1,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 20,
      paddingBottom: 8,
    },
    title: {
      fontFamily: fonts.displayBold,
      fontSize: 22,
      color: colors.text,
    },
    addButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addGlyph: {
      fontSize: 20,
      color: colors.mint,
      marginTop: -2,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      gap: 10,
    },
    emptyTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 17,
      color: colors.text,
    },
    emptyBody: {
      fontSize: 13.5,
      color: colors.text,
      opacity: 0.6,
      textAlign: 'center',
      maxWidth: 260,
      marginBottom: 6,
    },
    filters: {
      paddingHorizontal: 20,
      gap: 10,
      marginBottom: 12,
    },
    searchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    searchIcon: {
      opacity: 0.55,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      padding: 0,
    },
    searchClear: {
      opacity: 0.5,
    },
    list: {
      paddingHorizontal: 20,
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      padding: 12,
    },
    rowPressed: {
      opacity: 0.75,
    },
    rowIconBadge: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: {
      flex: 1,
    },
    rowLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 14.5,
      color: colors.text,
    },
    rowMeta: {
      fontSize: 11.5,
      color: colors.text,
      opacity: 0.5,
      marginTop: 2,
    },
    rowMenuButton: {
      padding: 4,
    },
    rowMenuIcon: {
      opacity: 0.5,
    },
    sheetList: {
      gap: 10,
      paddingBottom: 6,
    },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    menuRowText: {
      fontFamily: fonts.displayBold,
      fontSize: 14.5,
      color: colors.text,
    },
    menuRowTextDestructive: {
      color: colors.coralText,
    },
    form: {
      width: '100%',
      alignItems: 'stretch',
      padding: 20,
      gap: 14,
    },
    field: {
      gap: 6,
    },
    fieldLabel: {
      fontSize: 12.5,
      color: colors.text,
      opacity: 0.65,
    },
    input: {
      backgroundColor: colors.cabinet,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    saveDisabled: {
      opacity: 0.4,
    },
    viewerScreen: {
      flex: 1,
    },
    backRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 16,
      paddingTop: 6,
      paddingBottom: 2,
    },
    backLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 15,
      color: colors.text,
    },
    screenTitle: {
      fontFamily: fonts.displayBold,
      fontSize: 22,
      color: colors.text,
      paddingHorizontal: 20,
      paddingTop: 6,
      paddingBottom: 2,
    },
    viewer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 28,
      gap: 14,
    },
    qrCard: {
      backgroundColor: colors.cream,
      padding: 20,
      borderRadius: 20,
    },
    viewerLabel: {
      fontFamily: fonts.displayBold,
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
    },
    viewerContentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      maxWidth: 280,
    },
    viewerContentPressed: {
      opacity: 0.7,
    },
    viewerContent: {
      flexShrink: 1,
      fontSize: 13,
      color: colors.text,
      opacity: 0.6,
      textAlign: 'center',
    },
    viewerCopyIcon: {
      opacity: 0.5,
    },
    viewerActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
    flexButton: {
      flex: 1,
    },
  });
}
