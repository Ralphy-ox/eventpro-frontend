import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type EmailPayload = {
  recipient?: string;
  subject?: string;
  textBody?: string;
  htmlBody?: string;
};

const looksLikePlaceholder = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.startsWith("replace-with-") ||
    normalized.includes("your-gmail-app-password") ||
    normalized.includes("mailer-account@example.com") ||
    normalized.includes("your-mailer-email") ||
    normalized.includes("your-backend.onrender.com") ||
    normalized.includes("same-shared-secret-as")
  );
};

const buildHtmlDocument = (subject: string, htmlBody: string): string => {
  if (/<html[\s>]/i.test(htmlBody)) {
    return htmlBody;
  }

  const safeSubject = subject
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charSet="utf-8" />',
    '<meta name="viewport" content="width=device-width, initial-scale=1" />',
    `<title>${safeSubject}</title>`,
    "</head>",
    '<body style="margin:0;padding:24px;background:#f8fafc;">',
    htmlBody,
    "</body>",
    "</html>",
  ].join("");
};

const getRequiredEnv = (key: string, fallbackKeys: string[] = []): string => {
  const keys = [key, ...fallbackKeys];
  for (const candidate of keys) {
    const value = process.env[candidate]?.trim();
    if (value && !looksLikePlaceholder(value)) {
      return value;
    }
  }
  throw new Error(`Missing required environment variable: ${keys.join(" or ")}`);
};

const getOptionalEnv = (key: string): string => {
  const value = process.env[key]?.trim() || "";
  return looksLikePlaceholder(value) ? "" : value;
};

const buildTransport = () => {
  const user = getRequiredEnv("MAILER_GMAIL_USER", ["EMAIL_HOST_USER"]);
  const password = getRequiredEnv("MAILER_GMAIL_APP_PASSWORD", ["EMAIL_HOST_PASSWORD"]).replace(/\s+/g, "");

  return {
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass: password,
      },
    }),
    authenticatedUser: user,
  };
};

const buildFromAddress = (authenticatedUser: string): string => {
  const fromName = getOptionalEnv("MAILER_FROM_NAME");

  if (!fromName) {
    return authenticatedUser;
  }

  return `${fromName} <${authenticatedUser}>`;
};

const buildReplyTo = (authenticatedUser: string): string => {
  return getOptionalEnv("MAILER_FROM_EMAIL") || authenticatedUser;
};

const formatBridgeError = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return "Failed to send email.";
  }

  const message = error.message.trim();
  const lowered = message.toLowerCase();
  const errorWithCode = error as Error & { code?: string };

  if (message.startsWith("Missing required environment variable:")) {
    return message;
  }

  if (
    errorWithCode.code === "EAUTH" ||
    lowered.includes("invalid login") ||
    lowered.includes("username and password not accepted") ||
    lowered.includes('missing credentials for "plain"')
  ) {
    return "Gmail authentication failed. Check MAILER_GMAIL_USER or EMAIL_HOST_USER, and MAILER_GMAIL_APP_PASSWORD or EMAIL_HOST_PASSWORD.";
  }

  if (errorWithCode.code === "EENVELOPE" || lowered.includes("from")) {
    return "The sender address was rejected. Check MAILER_FROM_EMAIL and MAILER_FROM_NAME.";
  }

  if (lowered.includes("daily user sending quota exceeded")) {
    return "The Gmail sending limit was reached. Try again later or use a different mail account.";
  }

  return message || "Failed to send email.";
};

export async function POST(request: Request) {
  try {
    const expectedSecret = getRequiredEnv("EMAIL_BRIDGE_SECRET");
    const receivedSecret = request.headers.get("x-email-bridge-secret")?.trim();

    if (!receivedSecret || receivedSecret !== expectedSecret) {
      return NextResponse.json({ detail: "Unauthorized email bridge request." }, { status: 401 });
    }

    const body = (await request.json()) as EmailPayload;
    const recipient = body.recipient?.trim();
    const subject = body.subject?.trim();
    const textBody = body.textBody?.trim();
    const htmlBody = body.htmlBody?.trim();

    if (!recipient || !subject || !textBody || !htmlBody) {
      return NextResponse.json(
        { detail: "recipient, subject, textBody, and htmlBody are required." },
        { status: 400 },
      );
    }

    const { transporter, authenticatedUser } = buildTransport();
    const from = buildFromAddress(authenticatedUser);
    const replyTo = buildReplyTo(authenticatedUser);

    const result = await transporter.sendMail({
      from,
      to: recipient,
      subject,
      text: textBody,
      html: buildHtmlDocument(subject, htmlBody),
      replyTo,
      envelope: {
        from: authenticatedUser,
        to: recipient,
      },
      headers: {
        "X-Priority": "1",
        "X-Mailer": "EventPro Mailer",
      },
    });

    return NextResponse.json({ message: "Email sent.", message_id: result.messageId }, { status: 200 });
  } catch (error) {
    const message = formatBridgeError(error);
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
