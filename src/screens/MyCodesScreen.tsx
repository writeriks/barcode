import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight, type BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BottomBannerAd } from '../components/BottomBannerAd';
import { BottomSheet } from '../components/BottomSheet';
import { FadeSwitcher } from '../components/FadeSwitcher';
import { FilterPillRow, type PillOption } from '../components/FilterPillRow';
import { PillButton } from '../components/PillButton';
import { QrTypePicker } from '../components/QrTypePicker';
import { EmailForm, defaultEmailFields, type EmailFields } from '../components/qrForms/EmailForm';
import { EventForm, defaultEventFields, type EventFields } from '../components/qrForms/EventForm';
import { LinkForm, defaultLinkFields, type LinkFields } from '../components/qrForms/LinkForm';
import { PhoneForm, defaultPhoneFields, type PhoneFields } from '../components/qrForms/PhoneForm';
import { PhoneMessageForm, defaultPhoneMessageFields, type PhoneMessageFields } from '../components/qrForms/PhoneMessageForm';
import { SocialProfileForm, defaultSocialFields, type SocialFields } from '../components/qrForms/SocialProfileForm';
import { TextForm, defaultTextFields, type TextFields } from '../components/qrForms/TextForm';
import { VCardForm, defaultVCardFields, type VCardFields } from '../components/qrForms/VCardForm';
import { WifiForm, defaultWifiFields, type WifiFields } from '../components/qrForms/WifiForm';
import { ZoomForm, defaultZoomFields, type ZoomFields } from '../components/qrForms/ZoomForm';
import type { RootTabParamList } from '../navigation/types';
import { captureAnalyticsEvent } from '../services/analytics';
import { deleteMyCode, getMyCodes, saveMyCode, updateMyCode } from '../services/myCodes';
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
  buildSocialProfileContent,
  buildTextContent,
  buildVCardContent,
  buildWhatsAppContent,
  buildWifiContent,
  buildZoomContent,
} from '../utils/qrContentBuilders';
import {
  parseEmailFields,
  parseEventFields,
  parseLinkFields,
  parsePhoneFields,
  parseSmsFields,
  parseSocialProfileFields,
  parseTextFields,
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
  event: EventFields;
  facebook: SocialFields;
  instagram: SocialFields;
  twitter: SocialFields;
  spotify: SocialFields;
  viber: SocialFields;
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
    facebook: defaultSocialFields,
    instagram: defaultSocialFields,
    twitter: defaultSocialFields,
    spotify: defaultSocialFields,
    viber: defaultSocialFields,
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
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'spotify':
    case 'viber':
      return buildSocialProfileContent(QR_SOCIAL_BASE_URL[type], fields[type].value);
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
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'spotify':
    case 'viber':
      return fields[type].value || content;
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
    case 'facebook':
    case 'instagram':
    case 'twitter':
    case 'spotify':
    case 'viber':
      fields[type] = parseSocialProfileFields(code.content);
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<MyCode | null>(null);
  const [menuCode, setMenuCode] = useState<MyCode | null>(null);
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

  // Re-tapping the already-active My Codes tab while viewing a code's
  // detail should pop back to the list, not do nothing.
  useEffect(() => {
    return navigation.addListener('tabPress', () => {
      if (navigation.isFocused() && viewing) {
        setViewing(null);
      }
    });
  }, [navigation, viewing]);

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
    setEditingId(null);
    resetForm();
    reload();
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    resetForm();
  };

  const handleEdit = (code: MyCode) => {
    const { type: parsedType, fields: parsedFields } = fieldsFromCode(code, defaultCountry);
    setEditingId(code.id);
    setType(parsedType);
    setLabel(code.label);
    setFields(parsedFields);
    setViewing(null);
    setIsCreating(true);
  };

  const handleShare = (code: MyCode) => {
    captureAnalyticsEvent('my_code_shared', { type: codeTypeOf(code) });
    Share.share({ message: code.content });
  };

  const handleCopyContent = async (code: MyCode) => {
    await Clipboard.setStringAsync(code.content);
    Alert.alert(t('qr.copied'));
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
            </View>
            <View style={styles.viewerActions}>
              <PillButton
                title={t('myCodes.delete')}
                onPress={() => handleDelete(viewing.id)}
                variant="ghost"
                style={styles.flexButton}
              />
              <PillButton
                title={t('settings.close')}
                onPress={() => setViewing(null)}
                variant="punch"
                style={styles.flexButton}
              />
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

                  <View style={styles.formActions}>
                    <PillButton title={t('myCodes.cancel')} onPress={handleCancel} variant="ghost" />
                    <PillButton
                      title={t(editingId ? 'myCodes.update' : 'myCodes.save')}
                      onPress={handleSave}
                      variant="citrus"
                      style={!content && styles.saveDisabled}
                    />
                  </View>
                </ScrollView>
              </KeyboardAvoidingView>
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
                          <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
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
                              <Pressable onPress={() => setMenuCode(item)} hitSlop={10} style={styles.rowMenuButton}>
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

      <BottomSheet visible={menuCode !== null} onClose={() => setMenuCode(null)} title={t('myCodes.codeOptionsTitle')}>
        <View style={styles.sheetList}>
          <Pressable
            onPress={() => {
              if (menuCode) handleEdit(menuCode);
              setMenuCode(null);
            }}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="create-outline" size={18} color={colors.mint} />
            <Text style={styles.menuRowText}>{t('myCodes.edit')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (menuCode) handleShare(menuCode);
              setMenuCode(null);
            }}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="share-outline" size={18} color={colors.citrusText} />
            <Text style={styles.menuRowText}>{t('myCodes.share')}</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (menuCode) handleDelete(menuCode.id);
              setMenuCode(null);
            }}
            style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}
          >
            <Ionicons name="trash-outline" size={18} color={colors.coralText} />
            <Text style={[styles.menuRowText, styles.menuRowTextDestructive]}>{t('myCodes.delete')}</Text>
          </Pressable>
        </View>
      </BottomSheet>
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
