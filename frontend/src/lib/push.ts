import axios from 'axios';

const DEFAULT_VAPID_PUBLIC_KEY =
  (import.meta as any).env?.VITE_VAPID_PUBLIC_KEY ||
  'BDqGtZYyTQHGUW_QFdcTR3G9NfvhfJ4oBQRVS6Z46DKLhY1Q3DjtNnCzRnefVtPm76t0LGqJyuEp0Zv3q9dbNM0';

/**
 * Converts a base64url-encoded string to a Uint8Array for Web Push subscription.
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Feature detection for Service Worker and Push API support in current browser.
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Registers the root service worker (/sw.js).
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Retrieves the current push subscription if active.
 */
export async function getCurrentPushSubscription(
  reg?: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = reg || (await navigator.serviceWorker.ready);
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get current push subscription:', error);
    return null;
  }
}

/**
 * Requests browser permission, subscribes to PushManager with VAPID key, and saves to backend API.
 */
export async function subscribeToPush(
  reg?: ServiceWorkerRegistration,
  vapidKey?: string
): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    return null;
  }

  try {
    // Request permission from user
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Push notification permission was denied or dismissed by user');
      return null;
    }

    const registration = reg || (await registerServiceWorker());
    if (!registration) {
      throw new Error('Service worker registration not available');
    }

    const publicKey = vapidKey || DEFAULT_VAPID_PUBLIC_KEY;
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe with browser PushManager
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey
    });

    // Save subscription in CityWatch backend
    const subJSON = subscription.toJSON();
    await axios.post('/api/push/subscribe', {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subJSON.keys?.p256dh,
        auth: subJSON.keys?.auth
      }
    });

    return subscription;
  } catch (error) {
    console.error('Push subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribes from browser PushManager and removes subscription from backend API.
 */
export async function unsubscribeFromPush(
  reg?: ServiceWorkerRegistration
): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }

  try {
    const registration = reg || (await navigator.serviceWorker.ready);
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      // Prune from backend API
      try {
        await axios.post('/api/push/unsubscribe', { endpoint });
      } catch (apiErr) {
        console.warn('Backend push unsubscribe call error:', apiErr);
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe from push:', error);
    return false;
  }
}

export default {
  isPushSupported,
  registerServiceWorker,
  getCurrentPushSubscription,
  subscribeToPush,
  unsubscribeFromPush
};
