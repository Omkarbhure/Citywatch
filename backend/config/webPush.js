import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BDqGtZYyTQHGUW_QFdcTR3G9NfvhfJ4oBQRVS6Z46DKLhY1Q3DjtNnCzRnefVtPm76t0LGqJyuEp0Zv3q9dbNM0';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'C2RZHaVTPkUlsGIpzpzw0pmdZZohOqX49b-efOOlmv0';
const vapidEmail = process.env.VAPID_CONTACT_EMAIL || 'mailto:admin@citywatch.org';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
} else {
  console.warn('⚠️ Web Push VAPID keys not configured in environment variables');
}

export default webpush;
