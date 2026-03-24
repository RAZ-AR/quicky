// ─── Expo Push Notifications ──────────────────────────────────────────────────
// Используем Expo Push API (бесплатно для небольших объёмов)

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
  badge?: number;
}

export async function sendPushNotification(message: PushMessage): Promise<void> {
  if (!message.to.startsWith('ExponentPushToken')) return; // не Expo токен

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({ ...message, sound: 'default' }),
    });
  } catch {
    // push не критичны — не падаем если Expo недоступен
  }
}

export async function sendPushToUser(
  prisma: { user: { findUnique: (args: { where: { id: string }; select: { pushToken: boolean } }) => Promise<{ pushToken: string | null } | null> } },
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { pushToken: true } });
  if (!user?.pushToken) return;
  await sendPushNotification({ to: user.pushToken, title, body, data });
}
