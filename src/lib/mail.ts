// Outbound email: password reset links, and the message each new account gets
// telling it how to sign in. Spoken to Resend's HTTP API directly rather than
// through their SDK —
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

// Sent when a trainer creates a client's account. The only email here that
// carries a password: the account was made *for* someone who never chose one and
// has no other way in. It's the same plaintext the trainer sees on screen — the
// app has always handed it over to be relayed, and this relays it directly
// instead of depending on the coach to retype it into a text message.
export function newClientEmail(
  origin: string,
  name: string,
  email: string,
  password: string,
): Mail {
  const link = `${appUrl(origin)}/login`;
  return {
    to: "",
    subject: "Your Chalkline account",
    text: [
      `Hi ${name},`,
      "",
      "Your coach set up a Chalkline account for you — it's where you'll find the training they've programmed, and where you log it once it's done.",
      "",
      `Sign in at: ${link}`,
      `Email:      ${email}`,
      `Password:   ${password}`,
      "",
      'Once you\'re in, you can pick a password of your own with the "Forgot password" link on the sign-in page.',
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Your coach set up a Chalkline account for you — it&rsquo;s where you&rsquo;ll find the training they&rsquo;ve programmed, and where you log it once it&rsquo;s done.</p>
<p><a href="${escapeHtml(link)}">Sign in to Chalkline</a></p>
<p>Email: <strong>${escapeHtml(email)}</strong><br>
Password: <strong>${escapeHtml(password)}</strong></p>
<p>Once you&rsquo;re in, you can pick a password of your own with the &ldquo;Forgot password&rdquo; link on the sign-in page.</p>`,
  };
}

// Sent when someone registers themselves. No password in it, deliberately: they
// chose it seconds ago, so echoing it back tells them nothing and leaves a
// credential sitting in an inbox for the life of the account. What is worth
// confirming is *which* address the account answers to.
export function welcomeEmail(origin: string, name: string, email: string): Mail {
  const link = `${appUrl(origin)}/login`;
  return {
    to: "",
    subject: "Welcome to Chalkline",
    text: [
      `Hi ${name},`,
      "",
      "Your Chalkline account is ready. From here you can build sessions, add your clients, and see their training land back with you as they complete it.",
      "",
      `Sign in at: ${link}`,
      `Email:      ${email}`,
      "",
      "You signed in with the password you chose when you registered. If it ever slips your mind, the sign-in page has a \"Forgot password\" link.",
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Your Chalkline account is ready. From here you can build sessions, add your clients, and see their training land back with you as they complete it.</p>
<p><a href="${escapeHtml(link)}">Sign in to Chalkline</a></p>
<p>Email: <strong>${escapeHtml(email)}</strong></p>
<p>You signed in with the password you chose when you registered. If it ever slips your mind, the sign-in page has a &ldquo;Forgot password&rdquo; link.</p>`,
  };
}

// Sent when a first Google sign-in creates the account. Says plainly that there
// is no password, so nobody goes looking for one they were never sent — the same
// job googleOnlyEmail does for someone who reaches /forgot the long way round.
export function googleWelcomeEmail(
  origin: string,
  name: string,
  email: string,
): Mail {
  const link = `${appUrl(origin)}/login`;
  return {
    to: "",
    subject: "Welcome to Chalkline",
    text: [
      `Hi ${name},`,
      "",
      `Your Chalkline account is ready, and it signs in with your Google account (${email}).`,
      "",
      `Sign in at: ${link}`,
      "",
      'There\'s no password to remember — use the "Continue with Google" button.',
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Your Chalkline account is ready, and it signs in with your Google account (<strong>${escapeHtml(email)}</strong>).</p>
<p><a href="${escapeHtml(link)}">Sign in to Chalkline</a></p>
<p>There&rsquo;s no password to remember — use the &ldquo;Continue with Google&rdquo; button.</p>`,
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
