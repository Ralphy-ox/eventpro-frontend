import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ── HTML wrapper ─────────────────────────────────────────────────────────────
function wrapHtml(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a1628;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:40px 20px;">
  <tr><td align="center">
    <table width="100%" style="max-width:560px;background:#0d1f35;border-radius:16px;border:1px solid rgba(14,165,233,0.2);overflow:hidden;">
      <tr><td style="background:linear-gradient(135deg,#0ea5e9,#0369a1);padding:24px 32px;">
        <span style="display:inline-block;width:34px;height:34px;background:rgba(255,255,255,0.2);border-radius:8px;text-align:center;line-height:34px;font-weight:900;color:#fff;font-size:17px;margin-right:10px;vertical-align:middle;">E</span>
        <span style="color:#fff;font-size:20px;font-weight:900;vertical-align:middle;">EventPro</span>
      </td></tr>
      <tr><td style="padding:32px;">${body}</td></tr>
      <tr><td style="padding:16px 32px;border-top:1px solid rgba(14,165,233,0.1);text-align:center;">
        <p style="color:#475569;font-size:12px;margin:0;">© EventPro · Ralphy's Venue, Cebu City</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function codeBox(code: string, label = 'Your Verification Code', validity = '15 minutes') {
  return `<div style="background:rgba(14,165,233,0.1);border:1px solid rgba(14,165,233,0.3);border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
    <p style="color:#94a3b8;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;">${label}</p>
    <span style="color:#0ea5e9;font-size:42px;font-weight:900;letter-spacing:14px;">${code}</span>
    <p style="color:#64748b;font-size:12px;margin:8px 0 0;">Valid for ${validity}</p>
  </div>`;
}

function detailTable(rows: { label: string; value: string }[]) {
  const inner = rows.map(r => `
    <tr>
      <td style="padding:7px 0;color:#64748b;font-size:13px;width:120px;">${r.label}</td>
      <td style="padding:7px 0;color:#e2e8f0;font-size:13px;font-weight:600;">${r.value}</td>
    </tr>`).join('');
  return `<table width="100%" style="background:rgba(255,255,255,0.04);border-radius:10px;padding:16px;margin:16px 0;">${inner}</table>`;
}

function badge(text: string, color = '#0ea5e9') {
  return `<span style="display:inline-block;background:${color}22;color:${color};border:1px solid ${color}44;border-radius:6px;padding:3px 10px;font-size:12px;font-weight:700;">${text}</span>`;
}

function h1(text: string) {
  return `<h1 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 8px;">${text}</h1>`;
}

function p(text: string, color = '#94a3b8') {
  return `<p style="color:${color};font-size:14px;line-height:1.6;margin:0 0 16px;">${text}</p>`;
}

// ── Email builders ────────────────────────────────────────────────────────────
function buildVerificationEmail(firstName: string, code: string) {
  return wrapHtml(
    h1('Verify Your Email Address') +
    p(`Hi <strong style="color:#e2e8f0;">${firstName}</strong>, thanks for signing up! Enter the code below to activate your account.`) +
    codeBox(code) +
    p("If you didn't create an account, you can safely ignore this email.", '#64748b')
  );
}

function buildPasswordResetEmail(firstName: string, code: string) {
  return wrapHtml(
    h1('Password Reset Request') +
    p(`Hi <strong style="color:#e2e8f0;">${firstName}</strong>, we received a request to reset your password.`) +
    codeBox(code, 'Your Reset Code', '10 minutes') +
    p("If you didn't request this, you can safely ignore this email.", '#64748b')
  );
}

function buildBookingConfirmationEmail(data: {
  firstName: string; eventType: string; date: string;
  time: string; capacity: string; location: string;
  amount: string; paymentMethod: string;
}) {
  return wrapHtml(
    h1('Booking Request Received! 🎉') +
    p(`Hi <strong style="color:#e2e8f0;">${data.firstName}</strong>, we received your booking request.`) +
    detailTable([
      { label: 'Event', value: data.eventType },
      { label: 'Date', value: data.date },
      { label: 'Time', value: data.time },
      { label: 'Guests', value: data.capacity },
      { label: 'Venue', value: data.location },
      { label: 'Amount', value: `₱${data.amount}` },
      { label: 'Payment', value: data.paymentMethod },
      { label: 'Status', value: badge('Pending Review', '#f59e0b') },
    ]) +
    p("Your booking is <strong>pending organizer review</strong>. You'll receive another email once it's confirmed.")
  );
}

function buildBookingStatusEmail(data: {
  firstName: string; eventType: string; date: string;
  location: string; capacity: string; status: string; declineReason?: string;
}) {
  if (data.status === 'confirmed') {
    return wrapHtml(
      h1('Your Booking is Confirmed! ✅') +
      p(`Great news, <strong style="color:#e2e8f0;">${data.firstName}</strong>! Your event has been confirmed.`) +
      detailTable([
        { label: 'Event', value: data.eventType },
        { label: 'Date', value: data.date },
        { label: 'Venue', value: data.location },
        { label: 'Guests', value: data.capacity },
        { label: 'Status', value: badge('Confirmed ✓', '#22c55e') },
      ]) +
      p('We look forward to making your event special!')
    );
  }
  return wrapHtml(
    h1('Booking Update') +
    p(`Hi <strong style="color:#e2e8f0;">${data.firstName}</strong>, unfortunately your booking could not be confirmed.`) +
    detailTable([
      { label: 'Event', value: data.eventType },
      { label: 'Date', value: data.date },
      { label: 'Reason', value: data.declineReason || 'N/A' },
      { label: 'Status', value: badge('Declined', '#ef4444') },
    ]) +
    p('Please contact us or try booking a different date.')
  );
}

function buildGuestInvitationEmail(data: {
  hostName: string; eventType: string; date: string;
  time: string; location: string; confirmed: boolean;
}) {
  if (data.confirmed) {
    return wrapHtml(
      h1("You're Invited! 🎉") +
      p(`<strong style="color:#e2e8f0;">${data.hostName}</strong> has invited you to their <strong style="color:#0ea5e9;">${data.eventType}</strong> — and it's been confirmed!`) +
      detailTable([
        { label: 'Event', value: data.eventType },
        { label: 'Host', value: data.hostName },
        { label: 'Date', value: data.date },
        { label: 'Time', value: data.time },
        { label: 'Venue', value: data.location },
      ]) +
      p('We look forward to seeing you there!')
    );
  }
  return wrapHtml(
    h1("You've Been Invited! ✉️") +
    p(`<strong style="color:#e2e8f0;">${data.hostName}</strong> has invited you to their upcoming <strong style="color:#0ea5e9;">${data.eventType}</strong> event.`) +
    detailTable([
      { label: 'Event', value: data.eventType },
      { label: 'Host', value: data.hostName },
      { label: 'Date', value: data.date },
      { label: 'Time', value: data.time },
      { label: 'Venue', value: data.location },
    ]) +
    p('Note: This booking is still <strong>pending organizer confirmation</strong>. You\'ll receive another email once confirmed.')
  );
}

// ── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, to, ...data } = body;

    if (!type || !to) {
      return NextResponse.json({ error: 'Missing type or to' }, { status: 400 });
    }

    let subject = '';
    let html = '';
    let text = '';

    switch (type) {
      case 'verification':
        subject = 'Your EventPro Verification Code';
        html = buildVerificationEmail(data.firstName, data.code);
        text = `Hi ${data.firstName},\n\nYour verification code is: ${data.code}\n\nValid for 15 minutes.\n\n— EventPro Team`;
        break;

      case 'password_reset':
        subject = 'Your EventPro Password Reset Code';
        html = buildPasswordResetEmail(data.firstName, data.code);
        text = `Hi ${data.firstName},\n\nYour password reset code is: ${data.code}\n\n— EventPro Team`;
        break;

      case 'booking_confirmation':
        subject = 'Your EventPro Booking Request Received';
        html = buildBookingConfirmationEmail(data);
        text = `Hi ${data.firstName},\n\nBooking received for ${data.eventType} on ${data.date}.\nAmount: ₱${data.amount}\n\n— EventPro Team`;
        break;

      case 'booking_status':
        subject = data.status === 'confirmed'
          ? 'Your EventPro Booking is Confirmed!'
          : 'Update on Your EventPro Booking';
        html = buildBookingStatusEmail(data);
        text = `Hi ${data.firstName},\n\nYour ${data.eventType} booking on ${data.date} has been ${data.status}.\n\n— EventPro Team`;
        break;

      case 'guest_invitation':
        subject = data.confirmed
          ? `You're Invited! ${data.eventType} on ${data.date} — Confirmed!`
          : `You've Been Invited to ${data.hostName}'s ${data.eventType}!`;
        html = buildGuestInvitationEmail(data);
        text = `Hi,\n\n${data.hostName} invited you to their ${data.eventType} on ${data.date} at ${data.location}.\n\n— EventPro Team`;
        break;

      default:
        return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 });
    }

    const recipients = Array.isArray(to) ? to : [to];

    await Promise.all(
      recipients.map(recipient =>
        transporter.sendMail({
          from: `EventPro <${process.env.EMAIL_USER}>`,
          to: recipient,
          subject,
          html,
          text,
        })
      )
    );

    return NextResponse.json({ success: true, sent: recipients.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[send-email]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
