import { env } from "@/lib/env";

/**
 * Email integration point. No provider is wired up yet — in development the
 * message is logged to the server console so the reset flow is testable. Swap
 * the body of `sendMail` for an SES / Resend / SMTP call in production.
 */
interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  if (!env.isProd) {
    console.info(
      `[mailer] To: ${message.to}\n  Subject: ${message.subject}\n  ${message.text}`,
    );
    return;
  }
  // TODO: integrate a real provider (AWS SES, Resend, SMTP, …).
  console.warn("[mailer] No email provider configured; message not sent.");
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string,
): Promise<void> {
  await sendMail({
    to,
    subject: "Reset your password",
    text: `Reset your password using this link (valid for ${env.passwordResetExpiresMinutes} minutes): ${resetUrl}`,
  });
}
