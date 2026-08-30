# Privacy Policy — Blippo

_Last updated: August 30, 2026_

This policy describes how the Blippo barcode and QR scanner app ("Blippo", "the app", "we") handles information. Blippo has no account system and no login — almost everything you do in the app stays on your device.

## What stays on your device only

The app stores the following locally, using standard on-device storage (AsyncStorage). None of it is uploaded to us — we don't operate a server that receives it:

- **Scan history** — barcodes and QR codes you've scanned, and whatever product info came back for them (capped at the most recent 100 entries), including any folders you've organized them into.
- **My Codes** — any QR codes you create yourself in the app (links, text, email, phone, SMS, WhatsApp, Zoom, Wi-Fi, contact cards, calendar events, and more).
- **App Lock preference** — whether you've turned on Face ID/Touch ID/passcode locking, and your device's authentication choice. Unlocking is handled entirely by your device's own operating system — Blippo never receives or stores your biometric data.
- **Language, theme, and other preferences** — if you override the app's automatic detection in Settings.

Uninstalling the app or clearing its storage deletes all of this, since there is no copy anywhere else.

## What we send to third parties, and why

- **Open Food Facts** — when you scan a barcode, the app sends that barcode number (and your app language, to get results in that language) to [Open Food Facts](https://world.openfoodfacts.org) and its sibling projects (Open Beauty Facts, Open Products Facts, Open Pet Food Facts), open third-party product databases. See Open Food Facts's own privacy policy on their website for how they handle that request.
- **Yahoo Shopping** — when a Yahoo Shopping application ID is configured, the same barcode is also sent to [Yahoo! JAPAN's shopping search API](https://developer.yahoo.co.jp/webapi/shopping/) so a Japanese listing (name, photo, price) can fill in when the open databases have little or nothing. See Yahoo's own developer terms for how they handle that request.
- **Taobao** — only if a lookup proxy URL is configured in the build. In that case the barcode is sent to that proxy so it can query Taobao's barcode API on our behalf. The app never stores Taobao credentials. If that URL is not configured, nothing is sent to Taobao.
- **QR codes** — decoding a QR code happens entirely on your device. Nothing about a scanned QR code (its content, or the fact that you scanned it) is sent anywhere by us.
- **Analytics (PostHog)** — we use [PostHog](https://posthog.com) to understand how the app is used, so we know what to improve. Events we send are things like "a scan completed", "a setting was changed", or "a QR action was taken" — along with generic metadata such as the scan method, the code's type (link, email, Wi-Fi, etc.), or the setting's new value. We never send the actual barcode number, the decoded QR content, product names, or anything else you scanned or typed. Analytics data is tied to an anonymous device identifier, not to your name or any account, since the app doesn't have one.

## Camera and photo access

- **Camera** — used only to scan barcodes and QR codes in real time. No photo or video is captured, stored, or transmitted by the app.
- **Photo library (optional)** — if you choose "upload photo" to scan a barcode from an existing picture, that picture is read locally on your device to decode the barcode. The picture itself is never uploaded or stored by us.

## Advertising

Blippo shows banner and interstitial ads through Google AdMob. Where required by law (for example, the EEA, UK, and certain US states), the app shows a consent form before loading any ads, using Google's User Messaging Platform. Your choice there determines whether ads are personalized:

- If you consent to personalized ads, Google and its advertising partners may use device identifiers (such as your advertising ID, or IDFA on iOS) to show ads relevant to you, per their own privacy policies.
- If you decline, or in regions where consent isn't required, ads may still show but without that personalization.
- On iOS, a separate system prompt (App Tracking Transparency) also asks your permission before any cross-app tracking identifier can be shared with ad partners.
- You can revisit your consent choice anytime from **Settings → Privacy choices** (shown only where applicable to your region).

We don't control what Google or its ad partners do with data collected through the ad SDK beyond what's described in [Google's Ads Privacy & Terms](https://policies.google.com/technologies/ads) and the [AdMob Data Safety documentation](https://support.google.com/admob/answer/9760862).

## Children's privacy

Blippo isn't directed at children and we don't knowingly collect information from children under the age required by applicable law (e.g., 13 in the US, 16 in the EEA unless a member state sets it lower).

## Your choices

- Clear or reset the app's local data at any time via your device's app settings, or by uninstalling the app.
- Change your ad consent choice via **Settings → Privacy choices** where that option appears.
- Turn App Lock on or off, and change your language or theme, via **Settings**.

## Changes to this policy

If how the app handles data changes, this document will be updated and the "last updated" date above will change accordingly.

## Contact

[Insert a contact email or support link here before publishing.]
