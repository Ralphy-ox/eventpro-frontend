/**
 * sendEmail — calls the Next.js /api/send-email route (Nodemailer).
 * Works from any client or server component.
 */
export async function sendEmail(payload: {
  type: 'verification' | 'password_reset' | 'booking_confirmation' | 'booking_status' | 'guest_invitation';
  to: string | string[];
  [key: string]: unknown;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
