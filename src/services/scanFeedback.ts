import { createAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { isBeepEnabled, isVibrateEnabled } from './scanFeedbackPreference';

const beepPlayer = createAudioPlayer(require('../../assets/sounds/scan-beep.wav'));

/**
 * Fires the moment a barcode/QR is successfully decoded — before any
 * network lookup — mirroring a physical barcode scanner's beep-on-read,
 * not a beep-on-result. Each toggle is independent and respected on its
 * own, per the Settings preferences.
 */
export async function playScanFeedback(): Promise<void> {
  const [vibrate, beep] = await Promise.all([isVibrateEnabled(), isBeepEnabled()]);

  if (vibrate) {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
  if (beep) {
    beepPlayer.seekTo(0);
    beepPlayer.play();
  }
}
