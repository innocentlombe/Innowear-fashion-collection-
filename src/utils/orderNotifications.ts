import { OrderNotification } from '../types';

export type BrowserNotificationPermission = NotificationPermission | 'unsupported';

export function getBrowserNotificationPermission(): BrowserNotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') return 'granted';
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

/**
 * Plays a gentle dual-tone boutique chime via Web Audio API when an order is placed.
 * Silently no-ops if audio is unavailable or blocked by browser autoplay policy.
 */
export function playOrderNotificationSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peakGain, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
    };

    // Soft gold-chime fifth interval (E5 -> B5)
    playTone(659.25, now, 0.22, 0.09);
    playTone(987.77, now + 0.12, 0.34, 0.08);

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch {
    // Audio playback unavailable
  }
}

/**
 * Dispatches a native OS / Browser notification (via PWA Service Worker if active,
 * falling back to standard Notification API) when permission is granted.
 */
export async function sendBrowserOrderNotification(
  notification: OrderNotification,
  storeName: string,
  currencySymbol: string
): Promise<boolean> {
  if (getBrowserNotificationPermission() !== 'granted') return false;

  const title =
    notification.channel === 'WhatsApp'
      ? `New WhatsApp Order · ${notification.orderNumber}`
      : notification.channel === 'Online'
      ? `New Online Order · ${notification.orderNumber}`
      : `New POS Sale · ${notification.orderNumber}`;

  const body = `${notification.customerName} · ${notification.itemCount} item(s) · ${currencySymbol}${notification.total.toFixed(
    2
  )} (${notification.paymentMethod}) — ${storeName}`;

  const options: NotificationOptions = {
    body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: `innowear-order-${notification.orderNumber}`,
  };

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, options);
        return true;
      }
    }
    new Notification(title, options);
    return true;
  } catch {
    return false;
  }
}
