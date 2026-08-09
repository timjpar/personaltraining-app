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
  // Where a reply should go, when that isn't the from address. Only the
  // conversation emails set it, and it's what makes them usable rather than
  // decorative: an athlete's instinct on reading a message from their coach is
  // to hit reply, and without this that reaches a no-reply mailbox nobody
  // watches. Account mail deliberately leaves it unset — there is no person on
  // the other end of a password reset.
  replyTo?: string;
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
        // Omitted entirely when unset rather than sent as null — Resend
        // rejects a null reply_to, and most mail here has no reply address.
        ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
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

// Sent the moment a session lands, to a trainer who opted in to that instead of
// waiting for the digest. The workout still appears in that evening's digest —
// the digest is the day's record, not a queue of unsent items, and deduping it
// would make the same day read differently depending on a setting.
export function workoutCompletedEmail(
  origin: string,
  trainerName: string,
  clientName: string,
  workout: { id: string; title: string; rpe: number | null; clientComment: string | null },
): Mail {
  const link = `${appUrl(origin)}/workouts/${workout.id}`;
  const effort = workout.rpe != null ? `RPE ${workout.rpe}/10` : "not rated";
  return {
    to: "",
    subject: `${clientName} finished ${workout.title}`,
    text: [
      `Hi ${trainerName},`,
      "",
      `${clientName} just logged ${workout.title}. Effort: ${effort}.`,
      ...(workout.clientComment ? ["", `They said: ${workout.clientComment}`] : []),
      "",
      `See the session: ${link}`,
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(trainerName)},</p>
<p><strong>${escapeHtml(clientName)}</strong> just logged ${escapeHtml(workout.title)}. Effort: ${escapeHtml(effort)}.</p>
${
  workout.clientComment
    ? `<p style="border-left:2px solid #ddd;padding-left:12px">${escapeHtml(workout.clientComment)}</p>`
    : ""
}
<p><a href="${escapeHtml(link)}">See the session</a></p>`,
  };
}

// The same idea for a food log, and the same deliberate overlap with the digest:
// the day still appears in that evening's summary.
//
// Where it differs from workoutCompletedEmail is that this one repeats. A log is
// a day that gets edited, so the second and fifth email are about the same date
// as the first — hence "updated" in the subject rather than "logged", and hence
// the totals in the body, which are the only part that actually changed. Every
// interpolated value here is athlete-typed or model-returned: all escaped.
export function nutritionLoggedEmail(
  origin: string,
  trainerName: string,
  clientName: string,
  log: {
    clientId: string;
    date: string; // yyyy-mm-dd, for the link
    day: string; // already formatted, for reading
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    targetCalories: number | null;
    notes: string | null;
  },
): Mail {
  const link = `${appUrl(origin)}/clients/${log.clientId}/nutrition/${log.date}`;
  const kcal =
    log.targetCalories != null
      ? `${log.calories} / ${log.targetCalories} kcal`
      : `${log.calories} kcal`;
  const macros = `P ${log.protein} C ${log.carbs} F ${log.fat}`;
  return {
    to: "",
    subject: `${clientName} updated their food log`,
    text: [
      `Hi ${trainerName},`,
      "",
      `${clientName} updated ${log.day}: ${kcal}, ${macros}.`,
      ...(log.notes ? ["", `They said: ${log.notes}`] : []),
      "",
      `See the day: ${link}`,
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(trainerName)},</p>
<p><strong>${escapeHtml(clientName)}</strong> updated ${escapeHtml(log.day)}: ${escapeHtml(kcal)}, ${escapeHtml(macros)}.</p>
${
  log.notes
    ? `<p style="border-left:2px solid #ddd;padding-left:12px">${escapeHtml(log.notes)}</p>`
    : ""
}
<p><a href="${escapeHtml(link)}">See the day</a></p>`,
  };
}

// The day's activity in one message, at the hour the trainer chose.
//
// Note how much more of this is attacker-influenced text than the account
// emails above: client names, workout titles, RPE comments, log notes, and food
// names typed by an athlete or returned by a language model. Every one of them
// goes through escapeHtml, without exception.
export type DigestWorkout = {
  id: string;
  title: string;
  clientName: string;
  rpe: number | null;
  clientComment: string | null;
};

export type DigestLog = {
  clientId: string;
  clientName: string;
  day: string; // the date it's *for*, already formatted
  date: string; // yyyy-mm-dd, for the link
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  targetCalories: number | null;
  notes: string | null;
};

export function digestEmail(
  origin: string,
  trainerName: string,
  data: { workouts: DigestWorkout[]; logs: DigestLog[] },
): Mail {
  const base = appUrl(origin);
  const counts = [
    data.workouts.length
      ? `${data.workouts.length} session${data.workouts.length === 1 ? "" : "s"}`
      : null,
    data.logs.length
      ? `${data.logs.length} food log${data.logs.length === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  const workoutLine = (w: DigestWorkout) =>
    `${w.clientName} — ${w.title}${w.rpe != null ? ` (RPE ${w.rpe})` : ""}${
      w.clientComment ? `: ${w.clientComment}` : ""
    }`;

  const logLine = (l: DigestLog) =>
    `${l.clientName} — ${l.day}: ${l.calories}${
      l.targetCalories != null ? ` / ${l.targetCalories}` : ""
    } kcal, P ${l.protein} C ${l.carbs} F ${l.fat}${l.notes ? `: ${l.notes}` : ""}`;

  return {
    to: "",
    subject: `Chalkline: ${counts.join(" and ")}`,
    text: [
      `Hi ${trainerName},`,
      "",
      "Here's what your athletes did today.",
      ...(data.workouts.length
        ? ["", "Sessions", ...data.workouts.map((w) => `  ${workoutLine(w)}`)]
        : []),
      ...(data.logs.length
        ? ["", "Nutrition", ...data.logs.map((l) => `  ${logLine(l)}`)]
        : []),
      "",
      // Said plainly, because a trainer with instant alerts on will otherwise
      // read the repeat as a bug.
      "This covers everything from today, including anything already emailed.",
      "",
      `Open Chalkline: ${base}/dashboard`,
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(trainerName)},</p>
<p>Here&rsquo;s what your athletes did today.</p>
${
  data.workouts.length
    ? `<h3>Sessions</h3><ul>${data.workouts
        .map(
          (w) =>
            `<li><a href="${escapeHtml(`${base}/workouts/${w.id}`)}">${escapeHtml(
              w.clientName,
            )} &mdash; ${escapeHtml(w.title)}</a>${
              w.rpe != null ? ` <em>RPE ${w.rpe}</em>` : ""
            }${w.clientComment ? `<br><span style="color:#666">${escapeHtml(w.clientComment)}</span>` : ""}</li>`,
        )
        .join("")}</ul>`
    : ""
}
${
  data.logs.length
    ? `<h3>Nutrition</h3><ul>${data.logs
        .map(
          (l) =>
            `<li><a href="${escapeHtml(
              `${base}/clients/${l.clientId}/nutrition/${l.date}`,
            )}">${escapeHtml(l.clientName)} &mdash; ${escapeHtml(l.day)}</a>: ${
              l.calories
            }${l.targetCalories != null ? ` / ${l.targetCalories}` : ""} kcal, P ${
              l.protein
            } C ${l.carbs} F ${l.fat}${
              l.notes ? `<br><span style="color:#666">${escapeHtml(l.notes)}</span>` : ""
            }</li>`,
        )
        .join("")}</ul>`
    : ""
}
<p style="color:#666;font-size:0.9em">This covers everything from today, including anything already emailed.</p>
<p><a href="${escapeHtml(`${base}/dashboard`)}">Open Chalkline</a></p>`,
  };
}

// A message someone typed, copied to the other person's inbox.
//
// The most attacker-influenced email in this file by some distance: unlike a
// digest, which quotes short fields, this one exists to carry a block of text
// that a coach or an athlete wrote freehand. It goes through escapeHtml like
// everything else — via bodyHtml below, which is the only reason newlines
// survive at all.
export function messageEmail(
  origin: string,
  m: {
    recipientName: string;
    senderName: string;
    // The group's title, or null on a 1:1. Passed explicitly rather than
    // inferred from comparing a label against the sender's name — on a direct
    // thread the label *is* the recipient's name, so that comparison reads
    // every 1:1 as a group.
    groupTitle: string | null;
    body: string;
    href: string; // role-specific, built by threadHref in src/lib/messaging.ts
  },
): Mail {
  const link = `${appUrl(origin)}${m.href}`;
  const inGroup = m.groupTitle != null;
  return {
    to: "",
    subject: inGroup
      ? `${m.senderName} posted in ${m.groupTitle}`
      : `New message from ${m.senderName}`,
    text: [
      `Hi ${m.recipientName},`,
      "",
      inGroup
        ? `${m.senderName} posted in ${m.groupTitle}:`
        : `${m.senderName} sent you a message:`,
      "",
      m.body,
      "",
      `Reply in Chalkline: ${link}`,
      "",
      "You can also just reply to this email.",
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(m.recipientName)},</p>
<p>${
      inGroup
        ? `<strong>${escapeHtml(m.senderName)}</strong> posted in ${escapeHtml(m.groupTitle ?? "")}:`
        : `<strong>${escapeHtml(m.senderName)}</strong> sent you a message:`
    }</p>
${bodyHtml(m.body)}
<p><a href="${escapeHtml(link)}">Reply in Chalkline</a></p>
<p style="color:#666;font-size:0.9em">You can also just reply to this email.</p>`,
  };
}

// A scheduled message going out on the coach's chosen day and hour.
//
// Nearly the same email as the one above, and deliberately not the same
// function. The difference is that nobody is sitting at a keyboard when this
// sends: the subject can't say "new message from" about something written three
// weeks ago, and the footer has to explain why it arrived unprompted — which is
// what stops the second one being marked as spam.
export function broadcastEmail(
  origin: string,
  m: {
    recipientName: string;
    coachName: string;
    body: string;
    href: string;
  },
): Mail {
  const link = `${appUrl(origin)}${m.href}`;
  return {
    to: "",
    subject: `A note from ${m.coachName}`,
    text: [
      `Hi ${m.recipientName},`,
      "",
      m.body,
      "",
      `— ${m.coachName}`,
      "",
      `Reply in Chalkline: ${link}`,
      "",
      `${m.coachName} set this to go out on a schedule. Replying reaches them directly.`,
    ].join("\n"),
    html: `<p>Hi ${escapeHtml(m.recipientName)},</p>
${bodyHtml(m.body)}
<p>&mdash; ${escapeHtml(m.coachName)}</p>
<p><a href="${escapeHtml(link)}">Reply in Chalkline</a></p>
<p style="color:#666;font-size:0.9em">${escapeHtml(
      m.coachName,
    )} set this to go out on a schedule. Replying reaches them directly.</p>`,
  };
}

// Freehand text as HTML paragraphs. Escaping happens *first* and the tags are
// added after, which is the only order that is safe: escaping afterwards would
// destroy the markup we just added, and interleaving the two is how a "<" in
// someone's message ends up as a live tag.
//
// Blank lines separate paragraphs, single newlines become breaks — the shape
// people actually type in a message box.
function bodyHtml(body: string): string {
  return body
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p style="white-space:pre-wrap">${escapeHtml(para).replace(/\n/g, "<br>")}</p>`,
    )
    .join("\n");
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
