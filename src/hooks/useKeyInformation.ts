import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
// Type-only, so this never pulls the native module in at module scope —
// see the note in modules/expo-document-scanner/index.ts.
import type { KeyInformation } from 'expo-document-scanner';
import { isExpoGo } from '../services/ads/environment';

/**
 * The phone numbers, links, email addresses, dates and addresses in a
 * page's recognized text, or an empty list where the detector isn't
 * available (Android, Expo Go) — in which case the text tab simply shows
 * no chips, rather than an error about a missing module.
 */
export function useKeyInformation(text: string): KeyInformation[] {
  const [found, setFound] = useState<KeyInformation[]>([]);

  useEffect(() => {
    if (!text.trim() || Platform.OS !== 'ios' || isExpoGo()) {
      setFound([]);
      return;
    }
    // Detection runs on a background queue natively, so a slow page can
    // still resolve after the user has swiped to another one.
    let cancelled = false;
    (async () => {
      try {
        const { detectKeyInformationAsync } = await import('expo-document-scanner');
        const result = await detectKeyInformationAsync(text);
        if (!cancelled) setFound(result);
      } catch {
        if (!cancelled) setFound([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  return found;
}
