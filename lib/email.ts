export async function sendEmail(payload: {
  recipient: string;
  subject: string;
  textBody: string;
  htmlBody: string;
}): Promise<boolean> {
  try {
    const bridgeSecret = process.env.EMAIL_BRIDGE_SECRET?.trim();
    if (!bridgeSecret) {
      return false;
    }

    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-email-bridge-secret': bridgeSecret,
      },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
