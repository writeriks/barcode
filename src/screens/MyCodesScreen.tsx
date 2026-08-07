import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FadeSwitcher } from '../components/FadeSwitcher';
import { FilterPillRow, type PillOption } from '../components/FilterPillRow';
import { PillButton } from '../components/PillButton';
import { QrTypePicker } from '../components/QrTypePicker';
import { EmailForm, defaultEmailFields, type EmailFields } from '../components/qrForms/EmailForm';
import { EventForm, defaultEventFields, type EventFields } from '../components/qrForms/EventForm';
import { LinkForm, defaultLinkFields, type LinkFields } from '../components/qrForms/LinkForm';
import { PhoneForm, defaultPhoneFields, type PhoneFields } from '../components/qrForms/PhoneForm';
import { PhoneMessageForm, defaultPhoneMessageFields, type PhoneMessageFields } from '../components/qrForms/PhoneMessageForm';
import { TextForm, defaultTextFields, type TextFields } from '../components/qrForms/TextForm';
import { VCardForm, defaultVCardFields, type VCardFields } from '../components/qrForms/VCardForm';
import { WifiForm, defaultWifiFields, type WifiFields } from '../components/qrForms/WifiForm';
import { ZoomForm, defaultZoomFields, type ZoomFields } from '../components/qrForms/ZoomForm';
import { captureAnalyticsEvent } from '../services/analytics';
import { deleteMyCode, getMyCodes, saveMyCode } from '../services/myCodes';
import { useThemeColors, useThemeMode } from '../theme/ThemeContext';
import type { ColorTheme } from '../theme/colors';
import { fonts } from '../theme/fonts';
import type { MyCode } from '../types/myCode';
import { classifyQrContent, type QrContentType } from '../utils/classifyQrContent';
import { findCountryByRegionCode, type CountryCallingCode } from '../utils/countryCallingCodes';
import { getDeviceRegionCode } from '../utils/locale';
import {
  buildEmailContent,
  buildEventContent,
  buildLinkContent,
  buildPhoneContent,
  buildSmsContent,
  buildTextContent,
  buildVCardContent,
  buildWhatsAppContent,
  buildWifiContent,
  buildZoomContent,
} from '../utils/qrContentBuilders';
import { QR_GENERATE_TYPES, QR_TYPE_ACCENT, QR_TYPE_ICON, QR_TYPE_LABEL_KEY } from '../utils/qrTypeMeta';

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
  event: EventFields;
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
    event: defaultEventFields,
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
    default:
      return content;
  }
}

export function MyCodesScreen() {
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const colors = useThemeColors();
  const mode = useThemeMode();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const placeholderColor = mode === 'light' ? 'rgba(36,25,51,0.35)' : 'rgba(255,246,233,0.4)';
  const [codes, setCodes] = useState<MyCode[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [viewing, setViewing] = useState<MyCode | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTypes, setActiveTypes] = useState<Set<QrContentType>>(new Set());

  const defaultCountry = useMemo(() => findCountryByRegionCode(getDeviceRegionCode()) ?? null, []);
  const [type, setType] = useState<QrContentType>('link');
  const [label, setLabel] = useState('');
  const [fields, setFields] = useState<FormState>(() => makeDefaultFormState(defaultCountry));

  const reload = useCallback(() => {
    getMyCodes().then(setCodes);
  }, []);

  useFocusEffect(reload);

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

  const resetForm = () => {
    setType('link');
    setLabel('');
    setFields(makeDefaultFormState(defaultCountry));
  };

  const handleSave = async () => {
    if (!content) return;
    const code: MyCode = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: label.trim() || defaultLabelFor(type, content, fields),
      content,
      createdAt: Date.now(),
      type,
    };
    await saveMyCode(code);
    captureAnalyticsEvent('my_code_created', { type });
    setIsCreating(false);
    resetForm();
    reload();
  };

  const handleCancel = () => {
    setIsCreating(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteMyCode(id);
    setViewing(null);
    reload();
  };

  const screenMode = viewing ? 'viewing' : isCreating ? 'creating' : 'list';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <FadeSwitcher activeKey={screenMode}>
        {viewing ? (
          <View style={styles.viewer}>
            <View style={styles.qrCard}>
              <QRCode value={viewing.content} size={220} color={colors.inkOnCream} backgroundColor={colors.cream} />
            </View>
            <Text style={styles.viewerLabel}>{viewing.label}</Text>
            <Text style={styles.viewerContent} numberOfLines={2}>
              {viewing.content}
            </Text>
            <View style={styles.viewerActions}>
              <PillButton title={t('myCodes.delete')} onPress={() => handleDelete(viewing.id)} variant="ghost" />
              <PillButton title={t('settings.close')} onPress={() => setViewing(null)} variant="punch" />
            </View>
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>{t('myCodes.title')}</Text>
              {!isCreating ? (
                <Pressable onPress={() => setIsCreating(true)} style={styles.addButton} hitSlop={10}>
                  <Text style={styles.addGlyph}>+</Text>
                </Pressable>
              ) : null}
            </View>

            {isCreating ? (
              <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                  contentContainerStyle={[styles.form, { paddingBottom: tabBarHeight + 20 }]}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="on-drag"
                  automaticallyAdjustKeyboardInsets
                >
                  <QrTypePicker value={type} onChange={setType} />

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
                  {type === 'email' && (
                    <EmailForm value={fields.email} onChange={(email) => setFields({ ...fields, email })} />
                  )}
                  {type === 'phone' && (
                    <PhoneForm value={fields.phone} onChange={(phone) => setFields({ ...fields, phone })} />
                  )}
                  {type === 'sms' && <PhoneMessageForm value={fields.sms} onChange={(sms) => setFields({ ...fields, sms })} />}
                  {type === 'whatsapp' && (
                    <PhoneMessageForm value={fields.whatsapp} onChange={(whatsapp) => setFields({ ...fields, whatsapp })} />
                  )}
                  {type === 'zoom' && <ZoomForm value={fields.zoom} onChange={(zoom) => setFields({ ...fields, zoom })} />}
                  {type === 'wifi' && <WifiForm value={fields.wifi} onChange={(wifi) => setFields({ ...fields, wifi })} />}
                  {type === 'vcard' && (
                    <VCardForm value={fields.vcard} onChange={(vcard) => setFields({ ...fields, vcard })} />
                  )}
                  {type === 'event' && (
                    <EventForm value={fields.event} onChange={(event) => setFields({ ...fields, event })} />
                  )}

                  <View style={styles.formActions}>
                    <PillButton title={t('myCodes.cancel')} onPress={handleCancel} variant="ghost" />
                    <PillButton
                      title={t('myCodes.save')}
                      onPress={handleSave}
                      variant="citrus"
                      style={!content && styles.saveDisabled}
                    />
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
            ) : codes.length === 0 ? (
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
                      <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
                        <Ionicons name="close-circle" size={16} color={colors.text} style={styles.searchClear} />
                      </Pressable>
                    ) : null}
                  </View>

                  {typeOptions.length > 0 ? (
                    <FilterPillRow options={typeOptions} isSelected={(value) => activeTypes.has(value)} onPress={handleToggleType} />
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
                    contentContainerStyle={[styles.list, { paddingBottom: tabBarHeight + 20 }]}
                    renderItem={({ item }) => {
                      const itemType = codeTypeOf(item);
                      return (
                        <Pressable
                          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                          onPress={() => setViewing(item)}
                        >
                          <View style={styles.qrThumb}>
                            <QRCode value={item.content} size={40} color={colors.inkOnCream} backgroundColor={colors.cream} />
                          </View>
                          <Ionicons name={QR_TYPE_ICON[itemType]} size={16} color={colors.text} style={styles.rowIcon} />
                          <Text style={styles.rowLabel} numberOfLines={1}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    }}
                  />
                )}
              </>
            )}
          </>
        )}
      </FadeSwitcher>
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
    qrThumb: {
      width: 48,
      height: 48,
      borderRadius: 8,
      backgroundColor: colors.cream,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowIcon: {
      opacity: 0.6,
    },
    rowLabel: {
      flex: 1,
      fontFamily: fonts.displayBold,
      fontSize: 14.5,
      color: colors.text,
    },
    form: {
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
      backgroundColor: colors.panel,
      borderWidth: 1,
      borderColor: colors.panelLine,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 14,
    },
    formActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 12,
      marginTop: 4,
    },
    saveDisabled: {
      opacity: 0.4,
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
    viewerContent: {
      fontSize: 13,
      color: colors.text,
      opacity: 0.6,
      textAlign: 'center',
      maxWidth: 280,
    },
    viewerActions: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
    },
  });
}
