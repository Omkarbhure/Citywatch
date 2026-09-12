import { z } from 'zod';

export const pushSubscriptionSchema = z.object({
  endpoint: z.string({ required_error: 'Push subscription endpoint is required' }).url(),
  keys: z.object({
    p256dh: z.string({ required_error: 'p256dh key is required' }).min(1),
    auth: z.string({ required_error: 'auth key is required' }).min(1)
  })
});

export const unsubscribeSchema = z.object({
  endpoint: z.string({ required_error: 'Endpoint is required' }).url()
});
