// Outbound email, which the app needs for exactly one thing: the password reset
// link. Spoken to Resend's HTTP API directly rather than through their SDK —
// it's a single POST with a bearer token, and the repo already takes this
// position with Google's OAuth endpoints. A dependency for one request would be
// the odd one out here.
//
// Every failure path is a `false` return, never a throw. A mail outage must not
// be the reason a form 500s, and the caller can't do anything useful with the
// error anyway: the message it shows is deliberately the same whether or not an
// email went out (see requestPasswordReset).
import { appUrl } from "./app-url";

const ENDPOINT = "https://api.resend.com/emails";

export type MailConfig = { apiKey: string; from: string };

// Null when the app hasn't been given mail credentials. Every caller treats
// that as "email is switched off" rather than an error, exactly like
// googleConfig() — the app still runs, and /forgot says so plainly instead of
// pretending to send something.
export function mailConfig(): MailConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

export type Mail = {
  to: string;
  subject: string;
  // Both bodies, always. A text/plain alternative is what stops a link-only
  // message scoring as spam, and it's what a screen reader or a terminal mail
  // client actually renders.
  text: string;
  html: string;
};

export async function sendMail(mail: Mail): Promise<boolean> {
  const config = mailConfig();
  if (!config) return false;

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: [mail.to],
        subject: mail.subject,
        text: mail.text,
        html: mail.html,
      }),
    });
    if (!res.ok) {
      // The body carries Resend's reason — an unverified sending domain is the
      // overwhelmingly common one, and it is invisible without this line.
      console.error("Mail send failed", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("Mail send failed", err);
    return false;
  }
}

// The reset email itself. Kept here beside the transport so the copy and the
// thing that sends it stay in one place.
export function resetEmail(origin: string, name: string, token: string): Mail {
  const link = `${appUrl(origin)}/reset/${token}`;
  return {
    to: "", // filled in by the caller, which is the only holder of the address
    subject: "Reset your Chalkline password",
    text: [
      `Hi ${name},`,
      "",
      "Someone asked to reset the password on your Chalkline account. Open this link to choose a new one:",
      "",
      link,
      "",
      "The link works once and expires in an hour.",
      "",
      "If this wasn't you, you can ignore this email — nothing has changed, and your current password still works.",
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Someone asked to reset the password on your Chalkline account. Open this link to choose a new one:</p>
<p><a href="${escapeHtml(link)}">Choose a new password</a></p>
<p>The link works once and expires in an hour.</p>
<p>If this wasn't you, you can ignore this email — nothing has changed, and your current password still works.</p>`,
  };
}

// Sent instead of a link when the account has no password to reset. Naming the
// provider is safe: the address already reached us through a form that reveals
// nothing, and the alternative is someone waiting forever for a link that would
// be useless to them.
export function googleOnlyEmail(name: string): Mail {
  return {
    to: "",
    subject: "Signing in to Chalkline",
    text: [
      `Hi ${name},`,
      "",
      "Someone asked to reset the password on your Chalkline account — but that account signs in with Google, so there's no password to reset.",
      "",
      'Use the "Sign in with Google" button on the sign-in page.',
      "",
      "If this wasn't you, you can ignore this email.",
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Someone asked to reset the password on your Chalkline account — but that account signs in with Google, so there's no password to reset.</p>
<p>Use the &ldquo;Sign in with Google&rdquo; button on the sign-in page.</p>
<p>If this wasn't you, you can ignore this email.</p>`,
  };
}

// The name comes from a database column the account holder chose, so it is
// exactly the kind of value that shouldn't be dropped into markup unescaped.
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
