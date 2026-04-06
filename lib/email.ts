export async function sendEmail(payload: {
  recipient: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-email-bridge-secret': process.env.NEXT_PUBLIC_EMAIL_BRIDGE_SECRET ?? '',
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
