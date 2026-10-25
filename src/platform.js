// The only module that knows whether the game runs inside the Android/iOS app
// (Capacitor) or in a regular browser. Everything else calls these functions.

import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Share } from '@capacitor/share';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App } from '@capacitor/app';

export const isNative = Capacitor.isNativePlatform();

// ---------- Storage ----------
// Native: Preferences (survives WebView data clean-ups). Web: localStorage, which
// may be unavailable (private mode), so every call degrades to "no value".

export const storage = {
  async get(key, fallback = null) {
    try {
      if (isNative) {
        const { value } = await Preferences.get({ key });
        return value ?? fallback;
      }
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  },

  async set(key, value) {
    try {
      if (isNative) await Preferences.set({ key, value: String(value) });
      else localStorage.setItem(key, String(value));
    } catch { /* not persisted; the game keeps working */ }
  }
};

// ---------- Sharing ----------

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

const isCancel = err => {
  const msg = String((err && (err.message || err.name)) || '').toLowerCase();
  return msg.includes('cancel') || msg.includes('abort');
};

/** True when one tap can send image + text to WhatsApp (system share sheet). */
export function canShareImage() {
  if (isNative) return true;
  try {
    const probe = new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' });
    return !!(navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch {
    return false;
  }
}

/**
 * Opens the system share sheet with the challenge image and message.
 * @returns {Promise<'shared'|'cancelled'|'unsupported'>}
 */
export async function shareImage({ blob, fileName, text, dialogTitle }) {
  if (isNative) {
    try {
      const { uri } = await Filesystem.writeFile({
        path: fileName,
        data: await blobToBase64(blob),
        directory: Directory.Cache
      });
      await Share.share({ text, files: [uri], dialogTitle });
      return 'shared';
    } catch (err) {
      if (isCancel(err)) return 'cancelled';
      throw err;
    }
  }

  if (!canShareImage()) return 'unsupported';
  try {
    const file = new File([blob], fileName, { type: 'image/png' });
    await navigator.share({ files: [file], text });
    return 'shared';
  } catch (err) {
    if (isCancel(err)) return 'cancelled';
    throw err;
  }
}

// ---------- Haptics ----------

/** @param {'perfect'|'cut'|'fail'} kind */
export function haptic(kind) {
  if (!isNative) return;
  const call =
    kind === 'perfect' ? Haptics.impact({ style: ImpactStyle.Medium }) :
    kind === 'cut' ? Haptics.impact({ style: ImpactStyle.Light }) :
    Haptics.notification({ type: NotificationType.Error });
  call.catch(() => {});
}

// ---------- Android back button ----------

/** @param {() => boolean} handler return false to let the app close */
export function onBackButton(handler) {
  if (!isNative) return;
  App.addListener('backButton', () => {
    if (!handler()) App.exitApp();
  });
}
