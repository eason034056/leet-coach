import webpush from 'web-push';

export function initWebPush() {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
}

export async function sendWebPush(subscription: { endpoint: string; keys: { p256dh: string; auth: string } }, payload: { title: string; body: string }) {
  initWebPush();
  await webpush.sendNotification(subscription as unknown as webpush.PushSubscription, JSON.stringify(payload));
}


